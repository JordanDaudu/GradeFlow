import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiCookieAuth('gradeflow_token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary() {
    return this.dashboard.summary();
  }

  @Get('recent-submissions')
  recent() {
    return this.dashboard.recentSubmissions();
  }
}
