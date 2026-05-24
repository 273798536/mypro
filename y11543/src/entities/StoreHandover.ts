import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class StoreHandover {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  batchId: string;

  @Column()
  materialId: string;

  @Column()
  storeId: string;

  @Column()
  storeName: string;

  @Column({ type: 'date' })
  handoverDate: string;

  @Column({ nullable: true })
  receiver: string;

  @Column({ type: 'text', nullable: true })
  handoverContent: string;

  @Column({ type: 'boolean', default: false })
  isConfirmed: boolean;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
