import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto, EnrollStudentDto, UpdateCourseDto } from './dto';

@ApiTags('Courses')
@ApiCookieAuth('gradeflow_token')
@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get('courses')
  async list(@Query('includeArchived') includeArchived?: string) {
    const include = String(includeArchived ?? 'true').toLowerCase() !== 'false';
    return this.courses.list(include);
  }

  @Post('courses')
  async create(@Body() body: CreateCourseDto) {
    return this.courses.create(body);
  }

  @Get('courses/:courseId')
  getOne(@Param('courseId', ParseIntPipe) id: number) {
    return this.courses.getById(id);
  }

  @Patch('courses/:courseId')
  update(
    @Param('courseId', ParseIntPipe) id: number,
    @Body() body: UpdateCourseDto,
  ) {
    return this.courses.update(id, body);
  }

  @HttpCode(200)
  @Post('courses/:courseId/archive')
  archive(@Param('courseId', ParseIntPipe) id: number) {
    return this.courses.setArchived(id, true);
  }

  @HttpCode(200)
  @Post('courses/:courseId/unarchive')
  unarchive(@Param('courseId', ParseIntPipe) id: number) {
    return this.courses.setArchived(id, false);
  }

  @Delete('courses/:courseId')
  delete(@Param('courseId', ParseIntPipe) id: number) {
    return this.courses.delete(id);
  }

  @Get('courses/:courseId/students')
  listStudents(@Param('courseId', ParseIntPipe) id: number) {
    return this.courses.listStudents(id);
  }

  @Post('courses/:courseId/students')
  async addStudent(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() body: EnrollStudentDto,
  ) {
    return this.courses.addStudent(courseId, body.studentId);
  }

  @Delete('courses/:courseId/students/:studentId')
  removeStudent(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.courses.removeStudent(courseId, studentId);
  }

  @Get('courses/:courseId/gradebook')
  gradebook(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.courses.gradebook(courseId);
  }
}
