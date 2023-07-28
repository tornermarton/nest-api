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
import { instanceToPlain } from 'class-transformer';
import { Request, Response } from 'express';
import { getReasonPhrase } from 'http-status-codes';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PagedResource } from './models';
import {
  getNestApiEntitiesDocumentLinks,
  getNestApiEntityDocumentLinks,
  getPaging,
} from './utils';
import {
  getEntityMetadata,
  NestApiDocumentInterface,
  NestApiDocumentMetaInterface,
  NestApiEntityMetadata,
  NestApiResourceInterface,
  NestApiResourceRelationshipInterface,
  NestApiResourceRelationshipToManyLinksInterface,
  NestApiResourceRelationshipToOneLinksInterface,
} from '../api';
import { isNotNullOrUndefined } from '../core';
import { PageDto } from '../query';

type ApiResponseInterceptorOptions = {
  exclude: { path: string; method: RequestMethod }[];
};

export class NestApiResourceBuilder {
  private readonly _id: string;
  private readonly _type: string;

  private _meta?: Record<string, unknown>;
  private _attributes?: Record<string, unknown>;
  private _relationships?: Record<string, NestApiResourceRelationshipInterface>;

  constructor(id: string, type: string) {
    this._id = id;
    this._type = type;
  }

  private getSelfPath(): string {
    return `/${this._type}/${this._id}`;
  }

  public meta<T>(name: string, value: T): NestApiResourceBuilder {
    this._meta = this._meta ?? {};
    this._meta[name] = value;
    return this;
  }

  public attribute<T>(name: string, value: T): NestApiResourceBuilder {
    this._attributes = this._attributes ?? {};
    this._attributes[name] = value;
    return this;
  }

  private createRelationshipToOneLinks(
    type: string,
  ): NestApiResourceRelationshipToOneLinksInterface {
    return {
      self: `${this.getSelfPath()}/relationships/${type}`,
      related: `${this.getSelfPath()}/${type}`,
    };
  }

  private createRelationshipToManyLinks(
    type: string,
  ): NestApiResourceRelationshipToManyLinksInterface {
    // TODO: add correct links for ToMany
    const limit: number = PageDto.DEFAULT_LIMIT;
    const offset: number = PageDto.DEFAULT_OFFSET;
    const nextOffset: number = offset + limit;

    return {
      ...this.createRelationshipToOneLinks(type),
      first: `${this.getSelfPath()}/relationships/${type}?page[limit]=${limit}&page[offset]=${offset}`,
      next: `${this.getSelfPath()}/relationships/${type}?page[limit]=${limit}&page[offset]=${nextOffset}`,
    };
  }

  public relationship<T extends string | string[]>(
    name: string,
    value: T,
    type: string,
  ): NestApiResourceBuilder {
    this._relationships = this._relationships ?? {};

    if (Array.isArray(value)) {
      this._relationships[name] = {
        data: value.map((id) => ({
          id: id,
          type: type,
        })),
        links: this.createRelationshipToManyLinks(type),
      };
    } else {
      this._relationships[name] = {
        data: { id: value, type: type },
        links: this.createRelationshipToOneLinks(type),
      };
    }

    return this;
  }

  public build(): NestApiResourceInterface {
    return {
      id: this._id,
      type: this._type,
      attributes: this._attributes,
      relationships: this._relationships,
      meta: this._meta,
      links: {
        self: this.getSelfPath(),
      },
    };
  }
}

@Injectable()
export class ApiResponseInterceptor
  implements NestInterceptor<unknown, NestApiDocumentInterface>
{
  public static forRoot(
    options?: ApiResponseInterceptorOptions,
  ): FactoryProvider {
    return {
      provide: APP_INTERCEPTOR,
      useFactory: (
        httpAdapterHost: HttpAdapterHost,
      ): ApiResponseInterceptor => {
        return new ApiResponseInterceptor(httpAdapterHost, options);
      },
      inject: [HttpAdapterHost],
    };
  }

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly options?: ApiResponseInterceptorOptions,
  ) {}

  // eslint-disable-next-line @typescript-eslint/ban-types
  private transform<T extends Function>(entity: T): NestApiResourceInterface {
    const metadata: NestApiEntityMetadata = getEntityMetadata(entity);

    // TODO: might be a good idea to check type in the decorator
    const id: string = entity[metadata.properties.id.name];
    const type: string = metadata.type;

    const builder: NestApiResourceBuilder = new NestApiResourceBuilder(
      id,
      type,
    );

    const obj: Record<string, unknown> = instanceToPlain(entity, {
      excludeExtraneousValues: true,
    });

    for (const { name } of metadata.properties.meta) {
      builder.meta(name, obj[name]);
    }

    for (const { name } of metadata.properties.attributes) {
      builder.attribute(name, obj[name]);
    }

    for (const { name, type } of metadata.properties.relationships) {
      builder.relationship(name, obj[name] as string, type);
    }

    return builder.build();
  }

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<NestApiDocumentInterface> {
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
    const meta: NestApiDocumentMetaInterface = {
      status: status,
      reason: reason,
    };

    return next.handle().pipe(
      // eslint-disable-next-line @typescript-eslint/ban-types
      map(<T extends Function>(resource: T | PagedResource<T>) => {
        if (resource instanceof PagedResource) {
          return {
            meta: meta,
            data: resource.items.map((r) => this.transform(r)),
            links: getNestApiEntitiesDocumentLinks(request, resource.total),
            paging: getPaging(request, resource.total),
          };
        } else {
          return {
            meta: meta,
            data: this.transform(resource),
            links: getNestApiEntityDocumentLinks(request),
          };
        }
      }),
    );
  }
}
