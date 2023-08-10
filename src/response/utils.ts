import { Request } from 'express';
import { parse, stringify } from 'qs';

import { EntityResponse } from './models';
import {
  NestApiDocumentPaging,
  NestApiPaginationLinksInterface,
  NestApiRelationshipResponseDocumentLinks,
  NestApiCommonDocumentLinksInterface,
  NestApiEntitiesDocumentLinksInterface,
  NestApiEntityDocumentLinksInterface,
} from '../api';
import { isNotNullOrUndefined } from '../core';
import { IQueryDto, QueryDtoPage } from '../dto';

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
    limit: QueryDtoPage.DEFAULT_LIMIT,
    offset: QueryDtoPage.DEFAULT_OFFSET,
  };
  const page = request.query.page ?? defaults;

  return { ...page, total };
}

function getSelfLink(request: Request): string {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${request.protocol}://${request.headers.host}${request.originalUrl}`;
}

export function getNestApiCommonDocumentLinks(
  request: Request,
): NestApiCommonDocumentLinksInterface {
  return {
    self: getSelfLink(request),
  };
}

export function getNestApiEntityDocumentLinks(
  request: Request,
): NestApiEntityDocumentLinksInterface {
  return getNestApiCommonDocumentLinks(request);
}

export function getNestApiRelationshipDocumentLinks(
  request: Request,
): NestApiRelationshipResponseDocumentLinks {
  const links = getNestApiCommonDocumentLinks(request);

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
  query: IQueryDto<unknown, unknown, never>,
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
  const query: Mutable<IQueryDto<unknown, unknown, never>> = parse(url.search, {
    ignoreQueryPrefix: true,
    comma: true,
  });

  const paging: NestApiDocumentPaging = getNestApiDocumentPaging(
    request,
    total,
  );
  const { limit, offset } = paging;

  query.page = { limit: limit, offset: 0 };
  const first: string = updateQuery(url, query);

  let prev: string | undefined = undefined;
  let next: string | undefined = undefined;
  let last: string | undefined = undefined;

  if (offset > 0) {
    query.page = { limit: limit, offset: Math.max(0, offset - limit) };
    prev = updateQuery(url, query);
  }

  if (total === Infinity || total - (total % limit) > offset) {
    query.page = { limit: limit, offset: Math.min(offset + limit, total) };
    next = updateQuery(url, query);
  }

  if (total !== Infinity) {
    let lastOffset: number = total - (total % limit);
    if (total % limit === 0) {
      lastOffset = total - limit;
    }
    query.page = { limit: limit, offset: lastOffset };
    last = updateQuery(url, query);
  }

  return { first, prev, next, last };
}

export function getNestApiEntitiesDocumentLinks(
  request: Request,
  total = Infinity,
): NestApiEntitiesDocumentLinksInterface {
  const commonLinks = getNestApiCommonDocumentLinks(request);

  const { self } = commonLinks;
  const paginationLinks = getNestApiPaginationLinks(request, self, total);

  return { ...commonLinks, ...paginationLinks };
}

export function getNestApiRelationshipsDocumentLinks(
  request: Request,
  total = Infinity,
): NestApiRelationshipResponseDocumentLinks {
  const commonLinks = getNestApiCommonDocumentLinks(request);

  const { self } = commonLinks;
  const paginationLinks = getNestApiPaginationLinks(request, self, total);

  return {
    ...commonLinks,
    ...paginationLinks,
    related: self.replace('/relationships', ''),
  };
}
