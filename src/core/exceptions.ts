import { HttpException, HttpStatus, Type } from '@nestjs/common';
import { getReasonPhrase } from 'http-status-codes';

import { NestApiErrorInterface } from '../api';

export class NestApiException extends Error {}

export class MissingEnvironmentException extends NestApiException {}
export class InvalidEnvironmentException extends NestApiException {}

export class UnknownResourceException extends NestApiException {}
export class UnknownRelationshipException extends NestApiException {}
export class MissingIdFieldException extends NestApiException {}

export class UnknownEntityDefinitionException extends NestApiException {}
export class UnknownRelationshipDefinitionException extends NestApiException {}

export class InvalidDecoratedPropertyException extends NestApiException {}

export class InvalidIdSetException extends NestApiException {}

export class NestApiHttpException extends HttpException {
  public readonly errors: NestApiErrorInterface[];

  constructor(
    errorOrErrors: NestApiErrorInterface | NestApiErrorInterface[],
    status: number,
    cause?: unknown,
  ) {
    const reason: string = getReasonPhrase(status);
    const errors: NestApiErrorInterface[] = Array.isArray(errorOrErrors)
      ? errorOrErrors
      : [errorOrErrors];

    super({ errors, message: reason }, status, { cause });

    this.errors = errors;
  }
}

function NestApiHttpExceptionWithStatus(
  status: number,
): Type<NestApiHttpException> {
  class NestApiHttpExceptionClass extends NestApiHttpException {
    constructor(
      errorOrErrors: NestApiErrorInterface | NestApiErrorInterface[],
      cause?: unknown,
    ) {
      super(errorOrErrors, status, cause);
    }
  }

  return NestApiHttpExceptionClass;
}

export class NestApiBadRequestException extends NestApiHttpExceptionWithStatus(
  HttpStatus.BAD_REQUEST,
) {}
export class NestApiUnauthorizedException extends NestApiHttpExceptionWithStatus(
  HttpStatus.UNAUTHORIZED,
) {}
export class NestApiForbiddenException extends NestApiHttpExceptionWithStatus(
  HttpStatus.FORBIDDEN,
) {}
export class NestApiNotFoundException extends NestApiHttpExceptionWithStatus(
  HttpStatus.NOT_FOUND,
) {}
export class NestApiUnprocessableEntityException extends NestApiHttpExceptionWithStatus(
  HttpStatus.UNPROCESSABLE_ENTITY,
) {}
export class NestApiInternalServerErrorException extends NestApiHttpExceptionWithStatus(
  HttpStatus.INTERNAL_SERVER_ERROR,
) {}
export class NestApiNotImplementedException extends NestApiHttpExceptionWithStatus(
  HttpStatus.NOT_IMPLEMENTED,
) {}
export class NestApiServiceUnavailableException extends NestApiHttpExceptionWithStatus(
  HttpStatus.SERVICE_UNAVAILABLE,
) {}
