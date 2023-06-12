import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiExtraModels, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthCheckStatus,
  HealthIndicatorResult,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { catchError, from, Observable } from 'rxjs';

import { isNotNullOrUndefined } from '../../core';
import { ResponseError } from '../../response';
import {
  NestApiEntityResponse,
  NestApiServiceUnavailableResponse,
} from '../../swagger';

class Health implements HealthCheckResult {
  @ApiProperty()
  public status: HealthCheckStatus;

  @ApiProperty()
  public info: HealthIndicatorResult;

  @ApiProperty()
  public error: HealthIndicatorResult;

  @ApiProperty()
  public details: HealthIndicatorResult;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @ApiExtraModels(Health)
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

        const errors: ResponseError[] = Object.entries(
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
