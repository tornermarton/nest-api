import {
  BadRequestException,
  HttpException,
  HttpStatus,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

import { ResponseError } from './models';

function processQueryErrors(
  errors: ValidationError[],
  parameter?: string,
): ResponseError[] {
  return errors
    .map((error) => {
      if (typeof parameter === 'undefined') {
        parameter = error.property;
      } else {
        parameter = `${parameter}.${error.property}`;
      }

      const errors: ResponseError[] = Object.values(error.constraints).map(
        (constraint) => ({
          status: HttpStatus.BAD_REQUEST,
          source: { parameter: parameter },
          title: 'Invalid Query Parameter',
          detail: constraint,
        }),
      );

      errors.push(...processQueryErrors(error.children ?? [], parameter));

      return errors;
    })
    .reduce((acc, e) => [...acc, ...e], []);
}

export const QUERY_VALIDATION_PIPE: ValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors: ValidationError[]): HttpException =>
    new BadRequestException({ errors: processQueryErrors(errors) }),
});

function processBodyErrors(
  errors: ValidationError[],
  pointer = '',
): ResponseError[] {
  return errors
    .map((error) => {
      const propertyPointer = `${pointer}/${error.property}`;

      const errors: ResponseError[] = Object.values(error.constraints).map(
        (constraint) => ({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          source: { pointer: propertyPointer },
          title: 'Invalid Body Attribute',
          detail: constraint,
        }),
      );

      errors.push(...processBodyErrors(error.children ?? [], propertyPointer));

      return errors;
    })
    .reduce((acc, e) => [...acc, ...e], []);
}

export const BODY_VALIDATION_PIPE: ValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors: ValidationError[]): HttpException =>
    new UnprocessableEntityException({ errors: processBodyErrors(errors) }),
});
