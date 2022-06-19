import {
  HttpStatus,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ResponseError } from './responses';

export const queryValidationExceptionFactory = (
  validationErrors: ValidationError[],
) => {
  const responseErrors: ResponseError[] = [];

  function processError(
    responseErrors: ResponseError[],
    error: ValidationError,
    parameter?: string,
  ) {
    parameter =
      typeof parameter === 'undefined'
        ? error.property
        : `${parameter}[${error.property}]`;

    if (error.constraints) {
      for (const value of Object.values(error.constraints)) {
        responseErrors.push({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          source: { parameter: parameter },
          title: 'Invalid Query Parameter',
          detail: value,
        } as ResponseError);
      }
    } else {
      error.children.forEach((child) =>
        processError(responseErrors, child, parameter),
      );
    }
  }

  validationErrors.forEach((error) => processError(responseErrors, error));

  return new UnprocessableEntityException({ errors: responseErrors });
};

export const bodyValidationExceptionFactory = (
  validationErrors: ValidationError[],
) => {
  const responseErrors: ResponseError[] = [];

  function processError(
    responseErrors: ResponseError[],
    error: ValidationError,
    pointer = '',
  ) {
    pointer = `${pointer}/${error.property}`;

    if (error.constraints) {
      for (const value of Object.values(error.constraints)) {
        responseErrors.push({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          source: { pointer: pointer },
          title: 'Invalid Body Attribute',
          detail: value,
        } as ResponseError);
      }
    } else {
      error.children.forEach((child) =>
        processError(responseErrors, child, pointer),
      );
    }
  }

  validationErrors.forEach((error) => processError(responseErrors, error));

  return new UnprocessableEntityException({ errors: responseErrors });
};

export const queryValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: queryValidationExceptionFactory,
});

export const bodyValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: bodyValidationExceptionFactory,
});
