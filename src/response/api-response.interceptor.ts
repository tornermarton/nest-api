import 'reflect-metadata';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { getReasonPhrase } from 'http-status-codes';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiResponse, PagedResource, ResponseMeta } from './models';
import {
  getCommonResponseLinks,
  getPagedResponseLinks,
  getPaging,
} from './utils';

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request: Request = context.switchToHttp().getRequest<Request>();
    const response: Response = context.switchToHttp().getResponse<Response>();

    const status: number = response.statusCode;
    const reason: string = getReasonPhrase(status);
    const meta: ResponseMeta = {
      status: status,
      reason: reason,
    };

    return next.handle().pipe(
      map((resource: T | PagedResource<T>) => {
        if (resource instanceof PagedResource) {
          return {
            meta: meta,
            data: resource.items,
            links: getPagedResponseLinks(request, resource.total),
            paging: getPaging(request.query, resource.total),
          };
        } else {
          return {
            meta: meta,
            data: resource,
            links: getCommonResponseLinks(request),
          };
        }
      }),
    );
  }
}
