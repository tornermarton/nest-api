import 'reflect-metadata';

import {
  CallHandler,
  ExecutionContext,
  FactoryProvider,
  Injectable,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { AbstractHttpAdapter, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { instanceToPlain } from 'class-transformer';
import { Request, Response } from 'express';
import { getReasonPhrase } from 'http-status-codes';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  BaseUrl,
  EntitiesResponse,
  EntityResponse,
  NestApiEntityResourceBuilder,
  RelatedEntitiesResponse,
  RelatedEntityResponse,
  RelationshipResponse,
  RelationshipsResponse,
} from './models';
import { RequestDefinition, RequestMatcher } from './request-matcher';
import {
  getNestApiCommonDocumentLinks,
  getNestApiDocumentPaging,
  getNestApiEntitiesDocumentLinks,
  getNestApiEntityDocumentLinks,
  getNestApiRelationshipDocumentLinks,
  getNestApiRelationshipsDocumentLinks,
} from './utils';
import {
  getEntityMetadata,
  NestApiDocumentMetaInterface,
  NestApiEntityMetadata,
  NestApiResourceIdentifierInterface,
  NestApiResourceInterface,
  NestApiResponseDocumentInterface,
} from '../api';
import { isNullOrUndefined } from '../core';

type RequestMatcherOptions = {
  exclude?: RequestDefinition[];
};

type ApiResponseInterceptorOptions = {
  baseUrl: BaseUrl;
};

@Injectable()
export class ApiResponseInterceptor<T = unknown>
  implements NestInterceptor<T, NestApiResponseDocumentInterface | T>
{
  public static forRoot(
    options: ApiResponseInterceptorOptions & RequestMatcherOptions,
  ): FactoryProvider {
    return {
      provide: APP_INTERCEPTOR,
      useFactory: (
        httpAdapterHost: HttpAdapterHost,
      ): ApiResponseInterceptor => {
        const adapter: AbstractHttpAdapter = httpAdapterHost.httpAdapter;
        const exclude: RequestDefinition[] = options.exclude ?? [];

        const matcher: RequestMatcher = new RequestMatcher(adapter, exclude);

        return new ApiResponseInterceptor(matcher, options);
      },
      inject: [HttpAdapterHost],
    };
  }

  constructor(
    private readonly matcher: RequestMatcher,
    private readonly options: ApiResponseInterceptorOptions,
  ) {}

  // eslint-disable-next-line @typescript-eslint/ban-types
  private transformEntity<T extends Function>(
    entity?: T,
  ): NestApiResourceInterface | null {
    if (isNullOrUndefined(entity)) {
      return null;
    }

    const metadata: NestApiEntityMetadata = getEntityMetadata(entity);

    if (isNullOrUndefined(metadata.fields.id)) {
      // TODO: lib error
      throw new Error(
        `Response entity [${entity.name}] must have an ID property decorated with @NestApiEntityId()`,
      );
    }

    // TODO: might be a good idea to check type in the decorator
    const id: string = entity[metadata.fields.id.name];
    const type: string = metadata.type;

    const builder: NestApiEntityResourceBuilder =
      new NestApiEntityResourceBuilder(id, type);

    const obj: Record<string, unknown> = instanceToPlain(entity, {
      excludeExtraneousValues: true,
    });

    for (const { name } of metadata.fields.meta) {
      builder.meta(name, obj[name]);
    }

    for (const { name } of metadata.fields.attributes) {
      builder.attribute(name, obj[name]);
    }

    for (const { name, descriptor } of metadata.fields.relationships) {
      const relationshipMetadata: NestApiEntityMetadata = getEntityMetadata(
        descriptor.related().prototype,
      );

      if (descriptor.kind === 'toMany') {
        builder.relationshipToMany(
          name,
          relationshipMetadata.type,
          obj[name] as string[],
        );
      } else {
        builder.relationshipToOne(
          name,
          relationshipMetadata.type,
          obj[name] as string,
        );
      }
    }

    return builder.build();
  }

  private transformRelationship<T>(
    type: Type<T>,
    data?: string,
  ): NestApiResourceIdentifierInterface | null {
    if (isNullOrUndefined(data)) {
      return null;
    }

    const metadata: NestApiEntityMetadata = getEntityMetadata(type.prototype);

    return { id: data, type: metadata.type };
  }

  public intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<NestApiResponseDocumentInterface | T> {
    const { baseUrl } = this.options;

    const request: Request = context.switchToHttp().getRequest<Request>();
    const response: Response = context.switchToHttp().getResponse<Response>();

    if (this.matcher.match(request)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((r) => {
        const status: number = response.statusCode;
        const timestamp: Date = new Date();
        const reason: string = getReasonPhrase(status);

        const meta: NestApiDocumentMetaInterface = {
          status,
          timestamp,
          reason,
        };

        if (r instanceof EntityResponse || r instanceof RelatedEntityResponse) {
          return {
            meta: meta,
            data: this.transformEntity(r.data),
            links: getNestApiEntityDocumentLinks(
              this.options?.baseUrl,
              request,
            ),
            included: r.included?.map((e) =>
              // eslint-disable-next-line @typescript-eslint/ban-types
              this.transformEntity(e as Function),
            ),
          };
        } else if (
          r instanceof EntitiesResponse ||
          r instanceof RelatedEntitiesResponse
        ) {
          return {
            meta: meta,
            data: r.data.map((e) => this.transformEntity(e)),
            links: getNestApiEntitiesDocumentLinks(baseUrl, request, r.total),
            paging: getNestApiDocumentPaging(request, r.total),
            included: r.included?.map((e) =>
              // eslint-disable-next-line @typescript-eslint/ban-types
              this.transformEntity(e as Function),
            ),
          };
        } else if (r instanceof RelationshipResponse) {
          return {
            meta: meta,
            data: this.transformRelationship(r.type, r.data),
            links: getNestApiRelationshipDocumentLinks(baseUrl, request),
          };
        } else if (r instanceof RelationshipsResponse) {
          return {
            meta: meta,
            data: r.data.map((e) => this.transformRelationship(r.type, e)),
            links: getNestApiRelationshipsDocumentLinks(
              baseUrl,
              request,
              r.total,
            ),
            paging: getNestApiDocumentPaging(request, r.total),
          };
        } else {
          return {
            meta: meta,
            links: getNestApiCommonDocumentLinks(baseUrl, request),
          };
        }
      }),
    );
  }
}
