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
import { map } from 'rxjs/operators';

import { Health } from './schemas/health.schema';
import {
  NestApiResourceResponse,
  NestApiErrorInterface,
  NestApiServiceUnavailableResponse,
} from '../../api';
import { isNotNullOrUndefined, uuid } from '../../core';

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

        const response: string | object = error.getResponse();

        if (typeof response !== 'object' || !('error' in response)) {
          throw error;
        }

        const errors: NestApiErrorInterface[] = Object.entries(
          (response as HealthCheckResult).error ?? {},
        ).map(([name, obj]) => {
          let detail: string | undefined = undefined;

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
