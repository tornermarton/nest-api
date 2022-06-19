import { Request } from 'express';

export interface Paging {
  count: number;
  offset: number;
  total: number;
}

export interface PagedResource<T> {
  items: T[];
  paging: Paging;
}

export const emptyPagedResource = {
  items: [] as never[],
  paging: { count: 0, offset: 0, total: 0 } as Paging,
};

export function isPagedResource(object: any): object is PagedResource<any> {
  return (
    Object.prototype.hasOwnProperty.call(object, 'items') &&
    Object.prototype.hasOwnProperty.call(object, 'paging')
  );
}

export function getSelfLink(request: Request): string {
  return `${request.protocol}://${request.hostname}${request.originalUrl}`;
}

export interface ResponseError {
  status: number;
  title: string;
  detail?: string;
  source?: { pointer?: string; parameter?: string };
}

export interface ResponseMeta {
  status: number;
  reason?: string;
  total?: number;
}

export interface ResponseLinks {
  self: string;
  first?: string;
  next?: string;
  prev?: string;
  last?: string;
}

export interface ApiResponse<T> {
  data?: T | T[];
  errors?: ResponseError[];
  links: ResponseLinks;
  meta: ResponseMeta;
}
