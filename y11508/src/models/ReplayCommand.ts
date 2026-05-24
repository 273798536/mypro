import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ReplaySessionEntity } from './ReplaySession';

@Entity('replay_commands')
export class ReplayCommandEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => ReplaySessionEntity, session => session.commands)
  @JoinColumn({ name: 'sessionId' })
  session: ReplaySessionEntity;

  @Column()
  order: number;

  @Column({
    type: 'text'
  })
  type: 'http' | 'db' | 'script';

  @Column('text')
  content: string;

  @Column({ type: 'text', nullable: true })
  result?: string;

  @Column({ nullable: true })
  executedAt?: Date;

  @Column({ type: 'integer', nullable: true })
  duration?: number;
}