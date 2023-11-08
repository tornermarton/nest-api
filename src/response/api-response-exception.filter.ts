import 'reflect-metadata';

import {
  ArgumentsHost,
  Catch,
  FactoryProvider,
  HttpException,
  HttpServer,
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

import { EndpointDefinition, EndpointMatcher } from './endpoint-matcher';
import { BaseUrl } from './models';
import { getNestApiCommonDocumentLinks } from './utils';
import {
  NestApiDocumentMetaInterface,
  NestApiErrorDocumentInterface,
  NestApiErrorDocumentLinksInterface,
  NestApiErrorInterface,
  NestApiGenericErrorInterface,
} from '../api';

type RequestMatcherOptions = {
  exclude?: EndpointDefinition[];
};

type ApiResponseExceptionFilterOptions = {
  baseUrl: BaseUrl;
};

@Catch()
export class ApiResponseExceptionFilter<
  T = unknown,
> extends BaseExceptionFilter<T> {
  public static forRoot<T = unknown>(
    options: ApiResponseExceptionFilterOptions & RequestMatcherOptions,
  ): FactoryProvider {
    return {
      provide: APP_FILTER,
      useFactory: (
        httpAdapterHost: HttpAdapterHost,
      ): ApiResponseExceptionFilter<T> => {
        const adapter: AbstractHttpAdapter = httpAdapterHost.httpAdapter;
        const exclude: EndpointDefinition[] = options.exclude ?? [];

        const matcher: EndpointMatcher = new EndpointMatcher(adapter, exclude);

        return new ApiResponseExceptionFilter(adapter, matcher, options);
      },
      inject: [HttpAdapterHost],
    };
  }

  private readonly logger: Logger = new Logger(ApiResponseExceptionFilter.name);

  constructor(
    private readonly server: HttpServer,
    private readonly matcher: EndpointMatcher,
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

    this.server.reply(response, body, status);
  }
}
