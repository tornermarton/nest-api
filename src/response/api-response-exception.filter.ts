import 'reflect-metadata';

import {
  ArgumentsHost,
  Catch,
  FactoryProvider,
  HttpException,
  HttpStatus,
  Logger,
  RequestMethod,
} from '@nestjs/common';
import {
  AbstractHttpAdapter,
  APP_FILTER,
  BaseExceptionFilter,
} from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { Request, Response } from 'express';
import { getReasonPhrase } from 'http-status-codes';

import { ErrorApiResponse, ResponseError, ResponseMeta } from './models';
import { getCommonResponseLinks } from './utils';
import { isNotNullOrUndefined } from '../core';

type ApiResponseExceptionFilterOptions = {
  exclude: { path: string; method: RequestMethod }[];
};

@Catch()
export class ApiResponseExceptionFilter<
  T = unknown,
> extends BaseExceptionFilter<T> {
  public static forRoot<T = unknown>(
    options?: ApiResponseExceptionFilterOptions,
  ): FactoryProvider {
    return {
      provide: APP_FILTER,
      useFactory: (
        httpAdapterHost: HttpAdapterHost,
        logger: Logger,
      ): ApiResponseExceptionFilter<T> => {
        return new ApiResponseExceptionFilter(httpAdapterHost, logger, options);
      },
      inject: [HttpAdapterHost, Logger],
    };
  }

  constructor(
    protected override readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: Logger,
    private readonly options?: ApiResponseExceptionFilterOptions,
  ) {
    super();
  }

  private getStatus(exception: T): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getReason(status: number): string {
    return getReasonPhrase(status);
  }

  private createGenericErrors(status: number, title: string): ResponseError[] {
    return [
      {
        status: status,
        title: title,
      },
    ];
  }

  private getErrors(
    exception: T,
    status: number,
    title: string,
  ): ResponseError[] {
    if (!(exception instanceof HttpException)) {
      return this.createGenericErrors(status, title);
    }

    const response: object | string = exception.getResponse();

    if (typeof response !== 'object') {
      return this.createGenericErrors(status, title);
    }

    if ('errors' in response) {
      // The validation errors are already in the correct format
      return response['errors'] as ResponseError[];
    }

    let detail: string | null = null;

    if (
      status < 500 &&
      'message' in response &&
      typeof response['message'] === 'string'
    ) {
      detail = response['message'];
    }

    return [
      {
        status: status,
        title: title,
        detail: detail,
      },
    ];
  }

  private log(exception: T): void {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error(exception);
    }
  }

  public override catch(exception: T, host: ArgumentsHost): void {
    const adapter: AbstractHttpAdapter = this.httpAdapterHost.httpAdapter;
    const request: Request = host.switchToHttp().getRequest<Request>();
    const response: Response = host.switchToHttp().getResponse<Response>();

    const url: string = adapter.getRequestUrl(request) as string;
    const method: RequestMethod = adapter.getRequestMethod(
      request,
    ) as RequestMethod;

    if (isNotNullOrUndefined(this.options)) {
      for (const e of this.options.exclude) {
        if (
          e.path === url &&
          (e.method === method || e.method === RequestMethod.ALL)
        ) {
          return super.catch(exception, host);
        }
      }
    }

    this.log(exception);

    const status: number = this.getStatus(exception);
    const reason: string = this.getReason(status);
    const meta: ResponseMeta = {
      status: status,
      reason: reason,
    };

    const errors: ResponseError[] = this.getErrors(exception, status, reason);

    const body: ErrorApiResponse = {
      meta: meta,
      errors: errors,
      links: getCommonResponseLinks(request),
    };

    adapter.reply(response, body, status);
  }
}
