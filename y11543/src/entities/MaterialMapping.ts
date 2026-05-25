import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class MaterialMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  canonicalMaterialId: string;

  @Column({ type: 'text' })
  platformMaterialId: string;

  @Column({ type: 'text' })
  platform: string;

  @Column({ type: 'text', nullable: true })
  platformMaterialName: string | null;

  @Column({ type: 'text', nullable: true })
  mappingReason: string | null;

  @Column({ type: 'text' })
  materialRecordId: string;

  @CreateDateColumn()
  createdAt: Date;
}
