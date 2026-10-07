import { Controller, Get } from '@nestjs/common';

// Endpoint liviano para el healthcheck de Docker: solo confirma que el proceso responde HTTP.
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
