import { Request } from 'express';
import { parse, stringify } from 'qs';

import { isNotNullOrUndefined } from '@lib/core';
import { IQueryDto } from '@lib/query';

import { CommonResponseLinks, PagedResponseLinks, Paging } from './models';

function getSelfLink(request: Request): string {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${request.protocol}://${request.headers.host}${request.originalUrl}`;
}

export function getCommonResponseLinks(request: Request): CommonResponseLinks {
  return {
    self: getSelfLink(request),
  };
}

export function getPaging(request: Request, total?: number): Paging {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const query: IQueryDto<unknown, unknown, never> = request.query;

  let limit = 100;
  let offset = 0;

  if (
    isNotNullOrUndefined(query.page) &&
    isNotNullOrUndefined(query.page.limit)
  ) {
    limit = query.page.limit;
  }

  if (
    isNotNullOrUndefined(query.page) &&
    isNotNullOrUndefined(query.page.offset)
  ) {
    offset = query.page.offset;
  }

  return { limit, offset, total };
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

export function getPagedResponseLinks(
  request: Request,
  total = Infinity,
): PagedResponseLinks {
  const self: string = getSelfLink(request);

  const url: URL = new URL(self);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const query: Mutable<IQueryDto<unknown, unknown, never>> = parse(url.search, {
    ignoreQueryPrefix: true,
    comma: true,
  });

  const paging: Paging = getPaging(request, total);
  const limit: number = paging.limit;
  const offset: number = paging.offset;

  query.page = { limit: limit, offset: 0 };
  const first: string = updateQuery(url, query);

  let prev: string;
  let next: string;
  let last: string;

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

  return { self, first, prev, next, last };
}
