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
import { Entity, isNotNullOrUndefined, uuid } from '../../core';
import {
  getEntityRepositoryToken,
  getModelToken,
  getRelationshipRepositoryToken,
  RelationshipDescriptor,
  RelationshipDescriptorMap,
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
  relationships?: RelationshipDescriptorMap;
};

type MongooseRepositoryModuleFeatureEntityOptions<T = any> = {
  type: Type<T>;
};

type MongooseRepositoryModuleFeatureOptions = {
  entities: MongooseRepositoryModuleFeatureEntityOptions[];
};

function createEntityModel<T>(type: Type<T>, connection: Connection): Model<T> {
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
    const relationships = options.relationships ?? {};

    const relationshipModelProviders: FactoryProvider[] = Object.values(
      relationships,
    )
      .map((o) => o.name)
      .map(
        (name): FactoryProvider => ({
          provide: getModelToken(name),
          useFactory: (connection: Connection): Model<MongooseRelationship> =>
            createRelationshipModel(name, connection),
          inject: [getConnectionToken()],
        }),
      );

    const relationshipRepositoryProviders: FactoryProvider[] = Object.values(
      relationships,
    ).map(
      <TSource extends Entity, TTarget extends Entity>({
        name,
        target,
        inverse,
      }: RelationshipDescriptor<string, TSource, TTarget>): FactoryProvider => {
        const provide: string = getRelationshipRepositoryToken(name);

        const inject: string[] = [getConnectionToken(), getModelToken(name)];

        if (isNotNullOrUndefined(inverse)) {
          inject.push(getModelToken(inverse));
        }

        return {
          provide: provide,
          useFactory: (
            connection: Connection,
            model: Model<MongooseRelationship>,
            inverseModel?: Model<MongooseRelationship>,
          ): MongooseRelationshipRepository<TTarget> =>
            new MongooseRelationshipRepository(
              connection,
              target,
              model,
              inverseModel,
            ),
          inject: inject,
        };
      },
    );

    const providers: FactoryProvider[] = [
      ...relationshipModelProviders,
      ...relationshipRepositoryProviders,
    ];

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
      <T extends Entity>({
        type,
      }: MongooseRepositoryModuleFeatureEntityOptions<T>): FactoryProvider => ({
        provide: getModelToken(type.name),
        useFactory: (connection: Connection): Model<T> =>
          createEntityModel(type, connection),
        inject: [getConnectionToken()],
      }),
    );

    const entityRepositoryProviders: FactoryProvider[] = options.entities.map(
      <T extends Entity>({
        type,
      }: MongooseRepositoryModuleFeatureEntityOptions<T>): FactoryProvider => ({
        provide: getEntityRepositoryToken(type),
        useFactory: (model: Model<T>): MongooseEntityRepository<T> =>
          new MongooseEntityRepository(type, model),
        inject: [getModelToken(type.name)],
      }),
    );

    const providers: FactoryProvider[] = [
      ...entityModelProviders,
      ...entityRepositoryProviders,
    ];

    return {
      module: MongooseRepositoryModule,
      providers: providers,
      exports: providers,
    };
  }
}
