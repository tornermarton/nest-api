import {
  HealthCheckResult,
  HealthCheckStatus,
  HealthIndicatorResult,
} from '@nestjs/terminus';

import {
  NestApiAttributeField,
  NestApiEntity,
  NestApiIdField,
} from '../../../api';
import { uuid } from '../../../core';

@NestApiEntity('health')
export class Health implements HealthCheckResult {
  @NestApiIdField()
  public readonly id: string = uuid();

  @NestApiAttributeField()
  public readonly status: HealthCheckStatus;

  @NestApiAttributeField()
  public readonly info: HealthIndicatorResult;

  @NestApiAttributeField()
  public readonly error: HealthIndicatorResult;

  @NestApiAttributeField()
  public readonly details: HealthIndicatorResult;
}
