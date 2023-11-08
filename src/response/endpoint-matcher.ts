import { HttpServer, RequestMethod } from '@nestjs/common';
import { Request } from 'express';

import { isNullOrUndefined } from '../core';

export type EndpointDefinition = { path: string; method: RequestMethod };

export class EndpointMatcher {
  constructor(
    private readonly server: HttpServer,
    private readonly definitions: EndpointDefinition[],
  ) {}

  private getRequestUrl(request: Request): string {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (isNullOrUndefined(this.server.getRequestUrl)) {
      return request['url'];
    }

    return this.server.getRequestUrl(request);
  }

  private getRequestMethodString(request: Request): string {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (isNullOrUndefined(this.server.getRequestMethod)) {
      return request['method'];
    }

    return this.server.getRequestMethod(request);
  }

  private getRequestMethod(request: Request): RequestMethod {
    const method: string = this.getRequestMethodString(request);

    switch (method) {
      case 'GET':
        return RequestMethod.GET;
      case 'POST':
        return RequestMethod.POST;
      case 'PUT':
        return RequestMethod.PUT;
      case 'DELETE':
        return RequestMethod.DELETE;
      case 'PATCH':
        return RequestMethod.PATCH;
      case 'OPTIONS':
        return RequestMethod.OPTIONS;
      case 'HEAD':
        return RequestMethod.HEAD;
      default:
        return RequestMethod.ALL;
    }
  }

  private isMatch(
    definition: EndpointDefinition,
    url: string,
    method: RequestMethod,
  ): boolean {
    return (
      definition.path === url &&
      (definition.method === method || definition.method === RequestMethod.ALL)
    );
  }

  public match(request: Request): boolean {
    const url: string = this.getRequestUrl(request);
    const method: RequestMethod = this.getRequestMethod(request);

    for (const definition of this.definitions) {
      if (this.isMatch(definition, url, method)) {
        return true;
      }
    }

    return false;
  }
}
