import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class CostDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  materialId: string;

  @Column({ type: 'date' })
  reportDate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'integer', default: 0 })
  impressions: number;

  @Column({ type: 'integer', default: 0 })
  clicks: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  conversionValue: number;

  @Column({ type: 'text', nullable: true })
  platform: string | null;

  @Column({ type: 'boolean', default: false })
  isReconciled: boolean;

  @Column({ type: 'text', nullable: true })
  reconciliationNote: string | null;

  @Column({ type: 'text' })
  materialRecordId: string;

  @CreateDateColumn()
  createdAt: Date;
}
