import 'reflect-metadata';

import {
  ArgumentsHost,
  Catch,
  FactoryProvider,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  AbstractHttpAdapter,
  APP_FILTER,
  BaseExceptionFilter,
} from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { Request, Response } from 'express';
import { getReasonPhrase } from 'http-status-codes';

import { BaseUrl } from './models';
import { RequestDefinition, RequestMatcher } from './request-matcher';
import { getNestApiCommonDocumentLinks } from './utils';
import {
  NestApiDocumentMetaInterface,
  NestApiErrorDocumentInterface,
  NestApiErrorDocumentLinksInterface,
  NestApiErrorInterface,
  NestApiGenericErrorInterface,
} from '../api';

type ApiResponseExceptionFilterOptions = {
  baseUrl: BaseUrl;
  exclude?: RequestDefinition[];
};

@Catch()
export class ApiResponseExceptionFilter<
  T = unknown,
> extends BaseExceptionFilter<T> {
  public static forRoot<T = unknown>(
    options: ApiResponseExceptionFilterOptions,
  ): FactoryProvider {
    return {
      provide: APP_FILTER,
      useFactory: (
        httpAdapterHost: HttpAdapterHost,
        logger: Logger,
      ): ApiResponseExceptionFilter<T> => {
        const adapter: AbstractHttpAdapter = httpAdapterHost.httpAdapter;
        const exclude: RequestDefinition[] = options.exclude ?? [];

        const matcher: RequestMatcher = new RequestMatcher(adapter, exclude);

        return new ApiResponseExceptionFilter(
          adapter,
          matcher,
          logger,
          options,
        );
      },
      inject: [HttpAdapterHost, Logger],
    };
  }

  constructor(
    private readonly adapter: AbstractHttpAdapter,
    private readonly matcher: RequestMatcher,
    private readonly logger: Logger,
    private readonly options: ApiResponseExceptionFilterOptions,
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

  private createGenericErrors(
    status: number,
    title: string,
  ): NestApiGenericErrorInterface[] {
    return [{ status, title }];
  }

  private getErrors(
    exception: T,
    status: number,
    title: string,
  ): NestApiErrorInterface[] {
    if (!(exception instanceof HttpException)) {
      return this.createGenericErrors(status, title);
    }

    const response: object | string = exception.getResponse();

    if (typeof response !== 'object') {
      return this.createGenericErrors(status, title);
    }

    if ('errors' in response) {
      // The validation errors are already in the correct format
      return response['errors'] as NestApiErrorInterface[];
    }

    let detail: string | undefined = undefined;

    if (
      status < 500 &&
      'message' in response &&
      typeof response['message'] === 'string'
    ) {
      detail = response['message'];
    }

    return [{ status, title, detail }];
  }

  private log(exception: T): void {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error(exception);
    }
  }

  public override catch(exception: T, host: ArgumentsHost): void {
    const { baseUrl } = this.options;

    const request: Request = host.switchToHttp().getRequest<Request>();
    const response: Response = host.switchToHttp().getResponse<Response>();

    if (this.matcher.match(request)) {
      return super.catch(exception, host);
    }

    this.log(exception);

    const status: number = this.getStatus(exception);
    const timestamp: Date = new Date();
    const reason: string = this.getReason(status);
    const meta: NestApiDocumentMetaInterface = { status, timestamp, reason };

    const errors: NestApiErrorInterface[] = this.getErrors(
      exception,
      status,
      reason,
    );

    const links: NestApiErrorDocumentLinksInterface =
      getNestApiCommonDocumentLinks(baseUrl, request);

    const body: NestApiErrorDocumentInterface = { meta, errors, links };

    this.adapter.reply(response, body, status);
  }
}
