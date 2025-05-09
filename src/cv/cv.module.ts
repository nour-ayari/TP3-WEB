import { Module } from '@nestjs/common';
import { CvService } from './cv.service';
import { CvController } from './cv.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cv } from './cv.entity';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports:[TypeOrmModule.forFeature([Cv]),EventEmitterModule.forRoot()],
  providers: [CvService],
  controllers: [CvController]
})
export class CvModule {}
