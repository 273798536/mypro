import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class CustomerRemark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  materialId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  operator: string | null;

  @Column({ type: 'text', nullable: true })
  source: string | null;

  @Column({ type: 'text' })
  materialRecordId: string;

  @CreateDateColumn()
  createdAt: Date;
}
