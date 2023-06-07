import * as console from 'console';

import { DynamicModule, FactoryProvider, Module } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { ModelDefinition } from '@nestjs/mongoose/dist/interfaces';
import { Connection } from 'mongoose';

import { MongooseRepository } from './repository';
import { getRepositoryToken } from './utils';

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
  models: ModelDefinition[];
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
    const providers: FactoryProvider[] = options.models.map((m) => ({
      provide: getRepositoryToken(m.name),
      // TODO: typing
      useFactory: (connection: Connection): MongooseRepository<unknown> => {
        const model = connection.model(m.name, m.schema, m.collection);

        console.log(getRepositoryToken(m.name), model);

        return new MongooseRepository(model);
      },
      inject: [getConnectionToken()],
    }));

    return {
      module: MongooseRepositoryModule,
      providers: providers,
      exports: providers,
    };
  }
}
