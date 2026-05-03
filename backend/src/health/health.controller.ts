import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Controller('healthz')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
