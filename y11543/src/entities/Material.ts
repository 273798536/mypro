import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Batch } from './Batch';

export type MaterialStatus = 'pending' | 'auditing' | 'approved' | 'rejected' | 'manual_override' | 'failed';

@Entity()
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  materialId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  platform: string | null;

  @Column({ type: 'text', default: 'pending' })
  status: MaterialStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'boolean', default: false })
  isDuplicate: boolean;

  @Column({ type: 'text', nullable: true })
  originalMaterialId: string | null;

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Batch, batch => batch.materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch: Batch;

  @Column({ type: 'text' })
  batchId: string;
}
