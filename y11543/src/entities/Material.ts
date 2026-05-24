import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Batch } from './Batch';
import { AuditResult } from './AuditResult';
import { CostDaily } from './CostDaily';
import { MaterialMapping } from './MaterialMapping';
import { CustomerRemark } from './CustomerRemark';

export type MaterialStatus = 'pending' | 'auditing' | 'approved' | 'rejected' | 'manual_override' | 'failed';

@Entity()
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  materialId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  platform: string;

  @Column({ type: 'text', default: 'pending' })
  status: MaterialStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'boolean', default: false })
  isDuplicate: boolean;

  @Column({ nullable: true })
  originalMaterialId: string;

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Batch, batch => batch.materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch: Batch;

  @Column()
  batchId: string;

  @OneToMany(() => AuditResult, audit => audit.material)
  auditResults: AuditResult[];

  @OneToMany(() => CostDaily, cost => cost.material)
  costDailies: CostDaily[];

  @OneToMany(() => MaterialMapping, mapping => mapping.material)
  mappings: MaterialMapping[];

  @OneToMany(() => CustomerRemark, remark => remark.material)
  remarks: CustomerRemark[];
}
