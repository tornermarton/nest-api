import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import { parse, stringify } from 'qs';

import { Paging } from './models';
import {
  NestApiCommonDocumentLinksInterface,
  NestApiEntitiesDocumentLinksInterface,
  NestApiEntityDocumentLinksInterface,
} from '../api/interfaces';
import { IQueryDto, PageDto } from '../query';

export function getPaging(request: Request, total?: number): Paging {
  const page: PageDto = plainToInstance(
    PageDto,
    request.query.page ?? {
      limit: PageDto.DEFAULT_LIMIT,
      offset: PageDto.DEFAULT_OFFSET,
    },
  );

  return { limit: page.limit, offset: page.offset, total };
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

export function getNestApiEntitiesDocumentLinks(
  request: Request,
  total = Infinity,
): NestApiEntitiesDocumentLinksInterface {
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
