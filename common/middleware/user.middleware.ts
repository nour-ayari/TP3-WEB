import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class UserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const userId = parseInt(req.headers['auth-user'] as string);
    const username = req.headers['auth-username'] as string; 
   if (!isNaN(userId) && username) {
      req['user'] = {
        id: userId,
        username,
      };
    }
        console.log('User in middleware:', req['user']);  // Add this log

    next();
  }
}