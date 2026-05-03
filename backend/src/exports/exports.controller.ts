import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Header, Param, ParseIntPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ExportsService } from './exports.service';

@ApiTags('Export')
@ApiCookieAuth('gradeflow_token')
@Controller('export')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get('gradebook/:courseId')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async gradebook(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { filename, csv } = await this.exports.gradebookCsv(courseId);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  @Get('assignment/:assignmentId')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async assignment(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { filename, csv } = await this.exports.assignmentCsv(assignmentId);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }
}
