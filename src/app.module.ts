import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CvModule } from './cv/cv.module';
import { UserModule } from './user/user.module';
import { CvHistoryModule } from './cv-history/cv-history.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cv } from './cv/cv.entity';
import { User } from './user/user.entity';
import { UserMiddleware } from 'common/middleware/user.middleware';
import { CvHistory } from './cv-history/entities/cv-history.entity/cv-history.entity';
import { MessagingModule } from './Messaging/messaging.module';
import { SseModule } from './sse/sse.module';

@Module({
  imports: [TypeOrmModule.forRoot({
    type: 'mysql',
    database: 'tp3web',
    entities: [Cv, User, CvHistory],
    synchronize: true,
    username: 'root',
    password: 'root',
  }),
  EventEmitterModule.forRoot(),
    CvModule,
    UserModule,
    CvHistoryModule,
    MessagingModule,
    SseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserMiddleware).forRoutes('*');
  }
}

