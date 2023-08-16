import {
  ParseUUIDPipe,
  PipeTransform,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import {
  BODY_VALIDATION_EXCEPTION_FACTORY,
  QUERY_VALIDATION_EXCEPTION_FACTORY,
  UUID_VALIDATION_EXCEPTION_FACTORY,
} from './exception-factories';
import {
  NestApiRequestDocumentInterface,
  NestApiResourceIdentifierInterface,
  NestApiResourceInterface,
} from '../api';

export class NestApiRequestIdPipe extends ParseUUIDPipe {
  constructor() {
    super({
      version: '4',
      exceptionFactory: UUID_VALIDATION_EXCEPTION_FACTORY,
    });
  }
}

export class NestApiRequestQueryValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      transformOptions: { exposeDefaultValues: true },
      whitelist: true,
      validateCustomDecorators: true,
      exceptionFactory: QUERY_VALIDATION_EXCEPTION_FACTORY,
    });
  }
}

export class NestApiRequestBodyValidationPipe extends ValidationPipe {
  constructor(type: Type) {
    super({
      expectedType: type,
      transform: true,
      transformOptions: { exposeDefaultValues: true },
      whitelist: true,
      forbidNonWhitelisted: true,
      validateCustomDecorators: true,
      exceptionFactory: BODY_VALIDATION_EXCEPTION_FACTORY,
    });
  }
}

export class NestApiRequestBodyDataTransformationPipe
  implements PipeTransform<NestApiRequestDocumentInterface>
{
  public transform(value: NestApiRequestDocumentInterface): unknown {
    return value.data;
  }
}

// TODO: use interface without links
export class NestApiEntityRequestBodyTransformationPipe<T>
  implements PipeTransform<NestApiResourceInterface>
{
  constructor(private readonly type: Type<T>) {}

  public transform(value: NestApiResourceInterface): T {
    const attributes: Record<string, unknown> = value.attributes ?? {};
    const relationships: Record<string, unknown> = value.relationships ?? {};
    const meta: Record<string, unknown> = value.meta ?? {};

    const plain: Record<string, unknown> = {
      ...attributes,
      ...relationships,
      ...meta,
    };

    return plainToInstance(this.type, plain, {
      excludeExtraneousValues: true,
    });
  }
}

export class NestApiRelationshipRequestBodyTransformationPipe
  implements PipeTransform<NestApiResourceIdentifierInterface | null>
{
  public transform(
    value: NestApiResourceIdentifierInterface | null,
  ): string | null {
    return value?.id ?? null;
  }
}

export class NestApiRelationshipsRequestBodyTransformationPipe
  implements PipeTransform<NestApiResourceIdentifierInterface[]>
{
  public transform(value: NestApiResourceIdentifierInterface[]): string[] {
    return value.map((e) => e.id);
  }
}
