import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { isUndefined } from '../../core';
import { AUTH_PASSPORT_HEADER } from '../constants';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly _jwtService: JwtService) {}

  public canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const key: string = AUTH_PASSPORT_HEADER.toLowerCase();
    const token: string | undefined = request.headers[key];

    if (isUndefined(token)) {
      throw new UnauthorizedException('Authentication passport header missing');
    }

    try {
      request.user = this._jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Authentication passport malformed');
    }

    return true;
  }
}
