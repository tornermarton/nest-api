import { Injectable, Type } from '@nestjs/common';

import {
  ResourceManager,
  ResourceManagerEntityDefinition,
  ResourceManagerRelationshipDefinition,
  ResourceRelationshipKey,
} from './resource-manager';
import { getResourceMetadata } from '../../api';
import {
  Entity,
  isNullOrUndefined,
  UnknownEntityDefinitionException,
  UnknownRelationshipDefinitionException,
} from '../../core';

@Injectable()
export class ResourceManagerService {
  private readonly entities: Map<string, ResourceManagerEntityDefinition> =
    new Map<string, ResourceManagerEntityDefinition>();
  private readonly relationships: Map<
    string,
    ResourceManagerRelationshipDefinition
  > = new Map<string, ResourceManagerRelationshipDefinition>();

  constructor(
    entities: ResourceManagerEntityDefinition[],
    relationships: ResourceManagerRelationshipDefinition[],
  ) {
    entities
      .map((e) => [e, getResourceMetadata(e.type.prototype)] as const)
      .forEach(([e, { name }]) => this.entities.set(name, e));
    relationships.forEach((r) => this.relationships.set(r.descriptor.name, r));
  }

  public get<TResource extends Entity = Entity>(
    type: Type<TResource>,
  ): ResourceManager<TResource> {
    // TODO: might be a good idea to cache entity managers
    const metadata = getResourceMetadata(type.prototype);

    const entity = this.entities.get(metadata.name) as
      | ResourceManagerEntityDefinition<TResource>
      | undefined;

    if (isNullOrUndefined(entity)) {
      throw new UnknownEntityDefinitionException(
        `Could not find entity definition [${type.name}]`,
      );
    }

    const relationshipsDefinitions = metadata.fields.relationships.reduce(
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
      {} as Record<
        ResourceRelationshipKey<TResource>,
        ResourceManagerRelationshipDefinition
      >,
    );

    return new ResourceManager(this, type, entity, relationshipsDefinitions);
  }
}
