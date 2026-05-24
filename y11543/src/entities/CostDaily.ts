import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Material } from './Material';

@Entity()
export class CostDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
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

  @Column({ nullable: true })
  platform: string;

  @Column({ type: 'boolean', default: false })
  isReconciled: boolean;

  @Column({ type: 'text', nullable: true })
  reconciliationNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Material, material => material.costDailies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialRecordId' })
  material: Material;

  @Column()
  materialRecordId: string;
}
