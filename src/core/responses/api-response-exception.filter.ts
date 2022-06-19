import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  ConsoleLogger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { HttpAdapterHost } from '@nestjs/core';
import { getReasonPhrase } from 'http-status-codes';
import { getSelfLink, ResponseError } from './api-response';

@Catch()
export class ApiResponseExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly consoleLogger: ConsoleLogger,
  ) {}

  private getStatusFromException(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getResponseErrorsFromException(exception: unknown): ResponseError[] {
    const status = this.getStatusFromException(exception);
    const title: string = getReasonPhrase(status);
    let detail: string | null = status <= 500 ? exception.toString() : null;
    let code: string | null = null;

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'object') {
        if ('errors' in response) {
          return response['errors'];
        }

        if ('message' in response) {
          detail = response['message'];
        }

        if ('statusCode' in response) {
          code = response['statusCode'];
        }
      }
    }

    return [
      {
        status: status,
        title: title,
        detail: detail,
        code: code,
      } as ResponseError,
    ];
  }

  private logError(exception: unknown): void {
    if (exception instanceof Error) {
      this.consoleLogger.error(exception, exception.stack);
    } else {
      this.consoleLogger.error(exception);
    }
  }

  public catch(exception: unknown, host: ArgumentsHost): any {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();

    const errors = this.getResponseErrorsFromException(exception);
    const status = this.getStatusFromException(exception);

    this.logError(exception);

    this.httpAdapterHost.httpAdapter.reply(
      response,
      {
        errors: errors,
        meta: {
          status: status,
          reason: getReasonPhrase(status),
        },
        links: {
          self: getSelfLink(request),
        },
      },
      status,
    );
  }
}
