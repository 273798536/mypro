import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Material } from './Material';

@Entity()
export class MaterialMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  canonicalMaterialId: string;

  @Column()
  platformMaterialId: string;

  @Column()
  platform: string;

  @Column({ nullable: true })
  platformMaterialName: string;

  @Column({ type: 'text', nullable: true })
  mappingReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Material, material => material.mappings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialRecordId' })
  material: Material;

  @Column()
  materialRecordId: string;
}
