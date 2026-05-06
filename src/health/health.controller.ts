import { Controller, Get } from '@nestjs/common';
import { HealthService, AiHealthResponse } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('ai')
  ai(): Promise<AiHealthResponse> {
    return this.healthService.ai();
  }
}
