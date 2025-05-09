// src/user/user.controller.ts
import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body('username') username: string) {
    return this.userService.create(username);
  }

  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.userService.findOne(+id);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.userService.remove(+id);
  }
}
