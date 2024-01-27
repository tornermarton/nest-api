import { HttpException, HttpStatus, ValidationError } from '@nestjs/common';

import { NestApiBodyErrorInterface, NestApiQueryErrorInterface } from '../api';
import {
  NestApiBadRequestException,
  NestApiUnprocessableEntityException,
} from '../core';

export const UUID_VALIDATION_EXCEPTION_FACTORY = (): HttpException =>
  new NestApiUnprocessableEntityException();

function processQueryErrors(
  errors: ValidationError[],
  parameter?: string,
): NestApiQueryErrorInterface[] {
  return errors
    .map((error) => {
      const parent = parameter ? `${parameter}.` : '';
      const path = `${parent}${error.property}`;

      const currentErrors: NestApiQueryErrorInterface[] = Object.values(
        error.constraints ?? {},
      ).map((constraint) => ({
        status: HttpStatus.BAD_REQUEST,
        title: 'Invalid Query Parameter',
        detail: constraint,
        source: { parameter: path },
      }));

      const childrenErrors: NestApiQueryErrorInterface[] = processQueryErrors(
        error.children ?? [],
        path,
      );

      return [...currentErrors, ...childrenErrors];
    })
    .flat();
}

export const QUERY_VALIDATION_EXCEPTION_FACTORY = (
  errors: ValidationError[],
): HttpException => new NestApiBadRequestException(processQueryErrors(errors));

function processBodyErrors(
  errors: ValidationError[],
  pointer = '',
): NestApiBodyErrorInterface[] {
  return errors
    .map((error) => {
      const path = `${pointer}/${error.property}`;

      const currentErrors: NestApiBodyErrorInterface[] = Object.values(
        error.constraints ?? {},
      ).map((constraint) => ({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        title: 'Invalid Body Attribute',
        detail: constraint,
        source: { pointer: path },
      }));

      const childrenErrors: NestApiBodyErrorInterface[] = processBodyErrors(
        error.children ?? [],
        path,
      );

      return [...currentErrors, ...childrenErrors];
    })
    .flat();
}

export const BODY_VALIDATION_EXCEPTION_FACTORY = (
  errors: ValidationError[],
): HttpException =>
  new NestApiUnprocessableEntityException(processBodyErrors(errors));
