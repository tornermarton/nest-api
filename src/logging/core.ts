import { LoggerService } from '@nestjs/common';
import * as morgan from 'morgan';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import * as winston_null from 'winston-null';
import 'winston-daily-rotate-file';

import { DATE_FORMAT, DATETIME_FORMAT } from '../core/constants';

export interface LoggingOptions {
  logDir?: string;
  logToConsole?: boolean;
  debug?: boolean;
}

export function createApplicationLogger(
  name: string,
  options?: LoggingOptions,
): LoggerService {
  const transports = [];

  if (options?.logToConsole) {
    const consoleTransport = new winston.transports.Console({
      handleExceptions: true,
      level: options.debug ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: DATETIME_FORMAT }),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike(name),
      ),
    });

    transports.push(consoleTransport);
  }

  if (options?.logDir) {
    const combinedTransport = new winston.transports.DailyRotateFile({
      dirname: options.logDir,
      filename: 'combined-%DATE%.log',
      datePattern: DATE_FORMAT,
      zippedArchive: true,
      level: options.debug ? 'debug' : 'info',
      json: true,
      handleExceptions: true,
      format: winston.format.combine(
        winston.format.timestamp({ format: DATETIME_FORMAT }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
    });

    transports.push(combinedTransport);
  }

  if (transports.length === 0) {
    transports.push(new winston_null.NullTransport());
  }

  return WinstonModule.createLogger({
    exitOnError: false,
    transports: transports,
  });
}

export function createRequestsLogger(options?: LoggingOptions): any {
  const transports = [];

  if (options?.logToConsole) {
    const consoleTransport = new winston.transports.Console();

    transports.push(consoleTransport);
  }

  if (options?.logDir) {
    const combinedTransport = new winston.transports.DailyRotateFile({
      dirname: options.logDir,
      filename: 'requests-%DATE%.log',
      datePattern: DATE_FORMAT,
      zippedArchive: true,
    });

    transports.push(combinedTransport);
  }

  if (transports.length === 0) {
    transports.push(new winston_null.NullTransport());
  }

  const wrapper = WinstonModule.createLogger({
    exitOnError: false,
    transports: transports,
    level: options.debug ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: DATETIME_FORMAT,
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp}|${level}|${message}`;
      }),
    ),
  });

  return morgan(`:method :url :status :res[content-length] :response-time ms`, {
    stream: {
      write: function (message) {
        wrapper.log(message.replace(/(\r\n|\n|\r)/gm, ''));
      },
    },
  });
}
