import { Logger, LoggerService } from '@nestjs/common';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { getReasonPhrase } from 'http-status-codes';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { isNotNullOrUndefined } from './utils';

export interface LoggingOptions {
  debug?: boolean;
}

export function createApplicationLogger(
  options?: LoggingOptions,
): LoggerService {
  const transport = new winston.transports.Console({
    level: options?.debug ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format((info) => {
        const timestamp: string = new Date().toISOString();
        const { level, message, ...meta } = info;

        const context = meta['context'] ?? 'Application';

        return {
          '@timestamp': timestamp,
          level,
          context,
          message,
          ...meta,
        };
      })(),
      winston.format.json({ deterministic: false }),
    ),
    handleExceptions: true,
  });

  return WinstonModule.createLogger({
    exitOnError: false,
    transports: [transport],
  });
}

export function watchtower(): RequestHandler {
  const logger: Logger = new Logger('Watchtower');

  return (request: Request, response: Response, next: NextFunction): void => {
    const startAt: [number, number] = process.hrtime();
    const { method, originalUrl } = request;

    response.on('finish', () => {
      const { statusCode } = response;

      const message: string = getReasonPhrase(statusCode);

      const contentLength: string | undefined = response.get('content-length');
      const bytes: number = isNotNullOrUndefined(contentLength)
        ? parseInt(contentLength)
        : 0;

      const diff: [number, number] = process.hrtime(startAt);
      const time: number = diff[0] * 1e9 + diff[1];

      logger.log({
        message: message,
        method: method,
        url: originalUrl,
        status: statusCode,
        bytes: bytes,
        time_ns: time,
      });
    });

    next();
  };
}
