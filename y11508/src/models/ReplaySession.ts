import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ReplayCommandEntity } from './ReplayCommand';

@Entity('replay_sessions')
export class ReplaySessionEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @CreateDateColumn()
  startTime: Date;

  @Column({ nullable: true })
  endTime?: Date;

  @Column({
    type: 'text',
    default: 'running'
  })
  status: 'running' | 'completed' | 'failed';

  @OneToMany(() => ReplayCommandEntity, cmd => cmd.session)
  commands: ReplayCommandEntity[];

  @Column()
  createdBy: string;
}