import {
  HealthCheckResult,
  HealthCheckStatus,
  HealthIndicatorResult,
} from '@nestjs/terminus';

import {
  NestApiAttributeProperty,
  NestApiEntity,
  NestApiIdProperty,
} from '../../../api';
import { uuid } from '../../../core';

@NestApiEntity('health')
export class Health implements HealthCheckResult {
  @NestApiIdProperty()
  public readonly id: string = uuid();

  @NestApiAttributeProperty()
  public readonly status: HealthCheckStatus;

  @NestApiAttributeProperty()
  public readonly info: HealthIndicatorResult;

  @NestApiAttributeProperty()
  public readonly error: HealthIndicatorResult;

  @NestApiAttributeProperty()
  public readonly details: HealthIndicatorResult;
}
