import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { catchError, from, Observable } from 'rxjs';

import { Health } from './schemas/health.schema';
import {
  NestApiEntityResponse,
  NestApiErrorInterface,
  NestApiServiceUnavailableResponse,
} from '../../api';
import { isNotNullOrUndefined } from '../../core';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @NestApiEntityResponse(Health)
  @NestApiServiceUnavailableResponse()
  @HealthCheck()
  public check(): Observable<HealthCheckResult> {
    return from(
      this.health.check([
        (): Promise<HealthIndicatorResult> =>
          this.disk.checkStorage('storage', {
            path: '/',
            thresholdPercent: 0.9,
          }),
        (): Promise<HealthIndicatorResult> =>
          this.mongoose.pingCheck('mongodb'),
      ]),
    ).pipe(
      catchError((error) => {
        if (!(error instanceof HttpException)) {
          throw error;
        }

        const response: string | object = error.getResponse();

        if (typeof response !== 'object' || !('error' in response)) {
          throw error;
        }

        const errors: NestApiErrorInterface[] = Object.entries(
          (response as HealthCheckResult).error,
        ).map(([name, obj]) => {
          let detail: string | null = null;

          if (
            isNotNullOrUndefined(obj['message']) &&
            typeof obj['message'] === 'string'
          ) {
            detail = obj['message'];
          }

          return {
            status: HttpStatus.SERVICE_UNAVAILABLE,
            title: `Service [${name}] unavailable`,
            detail: detail,
          };
        });

        throw new ServiceUnavailableException({ errors });
      }),
    );
  }
}
