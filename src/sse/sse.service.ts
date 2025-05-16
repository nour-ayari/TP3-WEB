import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { Cv } from '../cv/cv.entity';

@Injectable()
export class SseService {
  private events = new Subject<{ data: any; userId?: number }>();

  addEvent(event: { data: any; userId?: number }) {
    this.events.next(event);
  }

  sendEvents(userId?: number): Observable<MessageEvent> {
    return new Observable((observer) => {
      const subscription = this.events.subscribe({
        next: (event) => {
          // Send to admin (userId undefined) or specific user
          if (!event.userId || !userId || event.userId === userId) {
            observer.next(
              new MessageEvent('message', {
                data: JSON.stringify(event.data),
              }),
            );
          }
        },
      });

      return () => subscription.unsubscribe();
    });
  }
}