import { DynamicModule, FactoryProvider, Module, Type } from '@nestjs/common';

import {
  EntityManager,
  EntityManagerRelationshipDefinition,
} from './entity-manager';
import { getEntityManagerToken } from './utils';
import { Entity } from '../../core';
import {
  EntityRepository,
  getEntityRepositoryToken,
  getRelationshipRepositoryToken,
  RelationshipDescriptor,
  RelationshipRepository,
} from '../../repository';

type EntityManagerModuleEntityDefinition<T extends Entity = any> = {
  type: Type<T>;
  relationships: {
    key: Extract<keyof T, string>;
    descriptor: RelationshipDescriptor<string, T>;
  }[];
};

type EntityManagerModuleOptions = {
  entities: EntityManagerModuleEntityDefinition[];
  repositoryModule: DynamicModule;
};

export class EntityManagerModuleEntitiesBuilder {
  private readonly _entities: EntityManagerModuleEntityDefinition[] = [];

  public entity<T extends Entity>(
    definition: EntityManagerModuleEntityDefinition<T>,
  ): EntityManagerModuleEntitiesBuilder {
    this._entities.push(definition);

    return this;
  }

  public build(): EntityManagerModuleEntityDefinition[] {
    return this._entities;
  }
}

@Module({})
export class EntityManagerModule {
  public static forFeature(options: EntityManagerModuleOptions): DynamicModule {
    const providers: FactoryProvider[] = options.entities.map(
      <
        TEntity extends Entity,
        TRelationships extends Extract<keyof TEntity, string>,
      >({
        type,
        relationships,
      }: EntityManagerModuleEntityDefinition<TEntity>) => {
        const provide: string = getEntityManagerToken(type);

        const entityToken: string = getEntityRepositoryToken(type);
        const relationshipTokens: string[] = Object.values(relationships)
          .map(({ descriptor }) => descriptor)
          .map(({ name }) => getRelationshipRepositoryToken(name));

        return {
          provide: provide,
          useFactory: (
            entityRepository: EntityRepository<TEntity>,
            ...relationshipRepositories: RelationshipRepository<any>[]
          ): EntityManager<TEntity, TRelationships> => {
            const relationshipDefinitions = relationships.reduce(
              (acc, { key, descriptor }, idx) => {
                acc[key] = {
                  repository: relationshipRepositories[idx],
                  descriptor: descriptor,
                };

                return acc;
              },
              {} as Record<string, EntityManagerRelationshipDefinition>,
            );

            return new EntityManager({
              entity: { type, repository: entityRepository },
              relationships: relationshipDefinitions,
            });
          },
          inject: [entityToken, ...relationshipTokens],
        };
      },
    );

    return {
      module: EntityManagerModule,
      imports: [options.repositoryModule],
      providers: providers,
      exports: [options.repositoryModule, ...providers],
    };
  }
}
