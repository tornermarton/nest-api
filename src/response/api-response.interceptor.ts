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

import { EndpointDefinition, EndpointMatcher } from './endpoint-matcher';
import {
  BaseUrl,
  ResourcesResponse,
  ResourceResponse,
  NestApiResourceBuilder,
  RelatedResourcesResponse,
  RelatedResourceResponse,
  RelationshipResponse,
  RelationshipsResponse,
} from './models';
import {
  getNestApiCommonDocumentLinks,
  getNestApiDocumentPaging,
  getNestApiEntitiesDocumentLinks,
  getNestApiResourceDocumentLinks,
  getNestApiRelationshipDocumentLinks,
  getNestApiRelationshipsDocumentLinks,
} from './utils';
import {
  getResourceMetadata,
  NestApiDocumentMetaInterface,
  NestApiResourceMetadata,
  NestApiResourceIdentifierDataInterface,
  NestApiResourceDataInterface,
  NestApiResponseDocumentInterface,
} from '../api';
import { isNullOrUndefined, MissingIdFieldException } from '../core';

type RequestMatcherOptions = {
  exclude?: EndpointDefinition[];
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
        const exclude: EndpointDefinition[] = options.exclude ?? [];

        const matcher: EndpointMatcher = new EndpointMatcher(adapter, exclude);

        return new ApiResponseInterceptor(matcher, options);
      },
      inject: [HttpAdapterHost],
    };
  }

  constructor(
    private readonly matcher: EndpointMatcher,
    private readonly options: ApiResponseInterceptorOptions,
  ) {}

  // eslint-disable-next-line @typescript-eslint/ban-types
  private transformResource<T extends Function>(
    resource?: T,
  ): NestApiResourceDataInterface | null {
    if (isNullOrUndefined(resource)) {
      return null;
    }

    const metadata: NestApiResourceMetadata = getResourceMetadata(resource);

    if (isNullOrUndefined(metadata.fields.id)) {
      throw new MissingIdFieldException(
        `Resource [${resource.name}] must have an ID property decorated with @NestApiResourceId()`,
      );
    }

    // TODO: might be a good idea to check type in the decorator
    const id: string = resource[metadata.fields.id.name];
    const type: string = metadata.name;

    const builder: NestApiResourceBuilder = new NestApiResourceBuilder(
      id,
      type,
    );

    const obj: Record<string, unknown> = instanceToPlain(resource, {
      excludeExtraneousValues: true,
    });

    for (const { name } of metadata.fields.meta) {
      builder.meta(name, obj[name]);
    }

    for (const { name } of metadata.fields.attributes) {
      builder.attribute(name, obj[name]);
    }

    for (const { name, descriptor } of metadata.fields.relationships) {
      const relationshipMetadata: NestApiResourceMetadata = getResourceMetadata(
        descriptor.related().prototype,
      );

      if (descriptor.kind === 'toMany') {
        builder.relationshipToMany(
          name,
          relationshipMetadata.name,
          obj[name] as string[],
        );
      } else {
        builder.relationshipToOne(
          name,
          relationshipMetadata.name,
          obj[name] as string,
        );
      }
    }

    return builder.build();
  }

  private transformRelationship<T>(
    type: Type<T>,
    data?: string,
  ): NestApiResourceIdentifierDataInterface | null {
    if (isNullOrUndefined(data)) {
      return null;
    }

    const metadata: NestApiResourceMetadata = getResourceMetadata(
      type.prototype,
    );

    return { id: data, type: metadata.name };
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

        if (
          r instanceof ResourceResponse ||
          r instanceof RelatedResourceResponse
        ) {
          return {
            meta: meta,
            data: this.transformResource(r.data),
            links: getNestApiResourceDocumentLinks(
              this.options?.baseUrl,
              request,
            ),
            included: r.included?.map((e) =>
              // eslint-disable-next-line @typescript-eslint/ban-types
              this.transformResource(e as Function),
            ),
          };
        } else if (
          r instanceof ResourcesResponse ||
          r instanceof RelatedResourcesResponse
        ) {
          return {
            meta: meta,
            data: r.data.map((e) => this.transformResource(e)),
            links: getNestApiEntitiesDocumentLinks(baseUrl, request, r.total),
            paging: getNestApiDocumentPaging(request, r.total),
            included: r.included?.map((e) =>
              // eslint-disable-next-line @typescript-eslint/ban-types
              this.transformResource(e as Function),
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
