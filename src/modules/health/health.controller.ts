import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
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
import { map } from 'rxjs/operators';

import { Health } from './schemas/health.schema';
import {
  NestApiResourceResponse,
  NestApiServiceUnavailableResponse,
} from '../../api';
import { NestApiServiceUnavailableException, uuid } from '../../core';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @NestApiResourceResponse(Health)
  @NestApiServiceUnavailableResponse()
  @HealthCheck()
  public check(): Observable<Health> {
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
      map((result) => {
        const now: Date = new Date();

        return {
          id: uuid(),
          ...result,
          createdAt: now,
          createdBy: '',
          updatedAt: now,
          updatedBy: '',
        };
      }),
      catchError((error) => {
        if (!(error instanceof HttpException)) {
          throw error;
        }

        const response = error.getResponse();

        if (typeof response === 'string') {
          throw error;
        }

        if (!('error' in response)) {
          throw error;
        }

        const result = (response as HealthCheckResult).error ?? {};
        const errors = Object.entries(result).map(([name, obj]) => {
          const status = HttpStatus.SERVICE_UNAVAILABLE;
          const title = `Service [${name}] unavailable`;

          if ('message' in obj && typeof obj['message'] === 'string') {
            const detail = obj['message'];

            return { status, title, detail };
          }

          return { status, title };
        });

        throw new NestApiServiceUnavailableException(errors);
      }),
    );
  }
}
