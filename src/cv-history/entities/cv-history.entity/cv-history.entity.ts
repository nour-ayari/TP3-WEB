import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class CvHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cvId: number;

  @Column()
  operation: string; // 'create', 'update', 'delete'

  @Column()
  performedBy: string; // username

  @CreateDateColumn()
  timestamp: Date;
}
