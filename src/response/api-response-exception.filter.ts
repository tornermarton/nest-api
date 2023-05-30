import 'reflect-metadata';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import { getReasonPhrase } from 'http-status-codes';

import { ErrorApiResponse, ResponseError, ResponseMeta } from './models';
import { getCommonResponseLinks } from './utils';

@Catch()
export class ApiResponseExceptionFilter<T> implements ExceptionFilter<T> {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: Logger,
  ) {}

  private getStatus(exception: T): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getReason(status: number): string {
    return getReasonPhrase(status);
  }

  private getErrors(
    exception: T,
    status: number,
    title: string,
  ): ResponseError[] {
    if (!(exception instanceof HttpException)) {
      return [
        {
          status: status,
          title: title,
        },
      ];
    }

    const response: object | string = exception.getResponse();

    if (typeof response !== 'object') {
      return [
        {
          status: status,
          title: title,
        },
      ];
    }

    if ('errors' in response) {
      // The validation errors are already in the correct format
      return response['errors'];
    }

    let detail: string | null = null;

    if (status < 500 && 'message' in response) {
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

  public catch(exception: T, host: ArgumentsHost): void {
    this.log(exception);

    const request: Request = host.switchToHttp().getRequest<Request>();
    const response: Response = host.switchToHttp().getResponse<Response>();

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

    this.httpAdapterHost.httpAdapter.reply(response, body, status);
  }
}
