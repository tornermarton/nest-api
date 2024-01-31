import { DynamicModule, FactoryProvider, Module, Type } from '@nestjs/common';

import { ResourceManagerService } from './resource-manager.service';
import { getResourceManagerToken } from './utils';
import {
  getResourceMetadata,
  getInverseRelationshipDescriptor,
} from '../../api';
import { isNotNullOrUndefined } from '../../core';
import {
  getEntityRepositoryToken,
  getRelationshipRepositoryToken,
  RelationshipDescriptor,
} from '../../repository';

type DynamicRepositoryModule = {
  forFeature: (options: {
    entities: Type[];
    relationships: RelationshipDescriptor[];
  }) => DynamicModule;
};

type ResourceManagerModuleOptions = {
  resources: Type[];
  repositoryModule: DynamicRepositoryModule;
};

@Module({})
export class ResourceManagerModule {
  public static forFeature({
    resources,
    repositoryModule,
  }: ResourceManagerModuleOptions): DynamicModule {
    // TODO: optimize this next part since it is very wasteful with double traversal of first map values
    const resourcesMap: Map<string, Type> = new Map<string, Type>();

    resources.forEach((type) => {
      if (!resourcesMap.has(type.name)) {
        resourcesMap.set(type.name, type);
      }
    });

    const relationshipsMap: Map<string, RelationshipDescriptor> = new Map<
      string,
      RelationshipDescriptor
    >();

    Array.from(resourcesMap.values())
      .map((type) => getResourceMetadata(type.prototype))
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
        if (!resourcesMap.has(type.name)) {
          resourcesMap.set(type.name, type);
        }
      });

    Array.from(resourcesMap.values())
      .map((type) => getResourceMetadata(type.prototype))
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

    const entities = Array.from(resourcesMap.values());

    const relationships: RelationshipDescriptor[] = Array.from(
      relationshipsMap.values(),
    );

    const entityTokens: string[] = entities.map((type) =>
      getEntityRepositoryToken(type),
    );
    const relationshipTokens: string[] = relationships.map(({ name }) =>
      getRelationshipRepositoryToken(name),
    );

    const serviceProvider: FactoryProvider = {
      provide: ResourceManagerService,
      useFactory: (...repositories) => {
        const entityDefinitions = entities.map((type, index) => ({
          type,
          repository: repositories[index],
        }));

        const relationshipDefinitions = relationships.map(
          (descriptor, index) => ({
            descriptor,
            repository: repositories[entityTokens.length + index],
          }),
        );

        return new ResourceManagerService(
          entityDefinitions,
          relationshipDefinitions,
        );
      },
      inject: [...entityTokens, ...relationshipTokens],
    };

    const managerProviders: FactoryProvider[] = resources.map((type) => ({
      provide: getResourceManagerToken(type),
      useFactory: (service: ResourceManagerService) => service.get(type),
      inject: [ResourceManagerService],
    }));

    return {
      module: ResourceManagerModule,
      imports: [repositoryModule.forFeature({ entities, relationships })],
      providers: [serviceProvider, ...managerProviders],
      exports: [serviceProvider, ...managerProviders],
    };
  }
}
