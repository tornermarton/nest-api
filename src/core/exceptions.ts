import { HttpException, HttpStatus } from '@nestjs/common';
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

type NestApiErrorOrErrors =
  | string
  | NestApiErrorInterface
  | NestApiErrorInterface[];
export class NestApiHttpException extends HttpException {
  public readonly errors: NestApiErrorInterface[];

  constructor(
    status: number,
    errorOrErrors: NestApiErrorOrErrors,
    cause?: unknown,
  ) {
    const reason = getReasonPhrase(status);
    const errors = Array.isArray(errorOrErrors)
      ? errorOrErrors
      : typeof errorOrErrors === 'string'
        ? [{ status: status, title: reason, detail: errorOrErrors }]
        : [errorOrErrors];

    super({ errors, message: reason }, status, { cause });

    this.errors = errors;
  }
}

export class NestApiBadRequestException extends NestApiHttpException {
  constructor(errorOrErrors: NestApiErrorOrErrors, cause?: unknown) {
    super(HttpStatus.BAD_REQUEST, errorOrErrors, cause);
  }
}
export class NestApiUnauthorizedException extends NestApiHttpException {
  constructor(errorOrErrors: NestApiErrorOrErrors, cause?: unknown) {
    super(HttpStatus.UNAUTHORIZED, errorOrErrors, cause);
  }
}
export class NestApiForbiddenException extends NestApiHttpException {
  constructor(errorOrErrors: NestApiErrorOrErrors, cause?: unknown) {
    super(HttpStatus.FORBIDDEN, errorOrErrors, cause);
  }
}
export class NestApiNotFoundException extends NestApiHttpException {
  constructor(errorOrErrors: NestApiErrorOrErrors, cause?: unknown) {
    super(HttpStatus.NOT_FOUND, errorOrErrors, cause);
  }
}
export class NestApiUnprocessableEntityException extends NestApiHttpException {
  constructor(errorOrErrors: NestApiErrorOrErrors, cause?: unknown) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, errorOrErrors, cause);
  }
}
export class NestApiInternalServerErrorException extends NestApiHttpException {
  constructor(errorOrErrors: NestApiErrorOrErrors, cause?: unknown) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, errorOrErrors, cause);
  }
}
export class NestApiNotImplementedException extends NestApiHttpException {
  constructor(errorOrErrors: NestApiErrorOrErrors, cause?: unknown) {
    super(HttpStatus.NOT_IMPLEMENTED, errorOrErrors, cause);
  }
}
export class NestApiServiceUnavailableException extends NestApiHttpException {
  constructor(errorOrErrors: NestApiErrorOrErrors, cause?: unknown) {
    super(HttpStatus.SERVICE_UNAVAILABLE, errorOrErrors, cause);
  }
}
