import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Response } from 'express';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController extends PrometheusController {
  @Get()
  public override async index(
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    return super.index(response);
  }
}
