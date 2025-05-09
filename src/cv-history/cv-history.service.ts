// cv-history/cv-history.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CvHistory } from './entities/cv-history.entity/cv-history.entity';
import { Repository } from 'typeorm';
import { CvEvent } from '../events/cv-events';

@Injectable()
export class CvHistoryService {
  constructor(
    @InjectRepository(CvHistory) private historyRepo: Repository<CvHistory>,
  ) {}

  async saveHistory(event: CvEvent) {
    const history = this.historyRepo.create({
      cvId: event.cvId,
      operation: event.operation,
      performedBy: event.performedBy,
    });
    await this.historyRepo.save(history);
  }
}
