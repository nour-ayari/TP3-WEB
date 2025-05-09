// cv-history/cv-history.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvHistory } from './entities/cv-history.entity/cv-history.entity';
import { CvHistoryService } from './cv-history.service';
import { CvHistoryListener } from './cv-history.listener/cv-history.listener';

@Module({
  imports: [TypeOrmModule.forFeature([CvHistory])],
  providers: [CvHistoryService, CvHistoryListener],
})
export class CvHistoryModule {}
