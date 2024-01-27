import { HttpServer, LoggerService } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { createApplicationLogger, queryParser } from './core';
import {
  ApiResponseExceptionFilter,
  ApiResponseInterceptor,
  BaseUrl,
} from './response';
import {
  EndpointDefinition,
  EndpointMatcher,
} from './response/endpoint-matcher';

type ApplicationOptions = {
  title: string;
  name: string;
  version: string;
  baseUrl: BaseUrl;
  exclude?: EndpointDefinition[];
  debug: boolean;
};

function createGlobalApiPrefix(name: string, version: string): string {
  return `/api/rest/${name}/v${version}`;
}

function createBaseUrlString(baseUrl: BaseUrl): string {
  if (baseUrl.port === 80 || baseUrl.port === 443) {
    return `${baseUrl.scheme}://${baseUrl.host}`;
  }

  return `${baseUrl.scheme}://${baseUrl.host}:${baseUrl.port}`;
}

export async function createApplication(
  module: unknown,
  { title, name, version, baseUrl, exclude, debug }: ApplicationOptions,
): Promise<NestExpressApplication> {
  const prefix: string = createGlobalApiPrefix(name, version);
  const logger: LoggerService = createApplicationLogger({ debug });

  const app: NestExpressApplication =
    await NestFactory.create<NestExpressApplication>(module, { logger });

  app.useLogger(logger);
  app.setGlobalPrefix(prefix, { exclude });

  const server: HttpServer = app.getHttpAdapter();
  const matcher: EndpointMatcher = new EndpointMatcher(server, exclude ?? []);

  const interceptor: ApiResponseInterceptor = new ApiResponseInterceptor(
    matcher,
    { baseUrl },
  );
  const filter: ApiResponseExceptionFilter = new ApiResponseExceptionFilter(
    server,
    { baseUrl },
  );

  app.set('query parser', queryParser);
  app.useGlobalInterceptors(interceptor);
  app.useGlobalFilters(filter);

  const baseUrlString: string = createBaseUrlString(baseUrl);
  const config: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
    .setTitle(`${title} ${name} API`)
    .setDescription(`${title} ${name} API description`)
    .setVersion(version)
    .addBearerAuth()
    .addServer(`${baseUrlString}${prefix}`)
    .build();

  const document: OpenAPIObject = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
  });

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    swaggerOptions: { showExtensions: true },
  });

  return app;
}
