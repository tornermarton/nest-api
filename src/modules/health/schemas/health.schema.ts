import {
  HealthCheckResult,
  HealthCheckStatus,
  HealthIndicatorResult,
} from '@nestjs/terminus';

import {
  NestApiAttributeField,
  NestApiEntity,
  NestApiIdField,
  NestApiMetaField,
} from '../../../api';
import { Entity } from '../../../core';

@NestApiEntity('health')
export class Health implements Entity, HealthCheckResult {
  @NestApiIdField()
  public readonly id: string;

  @NestApiAttributeField()
  public readonly status: HealthCheckStatus;

  @NestApiAttributeField()
  public readonly info?: HealthIndicatorResult;

  @NestApiAttributeField()
  public readonly error?: HealthIndicatorResult;

  @NestApiAttributeField()
  public readonly details: HealthIndicatorResult;

  @NestApiMetaField()
  public readonly createdAt: Date;

  @NestApiMetaField()
  public readonly createdBy: string;

  @NestApiMetaField()
  public readonly updatedAt: Date;

  @NestApiMetaField()
  public readonly updatedBy: string;
}
