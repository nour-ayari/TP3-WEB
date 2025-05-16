import { Controller, Get, Req, Res, Sse, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { MessageEvent } from '@nestjs/common';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('events')
  sse(@Req() req: Request): Observable<MessageEvent> {
    const user = req['user'];
    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }
    
    // Admin gets all events (userId undefined)
    const userId = user.role === 'admin' ? undefined : user.id;
    return this.sseService.sendEvents(userId);
  }
}