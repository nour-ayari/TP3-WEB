// cv/cv.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cv } from './cv.entity';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CvEventType } from '../events/event-types.enum';
import { CvEvent } from '../events/cv-events';

@Injectable()
export class CvService {
  constructor(
    @InjectRepository(Cv) private cvRepo: Repository<Cv>,
    private eventEmitter: EventEmitter2,
  ) {}
async create(cvData: any, user: { id: number; username: string }) {
  if (!user || !user.id) {
    throw new Error('User is undefined or does not have an id');
  }

const cv = this.cvRepo.create({ ...cvData, user: { id: user.id } });

  const savedCv = await this.cvRepo.save(cv);

  this.eventEmitter.emit(CvEventType.CREATED, new CvEvent(savedCv[0].id, 'create', user.username));

  return savedCv;
}


  async update(id: number, cvData, user) {
    await this.cvRepo.update(id, cvData);
    this.eventEmitter.emit(CvEventType.UPDATED, new CvEvent(id, 'update', user.username));
    return this.cvRepo.findOneBy({ id });
  }

  async remove(id: number, user) {
    await this.cvRepo.delete(id);
    this.eventEmitter.emit(CvEventType.DELETED, new CvEvent(id, 'delete', user.username));
    return { deleted: true };
  }
}
