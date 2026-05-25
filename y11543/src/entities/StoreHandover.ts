import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class StoreHandover {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  batchId: string;

  @Column({ type: 'text' })
  materialId: string;

  @Column({ type: 'text' })
  storeId: string;

  @Column({ type: 'text' })
  storeName: string;

  @Column({ type: 'date' })
  handoverDate: string;

  @Column({ type: 'text', nullable: true })
  receiver: string | null;

  @Column({ type: 'text', nullable: true })
  handoverContent: string | null;

  @Column({ type: 'boolean', default: false })
  isConfirmed: boolean;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
