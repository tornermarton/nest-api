import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { ApiResponseExceptionFilter } from './api-response-exception.filter';
import { ApiResponseInterceptor } from './api-response.interceptor';

export const API_RESPONSE_INTERCEPTOR_PROVIDER = {
  provide: APP_FILTER,
  useClass: ApiResponseExceptionFilter,
};

export const API_RESPONSE_EXCEPTION_FILTER_PROVIDER = {
  provide: APP_INTERCEPTOR,
  useClass: ApiResponseInterceptor,
};
