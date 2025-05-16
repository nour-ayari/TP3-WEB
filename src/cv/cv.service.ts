import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cv } from './cv.entity';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CvEventType } from '../events/event-types.enum';
import { CvEvent } from '../events/cv-events';
import { User } from 'src/user/user.entity';
import { SseService } from '../sse/sse.service';

@Injectable()
export class CvService {
  constructor(
    @InjectRepository(Cv) private cvRepo: Repository<Cv>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private eventEmitter: EventEmitter2,
    private readonly sseService: SseService,
  ) {}

  // Helper method to check if the user exists in the database
  private async validateUser(userPayload: { id: number; username: string }) {
    const user = await this.userRepo.findOne({ where: { id: userPayload.id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  // Create CV method
  async create(cvData: any, userPayload: { id: number; username: string }) {
    const user = await this.validateUser(userPayload);

    const cv = this.cvRepo.create({ ...cvData, user: { id: user.id } });
    const saved = await this.cvRepo.save(cv);
    const savedCv = Array.isArray(saved) ? saved[0] : saved;

    // Emit both traditional event and SSE
    this.eventEmitter.emit(
      CvEventType.CREATED,
      new CvEvent(savedCv.id, 'create', user.username),
    );

    // SSE Notification
    this.sseService.addEvent({
      data: { 
        type: 'CV_CREATED',
        cvId: savedCv.id,
        operation: 'create',
        username: user.username,
        cv: savedCv 
      },
      userId: user.id, // Only the creator and admin will receive this
    });

    return savedCv;
  }

  // Update CV method
  async update(id: number, cvData, userPayload: { id: number; username: string }) {
    const user = await this.validateUser(userPayload);
    const cv = await this.cvRepo.findOne({ 
      where: { id },
      relations: ['user'] 
    });

    if (!cv) {
      throw new UnauthorizedException('CV not found');
    }

    await this.cvRepo.update(id, cvData);
    const updatedCv = await this.cvRepo.findOne({ 
      where: { id },
      relations: ['user'] 
    });

    // Emit both traditional event and SSE
    this.eventEmitter.emit(
      CvEventType.UPDATED,
      new CvEvent(id, 'update', user.username)
    );

    // SSE Notification
    this.sseService.addEvent({
      data: { 
        type: 'CV_UPDATED',
        cvId: id,
        operation: 'update',
        username: user.username,
        cv: updatedCv
      },
      userId: cv.user.id, // Only the owner and admin will receive this
    });

    return updatedCv;
  }

  // Remove CV method
  async remove(id: number, userPayload: { id: number; username: string }) {
    const user = await this.validateUser(userPayload);
    const cv = await this.cvRepo.findOne({ 
      where: { id },
      relations: ['user'] 
    });

    if (!cv) {
      throw new UnauthorizedException('CV not found');
    }

    await this.cvRepo.delete(id);

    // Emit both traditional event and SSE
    this.eventEmitter.emit(
      CvEventType.DELETED,
      new CvEvent(id, 'delete', user.username)
    );

    // SSE Notification
    this.sseService.addEvent({
      data: { 
        type: 'CV_DELETED',
        cvId: id,
        operation: 'delete',
        username: user.username
      },
      userId: cv.user.id, // Only the owner and admin will receive this
    });

    return { deleted: true };
  }
}