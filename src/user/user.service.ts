// src/user/user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(username: string): Promise<User> {
    const user = this.userRepo.create({ username });
    return this.userRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ relations: ['cvs'] });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['cvs'] });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  async remove(id: number): Promise<void> {
    const result = await this.userRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`User not found`);
  }
}
