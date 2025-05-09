import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cv } from './cv.entity';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CvEventType } from '../events/event-types.enum';
import { CvEvent } from '../events/cv-events';
import { User } from 'src/user/user.entity';

@Injectable()
export class CvService {

  constructor(
    @InjectRepository(Cv) private cvRepo: Repository<Cv>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private eventEmitter: EventEmitter2,
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
    console.log(cv);
    
    const saved = await this.cvRepo.save(cv);
    console.log(saved);
    const savedCv = Array.isArray(saved) ? saved[0] : saved;
    console.log(savedCv);

    this.eventEmitter.emit(
      CvEventType.CREATED,
      new CvEvent(savedCv.id, 'create', user.username),
    );

    return savedCv;
  }

  // Update CV method
  async update(id: number, cvData, userPayload: { id: number; username: string }) {
    const user = await this.validateUser(userPayload);
    await this.cvRepo.update(id, cvData);
    this.eventEmitter.emit(CvEventType.UPDATED, new CvEvent(id, 'update', user.username));
    return this.cvRepo.findOneBy({ id });
  }

  // Remove CV method
  async remove(id: number, userPayload: { id: number; username: string }) {
    const user = await this.validateUser(userPayload);
    await this.cvRepo.delete(id);
    this.eventEmitter.emit(CvEventType.DELETED, new CvEvent(id, 'delete', user.username));
    return { deleted: true };
  }
}
