import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PARTIAL = 'partial',
}

@Entity('api_request_logs')
export class ApiRequestLog extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  requestId: string;

  @Index()
  @Column({ type: 'simple-enum', enum: RequestMethod })
  method: RequestMethod;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 200 })
  endpoint: string;

  @Index()
  @Column({ type: 'simple-enum', enum: ResponseStatus })
  status: ResponseStatus;

  @Column({ type: 'int' })
  httpStatusCode: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  operator: string;

  @Column({ type: 'datetime' })
  requestTime: Date;

  @Column({ type: 'datetime' })
  responseTime: Date;

  @Column({ type: 'int' })
  durationMs: number;

  @Column({ type: 'simple-json', nullable: true })
  requestHeaders: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  requestBody: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  responseBody: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  errorStack: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  batchNo: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  traceNo: string;
}