import { LoggerService } from '@nestjs/common';
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
