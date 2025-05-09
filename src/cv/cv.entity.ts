import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Cv {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  skills: string;

  @ManyToOne(() => User, (user) => user.cvs, { eager: true })
user: User;

}
