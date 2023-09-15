import 'reflect-metadata';

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  FactoryProvider,
  RequestMethod,
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
  EntitiesResponse,
  EntityResponse,
  RelationshipResponse,
  RelationshipsResponse,
} from './models';
import {
  getNestApiEntitiesDocumentLinks,
  getNestApiEntityDocumentLinks,
  getNestApiDocumentPaging,
  getNestApiRelationshipDocumentLinks,
  getNestApiRelationshipsDocumentLinks,
  getNestApiCommonDocumentLinks,
} from './utils';
import {
  getEntityMetadata,
  NestApiResponseDocumentInterface,
  NestApiDocumentMetaInterface,
  NestApiEntityMetadata,
  NestApiResourceIdentifierInterface,
  NestApiResourceInterface,
  NestApiResourceRelationshipInterface,
  NestApiResourceRelationshipToManyLinksInterface,
  NestApiResourceRelationshipToOneLinksInterface,
} from '../api';
import { isNotNullOrUndefined, isNullOrUndefined } from '../core';

type ApiResponseInterceptorOptions = {
  exclude: { path: string; method: RequestMethod }[];
};

export class NestApiEntityResourceBuilder {
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

  public meta<T>(name: string, value: T): NestApiEntityResourceBuilder {
    this._meta = this._meta ?? {};
    this._meta[name] = value;
    return this;
  }

  public attribute<T>(name: string, value: T): NestApiEntityResourceBuilder {
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
    // TODO: add paging links for ToMany
    // const limit: number = QueryDtoPage.DEFAULT_LIMIT;
    // const offset: number = QueryDtoPage.DEFAULT_OFFSET;
    // const nextOffset: number = offset + limit;

    return {
      ...this.createRelationshipToOneLinks(type),
      // first: `${this.getSelfPath()}/relationships/${type}?page[limit]=${limit}&page[offset]=${offset}`,
      // next: `${this.getSelfPath()}/relationships/${type}?page[limit]=${limit}&page[offset]=${nextOffset}`,
    };
  }

  public relationshipToOne(
    name: string,
    type: string,
    value: string | null,
  ): NestApiEntityResourceBuilder {
    this._relationships = this._relationships ?? {};

    this._relationships[name] = {
      data: isNotNullOrUndefined(value) ? { id: value, type: type } : null,
      links: this.createRelationshipToOneLinks(type),
    };

    return this;
  }

  public relationshipToMany(
    name: string,
    type: string,
    value: string[],
  ): NestApiEntityResourceBuilder {
    this._relationships = this._relationships ?? {};

    this._relationships[name] = {
      data: value.map((id) => ({
        id: id,
        type: type,
      })),
      links: this.createRelationshipToManyLinks(type),
    };

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
  implements NestInterceptor<unknown, NestApiResponseDocumentInterface>
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
  private transformEntity<T extends Function>(
    entity: T,
  ): NestApiResourceInterface {
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
    if (isNotNullOrUndefined(data)) {
      const metadata: NestApiEntityMetadata = getEntityMetadata(type.prototype);

      return { id: data, type: metadata.type };
    } else {
      return null;
    }
  }

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<NestApiResponseDocumentInterface> {
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
      map(
        // eslint-disable-next-line @typescript-eslint/ban-types
        <T extends Function>(
          r:
            | void
            | EntityResponse<T>
            | EntitiesResponse<T>
            | RelationshipResponse<T>
            | RelationshipsResponse<T>,
        ) => {
          if (r instanceof EntityResponse) {
            return {
              meta: meta,
              data: this.transformEntity(r.data),
              links: getNestApiEntityDocumentLinks(request),
            };
          } else if (r instanceof EntitiesResponse) {
            return {
              meta: meta,
              data: r.data.map((e) => this.transformEntity(e)),
              links: getNestApiEntitiesDocumentLinks(request, r.total),
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
              links: getNestApiRelationshipDocumentLinks(request),
            };
          } else if (r instanceof RelationshipsResponse) {
            return {
              meta: meta,
              data: r.data.map((e) => this.transformRelationship(r.type, e)),
              links: getNestApiRelationshipsDocumentLinks(request, r.total),
              paging: getNestApiDocumentPaging(request, r.total),
            };
          } else {
            return {
              meta: meta,
              links: getNestApiCommonDocumentLinks(request),
            };
          }
        },
      ),
    );
  }
}
