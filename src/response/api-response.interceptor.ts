import 'reflect-metadata';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  FactoryProvider,
  RequestMethod,
} from '@nestjs/common';
import { AbstractHttpAdapter, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
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
import { isNotNullOrUndefined } from '../core';

type ApiResponseInterceptorOptions = {
  exclude: { path: string; method: RequestMethod }[];
};

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  public static forRoot<T = unknown>(
    options?: ApiResponseInterceptorOptions,
  ): FactoryProvider {
    return {
      provide: APP_INTERCEPTOR,
      useFactory: (
        httpAdapterHost: HttpAdapterHost,
      ): ApiResponseInterceptor<T> => {
        return new ApiResponseInterceptor(httpAdapterHost, options);
      },
      inject: [HttpAdapterHost],
    };
  }

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly options?: ApiResponseInterceptorOptions,
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const adapter: AbstractHttpAdapter = this.httpAdapterHost.httpAdapter;
    const request: Request = context.switchToHttp().getRequest<Request>();
    const response: Response = context.switchToHttp().getResponse<Response>();

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
          return next.handle();
        }
      }
    }

    const status: number = response.statusCode as number;
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
            paging: getPaging(request, resource.total),
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
