import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Material } from './Material';

@Entity()
export class CustomerRemark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  materialId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  operator: string;

  @Column({ nullable: true })
  source: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Material, material => material.remarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialRecordId' })
  material: Material;

  @Column()
  materialRecordId: string;
}
