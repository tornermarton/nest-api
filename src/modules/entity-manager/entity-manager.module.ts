import { DynamicModule, FactoryProvider, Module, Type } from '@nestjs/common';

import { EntityManagerService } from './entity-manager.service';
import { getEntityManagerToken } from './utils';
import { getEntityMetadata, getInverseRelationshipDescriptor } from '../../api';
import { isNotNullOrUndefined } from '../../core';
import {
  getEntityRepositoryToken,
  getRelationshipRepositoryToken,
  RelationshipDescriptor,
} from '../../repository';

type EntityManagerModuleOptions = {
  entities: Type[];
  repositoryModule: any;
};

@Module({})
export class EntityManagerModule {
  public static forFeature({
    entities,
    repositoryModule,
  }: EntityManagerModuleOptions): DynamicModule {
    // TODO: optimize this next part since it is very wasteful with doble traversal of first map values
    const entitiesMap: Map<string, Type> = new Map<string, Type>();

    entities.forEach((type) => {
      if (!entitiesMap.has(type.name)) {
        entitiesMap.set(type.name, type);
      }
    });

    const relationshipsMap: Map<string, RelationshipDescriptor<any>> = new Map<
      string,
      RelationshipDescriptor<any>
    >();

    Array.from(entitiesMap.values())
      .map((type) => getEntityMetadata(type.prototype))
      .map(({ fields }) => fields.relationships)
      .flat()
      .map(({ descriptor }) => {
        const inverseDescriptor = getInverseRelationshipDescriptor(descriptor);

        if (isNotNullOrUndefined(inverseDescriptor)) {
          return [descriptor, inverseDescriptor];
        } else {
          return [descriptor];
        }
      })
      .flat()
      .forEach((descriptor) => {
        if (!relationshipsMap.has(descriptor.name)) {
          relationshipsMap.set(descriptor.name, descriptor);
        }
      });

    Array.from(relationshipsMap.values())
      .map(({ related }) => related())
      .forEach((type) => {
        if (!entitiesMap.has(type.name)) {
          entitiesMap.set(type.name, type);
        }
      });

    Array.from(entitiesMap.values())
      .map((type) => getEntityMetadata(type.prototype))
      .map(({ fields }) => fields.relationships)
      .flat()
      .map(({ descriptor }) => {
        const inverseDescriptor = getInverseRelationshipDescriptor(descriptor);

        if (isNotNullOrUndefined(inverseDescriptor)) {
          return [descriptor, inverseDescriptor];
        } else {
          return [descriptor];
        }
      })
      .flat()
      .forEach((descriptor) => {
        if (!relationshipsMap.has(descriptor.name)) {
          relationshipsMap.set(descriptor.name, descriptor);
        }
      });

    // TODO: rename this instead of reassignment
    entities = Array.from(entitiesMap.values());

    const relationships: RelationshipDescriptor<any>[] = Array.from(
      relationshipsMap.values(),
    );

    const entityTokens: string[] = entities.map((type) =>
      getEntityRepositoryToken(type),
    );
    const relationshipTokens: string[] = relationships.map(({ name }) =>
      getRelationshipRepositoryToken(name),
    );

    const serviceProvider: FactoryProvider = {
      provide: EntityManagerService,
      useFactory: (...repositories: any[]) => {
        const entityDefinitions = entities.map((type, index) => ({
          type,
          repository: repositories[index],
        }));

        const relationshipDefinitions = relationships.map(
          (descriptor, index) => ({
            descriptor,
            repository: repositories[entities.length + index],
          }),
        );

        return new EntityManagerService(
          entityDefinitions,
          relationshipDefinitions,
        );
      },
      inject: [...entityTokens, ...relationshipTokens],
    };

    const managerProviders: FactoryProvider[] = entities.map((type) => ({
      provide: getEntityManagerToken(type),
      useFactory: (service: EntityManagerService) => service.get(type),
      inject: [EntityManagerService],
    }));

    return {
      module: EntityManagerModule,
      imports: [repositoryModule.forFeature({ entities, relationships })],
      providers: [serviceProvider, ...managerProviders],
      exports: [repositoryModule, serviceProvider, ...managerProviders],
    };
  }
}
