import { Controller, Post, Body, Put, Param, Delete, Req, UnauthorizedException } from '@nestjs/common';
import { CvService } from './cv.service';
import { Request } from 'express';

@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

@Post()
async create(@Body() dto, @Req() req) {
  if (!req.user || !req.user.id || !req.user.username) {
    throw new UnauthorizedException('User not authenticated');
  }
console.log("controllerrrr",req.user)
  return await this.cvService.create(dto, req.user);
}


  @Put(':id')
  update(@Param('id') id: number, @Body() dto, @Req() req: Request) {
    return this.cvService.update(id, dto, req['user']);
  }

  @Delete(':id')
  remove(@Param('id') id: number, @Req() req: Request) {
    return this.cvService.remove(id, req['user']);
  }
}
