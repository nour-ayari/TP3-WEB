// cv-history/cv-history.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CvHistoryService } from '../cv-history.service';
import { CvEvent } from '../../events/cv-events';
import { CvEventType } from '../../events/event-types.enum';

@Injectable()
export class CvHistoryListener {
  constructor(private historyService: CvHistoryService) {}

  @OnEvent(CvEventType.CREATED)
  @OnEvent(CvEventType.UPDATED)
  @OnEvent(CvEventType.DELETED)
  handleCvEvents(payload: CvEvent) {
     console.log('Event emitted:', payload);
    this.historyService.saveHistory(payload);
  }
}
