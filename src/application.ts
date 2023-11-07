import { HttpServer, LoggerService } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import {
  createApplicationLogger,
  createGlobalApiPrefix,
  queryParser,
} from './core';
import {
  ApiResponseExceptionFilter,
  ApiResponseInterceptor,
  BaseUrl,
} from './response';
import { RequestDefinition, RequestMatcher } from './response/request-matcher';

type ApplicationOptions = {
  title: string;
  name: string;
  version: string;
  baseUrl: BaseUrl;
  exclude?: RequestDefinition[];
  debug: boolean;
};

function createBaseUrlString(baseUrl: BaseUrl): string {
  if (baseUrl.port === 80 || baseUrl.port === 443) {
    return `${baseUrl.scheme}://${baseUrl.host}`;
  }

  return `${baseUrl.scheme}://${baseUrl.host}:${baseUrl.port}`;
}

export async function createApplication(
  module: any,
  { title, name, version, baseUrl, exclude, debug }: ApplicationOptions,
): Promise<NestExpressApplication> {
  const prefix: string = createGlobalApiPrefix(name, version);
  const logger: LoggerService = createApplicationLogger(name, { debug });

  const app: NestExpressApplication =
    await NestFactory.create<NestExpressApplication>(module, { logger });

  app.useLogger(logger);
  app.setGlobalPrefix(prefix, { exclude });

  const server: HttpServer = app.getHttpAdapter();
  const matcher: RequestMatcher = new RequestMatcher(server, exclude ?? []);

  const interceptor: ApiResponseInterceptor = new ApiResponseInterceptor(
    matcher,
    { baseUrl },
  );
  const filter: ApiResponseExceptionFilter = new ApiResponseExceptionFilter(
    server,
    matcher,
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
