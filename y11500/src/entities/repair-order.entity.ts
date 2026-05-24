import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Batch } from './batch.entity';

@Entity('repair_orders')
export class RepairOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderNo: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  productModel: string;

  @Column({ type: 'text', nullable: true })
  faultDescription: string;

  @Column({ type: 'datetime', nullable: true })
  repairDate: Date;

  @Column({ nullable: true })
  engineerName: string;

  @Column({ type: 'text', nullable: true })
  rawContent: string;

  @Column({ default: false })
  isDirty: boolean;

  @ManyToOne(() => Batch, batch => batch.repairOrders, { onDelete: 'CASCADE' })
  @JoinColumn()
  batch: Batch;

  @Column({ nullable: true })
  batchId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
