import 'reflect-metadata';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  FactoryProvider,
  HttpException,
  HttpServer,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AbstractHttpAdapter, APP_FILTER } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { Request, Response } from 'express';
import { getReasonPhrase } from 'http-status-codes';

import { BaseUrl } from './models';
import { getNestApiCommonDocumentLinks } from './utils';
import {
  NestApiDocumentMetaInterface,
  NestApiErrorDocumentLinksInterface,
  NestApiErrorInterface,
} from '../api';
import { isNotNullOrUndefined, NestApiHttpException } from '../core';

type ApiResponseExceptionFilterOptions = {
  baseUrl: BaseUrl;
};

type ExceptionInfo = {
  errors: NestApiErrorInterface[];
  message: string;
  stack?: string;
  // TODO: is a recursion really necessary?
  cause?: ExceptionInfo;
};

@Catch()
export class ApiResponseExceptionFilter implements ExceptionFilter<unknown> {
  public static DEFAULT_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

  public static forRoot(
    options: ApiResponseExceptionFilterOptions,
  ): FactoryProvider {
    return {
      provide: APP_FILTER,
      useFactory: (
        httpAdapterHost: HttpAdapterHost,
      ): ApiResponseExceptionFilter => {
        const adapter: AbstractHttpAdapter = httpAdapterHost.httpAdapter;

        return new ApiResponseExceptionFilter(adapter, options);
      },
      inject: [HttpAdapterHost],
    };
  }

  private readonly logger: Logger = new Logger(ApiResponseExceptionFilter.name);

  constructor(
    private readonly server: HttpServer,
    private readonly options: ApiResponseExceptionFilterOptions,
  ) {}

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return ApiResponseExceptionFilter.DEFAULT_STATUS;
  }

  private getErrorsFromNestApiHttpException(
    exception: NestApiHttpException,
  ): NestApiErrorInterface[] {
    return exception.errors;
  }

  private getExceptionInfo(exception: unknown): ExceptionInfo {
    if (exception instanceof NestApiHttpException) {
      const { errors, message, stack, cause } = exception;

      if (isNotNullOrUndefined(cause)) {
        return { errors, message, stack, cause: this.getExceptionInfo(cause) };
      }

      return { errors, message, stack };
    }

    if (exception instanceof HttpException) {
      const { message, stack, cause } = exception;

      const status: number = exception.getStatus();
      const title: string = getReasonPhrase(status);
      const detail: string | undefined =
        message !== title ? message : undefined;

      const errors: NestApiErrorInterface[] = [{ status, title, detail }];

      if (isNotNullOrUndefined(cause)) {
        return { errors, message, stack, cause: this.getExceptionInfo(cause) };
      }

      return { errors, message, stack };
    }

    if (exception instanceof Error) {
      const { message, stack } = exception;

      const status: number = ApiResponseExceptionFilter.DEFAULT_STATUS;
      const title: string = getReasonPhrase(status);
      const detail: string | undefined =
        message.trim() !== '' ? message : undefined;

      const errors: NestApiErrorInterface[] = [{ status, title, detail }];

      return { errors, message, stack };
    }

    const status: number = ApiResponseExceptionFilter.DEFAULT_STATUS;
    const title: string = getReasonPhrase(status);
    const detail: string | undefined =
      typeof exception === 'string' ? exception : undefined;

    const errors: NestApiErrorInterface[] = [{ status, title, detail }];
    const message: string = detail ?? title;

    return { errors, message };
  }

  public catch(exception: unknown, host: ArgumentsHost): void {
    const request: Request = host.switchToHttp().getRequest<Request>();
    const response: Response = host.switchToHttp().getResponse<Response>();

    const { baseUrl } = this.options;

    const timestamp: Date = new Date();
    const status: number = this.getStatus(exception);
    const reason: string = getReasonPhrase(status);
    const meta: NestApiDocumentMetaInterface = { timestamp, status, reason };

    const links: NestApiErrorDocumentLinksInterface =
      getNestApiCommonDocumentLinks(baseUrl, request);

    const { errors, message, stack, cause } = this.getExceptionInfo(exception);

    if (status < 500) {
      this.logger.warn({ message, errors, cause });

      const body = { meta, errors, links };
      this.server.reply(response, body, status);
    } else {
      this.logger.error({ message, errors, cause }, stack);

      const body = { meta, errors: [{ status, title: reason }], links };
      this.server.reply(response, body, status);
    }
  }
}
