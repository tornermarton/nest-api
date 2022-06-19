import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { getReasonPhrase } from 'http-status-codes';

import { ApiResponse, getSelfLink, isPagedResource } from './api-response';

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        if (data && isPagedResource(data)) {
          return {
            data: data.items,
            meta: {
              status: response.statusCode,
              reason: getReasonPhrase(response.statusCode),
              total: data.paging.total,
            },
            links: {
              self: getSelfLink(request),
              // TODO: add other paging links
            },
          };
        } else {
          return {
            data: data,
            meta: {
              status: response.statusCode,
              reason: getReasonPhrase(response.statusCode),
            },
            links: {
              self: getSelfLink(request),
            },
          };
        }
      }),
    );
  }
}
