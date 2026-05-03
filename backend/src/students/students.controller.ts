import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto';

@ApiTags('Students')
@ApiCookieAuth('gradeflow_token')
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.students.list(String(q ?? '').trim());
  }

  @Post()
  create(@Body() body: CreateStudentDto) {
    return this.students.create(body);
  }

  @Get(':studentId')
  getOne(@Param('studentId', ParseIntPipe) id: number) {
    return this.students.getById(id);
  }

  @Patch(':studentId')
  update(@Param('studentId', ParseIntPipe) id: number, @Body() body: UpdateStudentDto) {
    return this.students.update(id, body);
  }

  @Get(':studentId/history')
  history(@Param('studentId', ParseIntPipe) id: number) {
    return this.students.history(id);
  }

  @Delete(':studentId')
  delete(@Param('studentId', ParseIntPipe) id: number) {
    return this.students.delete(id);
  }
}
