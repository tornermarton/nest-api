import { Request } from 'express';
import { parse, stringify } from 'qs';

import { BaseUrl, EntityResponse } from './models';
import {
  NestApiDocumentPaging,
  NestApiPaginationLinksInterface,
  NestApiRelationshipResponseDocumentLinks,
  NestApiCommonDocumentLinksInterface,
  NestApiEntitiesResponseDocumentLinksInterface,
  NestApiEntityResponseDocumentLinksInterface,
} from '../api';
import { isNotNullOrUndefined } from '../core';
import { IQueryEntitiesDto, PageDto } from '../dto';

export function isNotEmptyEntityResponse<T>(
  response: EntityResponse<T | null | undefined>,
): response is EntityResponse<T> {
  return isNotNullOrUndefined(response.data);
}

export function getNestApiDocumentPaging(
  request: Request,
  total?: number,
): NestApiDocumentPaging {
  const defaults = {
    offset: PageDto.DEFAULT_OFFSET,
    limit: PageDto.DEFAULT_LIMIT,
  };
  const page = request.query.page ?? defaults;

  return { ...page, total };
}

function createBaseUrlString(baseUrl: BaseUrl): string {
  if (baseUrl.url.port === 80 || baseUrl.url.port === 443) {
    return `${baseUrl.url.scheme}://${baseUrl.url.host}`;
  }

  return `${baseUrl.url.scheme}://${baseUrl.url.host}:${baseUrl.url.port}`;
}

function getSelfLink(baseUrl: BaseUrl, request: Request): string {
  const url: string = createBaseUrlString(baseUrl);

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${url}${request.originalUrl}`;
}

export function getNestApiCommonDocumentLinks(
  baseUrl: BaseUrl,
  request: Request,
): NestApiCommonDocumentLinksInterface {
  return {
    self: getSelfLink(baseUrl, request),
  };
}

export function getNestApiEntityDocumentLinks(
  baseUrl: BaseUrl,
  request: Request,
): NestApiEntityResponseDocumentLinksInterface {
  return getNestApiCommonDocumentLinks(baseUrl, request);
}

export function getNestApiRelationshipDocumentLinks(
  baseUrl: BaseUrl,
  request: Request,
): NestApiRelationshipResponseDocumentLinks {
  const links = getNestApiCommonDocumentLinks(baseUrl, request);

  return {
    ...links,
    related: links.self.replace('/relationships', ''),
  };
}

type Mutable<Type> = {
  -readonly [Key in keyof Type]: Type[Key];
};

function updateQuery(
  url: URL,
  query: IQueryEntitiesDto<unknown, unknown, never>,
): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  url.search = stringify(query, {
    encodeValuesOnly: true,
    arrayFormat: 'comma',
  });
  return url.toString();
}

function getNestApiPaginationLinks(
  request: Request,
  base: string,
  total = Infinity,
): NestApiPaginationLinksInterface {
  const url: URL = new URL(base);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const query: Mutable<IQueryEntitiesDto<unknown, unknown, never>> = parse(
    url.search,
    {
      ignoreQueryPrefix: true,
      comma: true,
    },
  );

  const paging: NestApiDocumentPaging = getNestApiDocumentPaging(
    request,
    total,
  );
  const { offset, limit } = paging;

  query.page = { offset: 0, limit };
  const first: string = updateQuery(url, query);

  let prev: string | undefined = undefined;
  let next: string | undefined = undefined;
  let last: string | undefined = undefined;

  if (offset > 0) {
    query.page = { offset: Math.max(0, offset - limit), limit };
    prev = updateQuery(url, query);
  }

  if (total === Infinity || total - (total % limit) > offset) {
    query.page = { offset: Math.min(offset + limit, total), limit };
    next = updateQuery(url, query);
  }

  if (total !== Infinity) {
    let lastOffset: number = total - (total % limit);
    if (total % limit === 0) {
      lastOffset = total - limit;
    }
    query.page = { offset: lastOffset, limit };
    last = updateQuery(url, query);
  }

  return { first, prev, next, last };
}

export function getNestApiEntitiesDocumentLinks(
  baseUrl: BaseUrl,
  request: Request,
  total = Infinity,
): NestApiEntitiesResponseDocumentLinksInterface {
  const commonLinks = getNestApiCommonDocumentLinks(baseUrl, request);

  const { self } = commonLinks;
  const paginationLinks = getNestApiPaginationLinks(request, self, total);

  return { ...commonLinks, ...paginationLinks };
}

export function getNestApiRelationshipsDocumentLinks(
  baseUrl: BaseUrl,
  request: Request,
  total = Infinity,
): NestApiRelationshipResponseDocumentLinks {
  const commonLinks = getNestApiCommonDocumentLinks(baseUrl, request);

  const { self } = commonLinks;
  const paginationLinks = getNestApiPaginationLinks(request, self, total);

  return {
    ...commonLinks,
    ...paginationLinks,
    related: self.replace('/relationships', ''),
  };
}
