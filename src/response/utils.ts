import { Request } from 'express';
import { parse, stringify } from 'qs';

import { CommonResponseLinks, PagedResponseLinks, Paging } from './models';

function getSelfLink(request: Request): string {
  return `${request.protocol}://${request.headers.host}${request.originalUrl}`;
}

export function getCommonResponseLinks(request: Request): CommonResponseLinks {
  return {
    self: getSelfLink(request),
  };
}

export function getPaging(query: any, total?: number): Paging {
  let limit = 100;
  let offset = 0;

  if (!query.hasOwnProperty('page')) {
    query.page = {};
  }

  if (!query.page.hasOwnProperty('limit')) {
    query.page.limit = limit;
  } else {
    limit = parseInt(query.page.limit);
  }

  if (!query.page.hasOwnProperty('offset')) {
    query.page.offset = offset;
  } else {
    offset = parseInt(query.page.offset);
  }

  return { limit, offset, total };
}

export function getPagedResponseLinks(
  request: Request,
  total = Infinity,
): PagedResponseLinks {
  const self: string = getSelfLink(request);

  let first: string;
  let prev: string;
  let next: string;
  let last: string;

  const parseOptions: any = { ignoreQueryPrefix: true, comma: true };
  const stringifyOptions: any = {
    encodeValuesOnly: true,
    arrayFormat: 'comma',
  };

  const url: URL = new URL(self);
  const query: any = parse(url.search, parseOptions);

  const paging: Paging = getPaging(query, total);
  const limit: number = paging.limit;
  const offset: number = paging.offset;

  query.page.limit = limit;
  query.page.offset = 0;
  url.search = stringify(query, stringifyOptions);
  // eslint-disable-next-line prefer-const
  first = url.toString();

  if (offset > 0) {
    query.page.limit = limit;
    query.page.offset = Math.max(0, offset - limit);
    url.search = stringify(query, stringifyOptions);
    prev = url.toString();
  }

  if (total === Infinity || total - (total % limit) > offset) {
    query.page.limit = limit;
    query.page.offset = Math.min(offset + limit, total);
    url.search = stringify(query, stringifyOptions);
    next = url.toString();
  }

  if (total !== Infinity) {
    query.page.limit = limit;
    if (total % limit === 0) {
      query.page.offset = total - limit;
    } else {
      query.page.offset = total - (total % limit);
    }

    url.search = stringify(query, stringifyOptions);
    last = url.toString();
  }

  return { self, first, prev, next, last };
}
