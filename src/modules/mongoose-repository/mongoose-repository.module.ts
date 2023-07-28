import { DynamicModule, FactoryProvider, Module, Type } from '@nestjs/common';
import {
  getConnectionToken,
  MongooseModule,
  SchemaFactory,
} from '@nestjs/mongoose';
import { Connection, Model, Schema } from 'mongoose';

import { MongooseRepository } from './mongoose-repository';
import { getRepositoryToken } from '../../repository';

type MongooseConnection = {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
};

type MongooseRepositoryModuleRootOptions = {
  connection: MongooseConnection;
};

type MongooseRepositoryModuleFeatureOptions = {
  entities: Type[];
};

@Module({})
export class MongooseRepositoryModule {
  public static forRoot(
    options: MongooseRepositoryModuleRootOptions,
  ): DynamicModule {
    return {
      module: MongooseRepositoryModule,
      imports: [
        MongooseModule.forRoot(
          `mongodb://${options.connection.username}:${options.connection.password}@${options.connection.host}:${options.connection.port}/${options.connection.database}?authMechanism=DEFAULT&authSource=${options.connection.database}`,
        ),
      ],
      exports: [MongooseModule],
    };
  }

  public static forFeature(
    options: MongooseRepositoryModuleFeatureOptions,
  ): DynamicModule {
    const providers: FactoryProvider[] = options.entities.map(
      <T>(type: Type<T>): FactoryProvider => ({
        provide: getRepositoryToken(type),
        useFactory: (connection: Connection): MongooseRepository<T> => {
          const schema: Schema<T> = SchemaFactory.createForClass(type);
          const model: Model<T> = connection.model<T>(type.name, schema);

          return new MongooseRepository(type, model);
        },
        inject: [getConnectionToken()],
      }),
    );

    return {
      module: MongooseRepositoryModule,
      providers: providers,
      exports: providers,
    };
  }
}
