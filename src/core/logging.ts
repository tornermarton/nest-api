import { Logger, LoggerService } from '@nestjs/common';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { DATETIME_FORMAT } from './constants';

export interface LoggingOptions {
  debug?: boolean;
}

export function createApplicationLogger(
  name: string,
  options?: LoggingOptions,
): LoggerService {
  const consoleTransport: winston.transports.ConsoleTransportInstance =
    new winston.transports.Console({
      level: options?.debug ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: DATETIME_FORMAT }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.logstash(),
      ),
      handleExceptions: true,
    });

  return WinstonModule.createLogger({
    exitOnError: false,
    transports: [consoleTransport],
  });
}

export function watchtower(): RequestHandler {
  const logger: Logger = new Logger('Watchtower');

  return (request: Request, response: Response, next: NextFunction): void => {
    const startAt = process.hrtime();
    const { method, originalUrl } = request;

    response.on('finish', () => {
      const { statusCode } = response;

      const contentLength = response.get('content-length') ?? 0;

      const diff = process.hrtime(startAt);
      const responseTime = diff[0] * 1e9 + diff[1];

      logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength}b ${responseTime}ns`,
      );
    });

    next();
  };
}
