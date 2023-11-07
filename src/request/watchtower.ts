import { Logger } from '@nestjs/common';
import { Request, Response, NextFunction, RequestHandler } from 'express';

export function watchtower(): RequestHandler {
  const logger: Logger = new Logger('Request');

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
