import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { isUndefined } from '../../../core';
import { AUTH_PASSPORT_HEADER } from '../constants';
import { Passport } from '../interfaces';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly _jwtService: JwtService) {}

  private getPassportFromRequest(request: Request): string | undefined {
    const key: string = AUTH_PASSPORT_HEADER.toLowerCase();

    return request.headers[key] as string | undefined;
  }

  public canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest<Request>();

    const token: string | undefined = this.getPassportFromRequest(request);

    if (isUndefined(token)) {
      throw new UnauthorizedException('Authentication passport header missing');
    }

    try {
      request['user'] = this._jwtService.verify<Passport>(token);
    } catch (error) {
      throw new UnauthorizedException('Authentication passport malformed');
    }

    return true;
  }
}
