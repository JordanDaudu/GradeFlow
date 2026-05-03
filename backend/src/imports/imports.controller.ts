import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ImportStudentsDto } from './dto';

@ApiTags('Import')
@ApiCookieAuth('gradeflow_token')
@Controller('import')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @HttpCode(200)
  @Post('students')
  importStudents(@Body() body: ImportStudentsDto) {
    return this.imports.importStudents(body);
  }
}
