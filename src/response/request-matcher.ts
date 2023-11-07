import { RequestMethod } from '@nestjs/common';
import { AbstractHttpAdapter } from '@nestjs/core';
import { Request } from 'express';

export type RequestDefinition = { path: string; method: RequestMethod };

export class RequestMatcher {
  constructor(
    private readonly adapter: AbstractHttpAdapter,
    private readonly definitions: RequestDefinition[],
  ) {}

  private getRequestUrl(request: Request): string {
    return this.adapter.getRequestUrl(request) as string;
  }

  private getRequestMethod(request: Request): RequestMethod {
    const method: string = this.adapter.getRequestMethod(request) as string;

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
    definition: RequestDefinition,
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
