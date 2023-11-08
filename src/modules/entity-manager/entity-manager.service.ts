import { Injectable, Type } from '@nestjs/common';

import {
  EntityManager,
  EntityManagerEntityDefinition,
  EntityManagerRelationshipDefinition,
} from './entity-manager';
import { getEntityMetadata, NestApiEntityMetadata } from '../../api';
import {
  Entity,
  isNullOrUndefined,
  UnknownEntityDefinitionException,
  UnknownRelationshipDefinitionException,
} from '../../core';

@Injectable()
export class EntityManagerService {
  private readonly entities: Map<string, EntityManagerEntityDefinition<any>> =
    new Map<string, EntityManagerEntityDefinition<any>>();
  private readonly relationships: Map<
    string,
    EntityManagerRelationshipDefinition<any>
  > = new Map<string, EntityManagerRelationshipDefinition<any>>();

  constructor(
    entities: EntityManagerEntityDefinition<any>[],
    relationships: EntityManagerRelationshipDefinition<any>[],
  ) {
    entities.forEach((e) => this.entities.set(e.type.name, e));
    relationships.forEach((r) => this.relationships.set(r.descriptor.name, r));
  }

  public get<
    TEntity extends Entity,
    TRelationships extends Extract<keyof TEntity, string> = never,
  >(type: Type<TEntity>): EntityManager<TEntity, TRelationships> {
    // TODO: might be a good idea to cache entity managers
    const entity: EntityManagerEntityDefinition<TEntity> | undefined =
      this.entities.get(type.name);

    if (isNullOrUndefined(entity)) {
      throw new UnknownEntityDefinitionException(
        `Could not find entity definition [${type.name}]`,
      );
    }

    const metadata: NestApiEntityMetadata = getEntityMetadata(type.prototype);

    const relationships = metadata.fields.relationships.reduce(
      (acc, { name, descriptor }) => {
        const relationship = this.relationships.get(descriptor.name);

        if (isNullOrUndefined(relationship)) {
          throw new UnknownRelationshipDefinitionException(
            `Could not find relationship definition [${descriptor.name}]`,
          );
        }

        acc[name] = relationship;

        return acc;
      },
      {} as Record<string, EntityManagerRelationshipDefinition<any>>,
    );

    return new EntityManager<TEntity, TRelationships>(
      this,
      entity,
      relationships,
    );
  }
}
