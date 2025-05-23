import { Module } from '@nestjs/common';
import { CvService } from './cv.service';
import { CvController } from './cv.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cv } from './cv.entity';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserModule } from 'src/user/user.module';
import { SseService } from '../sse/sse.service';

@Module({
  imports:[TypeOrmModule.forFeature([Cv]),UserModule,EventEmitterModule.forRoot()],
  providers: [CvService, SseService],
  controllers: [CvController]
})
export class CvModule {}
