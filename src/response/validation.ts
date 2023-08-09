import {
  BadRequestException,
  HttpException,
  HttpStatus,
  ParseUUIDPipe,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

import { NestApiBodyErrorInterface, NestApiQueryErrorInterface } from '../api';

export const UUID_VALIDATION_PIPE: ParseUUIDPipe = new ParseUUIDPipe({
  version: '4',
});

function processQueryErrors(
  errors: ValidationError[],
  parameter?: string,
): NestApiQueryErrorInterface[] {
  return errors
    .map((error) => {
      const parent = parameter ? `${parameter}.` : '';
      const path = `${parent}${error.property}`;

      const errors: NestApiQueryErrorInterface[] = Object.values(
        error.constraints ?? {},
      ).map((constraint) => ({
        status: HttpStatus.BAD_REQUEST,
        source: { parameter: path },
        title: 'Invalid Query Parameter',
        detail: constraint,
      }));

      errors.push(...processQueryErrors(error.children ?? [], path));

      return errors;
    })
    .flat();
}

export const QUERY_VALIDATION_PIPE: ValidationPipe = new ValidationPipe({
  transform: true,
  transformOptions: { exposeDefaultValues: true },
  whitelist: true,
  forbidNonWhitelisted: true,
  validateCustomDecorators: true,
  exceptionFactory: (errors: ValidationError[]): HttpException =>
    new BadRequestException({ errors: processQueryErrors(errors) }),
});

function processBodyErrors(
  errors: ValidationError[],
  pointer = '',
): NestApiBodyErrorInterface[] {
  return errors
    .map((error) => {
      const path = `${pointer}/${error.property}`;

      const errors: NestApiBodyErrorInterface[] = Object.values(
        error.constraints ?? {},
      ).map((constraint) => ({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        source: { pointer: path },
        title: 'Invalid Body Attribute',
        detail: constraint,
      }));

      errors.push(...processBodyErrors(error.children ?? [], path));

      return errors;
    })
    .reduce((acc, e) => [...acc, ...e], []);
}

export const BODY_VALIDATION_PIPE: ValidationPipe = new ValidationPipe({
  transform: true,
  transformOptions: { exposeDefaultValues: true },
  whitelist: true,
  forbidNonWhitelisted: true,
  validateCustomDecorators: true,
  exceptionFactory: (errors: ValidationError[]): HttpException =>
    new UnprocessableEntityException({ errors: processBodyErrors(errors) }),
});
