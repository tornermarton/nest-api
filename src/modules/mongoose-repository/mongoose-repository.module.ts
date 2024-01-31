import {
  DynamicModule,
  FactoryProvider,
  Global,
  Module,
  Type,
} from '@nestjs/common';
import {
  getConnectionToken,
  MongooseModule,
  SchemaFactory,
} from '@nestjs/mongoose';
import { Connection, Model, Schema, SchemaTypes } from 'mongoose';

import { MongooseEntityRepository } from './mongoose-entity-repository';
import { MongooseRelationship } from './mongoose-relationship';
import { MongooseRelationshipRepository } from './mongoose-relationship-repository';
import { getInverseRelationshipDescriptor } from '../../api';
import { Entity, isNotNullOrUndefined, uuid } from '../../core';
import {
  getEntityRepositoryToken,
  getModelToken,
  getRelationshipRepositoryToken,
  RelationshipDescriptor,
} from '../../repository';

type MongooseConnection = {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  replicaSet: string;
};

type MongooseRepositoryModuleRootOptions = {
  connection: MongooseConnection;
};

type MongooseRepositoryModuleFeatureOptions = {
  entities: Type[];
  relationships: RelationshipDescriptor[];
};

function createEntityModel<T>(type: Type<T>, connection: Connection): Model<T> {
  if (isNotNullOrUndefined(connection.models[type.name])) {
    return connection.models[type.name] as Model<T>;
  }

  const schema: Schema<T> = new Schema()
    .add(SchemaFactory.createForClass(type))
    .add({
      _id: {
        type: SchemaTypes.String,
        required: true,
        default: uuid,
        alias: 'id',
      },
    })
    .set('toObject', { virtuals: true })
    .set('toJSON', { virtuals: true })
    .set('timestamps', true) as Schema<T>;

  return connection.model<T>(type.name, schema);
}

function createRelationshipModel(
  name: string,
  connection: Connection,
): Model<MongooseRelationship> {
  if (isNotNullOrUndefined(connection.models[name])) {
    return connection.models[name] as Model<MongooseRelationship>;
  }

  const schema: Schema<MongooseRelationship> = new Schema()
    .add(SchemaFactory.createForClass(MongooseRelationship))
    .add({
      _id: {
        type: SchemaTypes.String,
        required: true,
        default: uuid,
      },
    })
    .index({ id1: 1, id2: 1 }, { unique: true })
    .set('timestamps', true) as Schema<MongooseRelationship>;

  return connection.model<MongooseRelationship>(name, schema);
}

@Global()
@Module({})
class MongooseRepositoryCoreModule {
  public static forRoot(
    options: MongooseRepositoryModuleRootOptions,
  ): DynamicModule {
    const providers: FactoryProvider[] = [];

    return {
      module: MongooseRepositoryCoreModule,
      imports: [
        MongooseModule.forRoot(
          `mongodb://${options.connection.username}:${options.connection.password}@${options.connection.host}:${options.connection.port}/${options.connection.database}?authMechanism=DEFAULT&authSource=${options.connection.database}&replicaSet=${options.connection.replicaSet}`,
        ),
      ],
      providers: providers,
      exports: [MongooseModule, ...providers],
    };
  }
}

@Module({})
export class MongooseRepositoryModule {
  public static forRoot(
    options: MongooseRepositoryModuleRootOptions,
  ): DynamicModule {
    return {
      module: MongooseRepositoryModule,
      imports: [MongooseRepositoryCoreModule.forRoot(options)],
    };
  }

  public static forFeature(
    options: MongooseRepositoryModuleFeatureOptions,
  ): DynamicModule {
    const entityModelProviders: FactoryProvider[] = options.entities.map(
      <T extends Entity>(type: Type<T>): FactoryProvider => ({
        provide: getModelToken(type.name),
        useFactory: (connection: Connection): Model<T> =>
          createEntityModel(type, connection),
        inject: [getConnectionToken()],
      }),
    );

    const entityRepositoryProviders: FactoryProvider[] = options.entities.map(
      <T extends Entity>(type: Type<T>): FactoryProvider => ({
        provide: getEntityRepositoryToken(type),
        useFactory: (model: Model<T>): MongooseEntityRepository<T> =>
          new MongooseEntityRepository(type, model),
        inject: [getModelToken(type.name)],
      }),
    );

    const relationships = options.relationships ?? [];

    const relationshipModelProviders: FactoryProvider[] = relationships
      .map(({ name }) => name)
      .map(
        (name): FactoryProvider => ({
          provide: getModelToken(name),
          useFactory: (connection: Connection): Model<MongooseRelationship> =>
            createRelationshipModel(name, connection),
          inject: [getConnectionToken()],
        }),
      );

    const relationshipRepositoryProviders: FactoryProvider[] =
      relationships.map(
        <TRelated extends Entity>(
          descriptor: RelationshipDescriptor<TRelated>,
        ): FactoryProvider => {
          const { name } = descriptor;
          const inverseDescriptor: RelationshipDescriptor | null =
            getInverseRelationshipDescriptor(descriptor);

          const provide: string = getRelationshipRepositoryToken(name);

          const inject: string[] = [getConnectionToken(), getModelToken(name)];

          if (isNotNullOrUndefined(inverseDescriptor)) {
            inject.push(getModelToken(inverseDescriptor.name));
          }

          return {
            provide: provide,
            useFactory: (
              connection: Connection,
              model: Model<MongooseRelationship>,
              inverseModel?: Model<MongooseRelationship>,
            ): MongooseRelationshipRepository<TRelated> => {
              const definition = { descriptor, model };

              const inverseDefinition =
                isNotNullOrUndefined(inverseDescriptor) &&
                isNotNullOrUndefined(inverseModel)
                  ? { descriptor: inverseDescriptor, model: inverseModel }
                  : undefined;

              return new MongooseRelationshipRepository(
                connection,
                definition,
                inverseDefinition,
              );
            },
            inject: inject,
          };
        },
      );

    const providers: FactoryProvider[] = [
      ...entityModelProviders,
      ...entityRepositoryProviders,
      ...relationshipModelProviders,
      ...relationshipRepositoryProviders,
    ];

    return {
      module: MongooseRepositoryModule,
      providers: providers,
      exports: providers,
    };
  }
}
