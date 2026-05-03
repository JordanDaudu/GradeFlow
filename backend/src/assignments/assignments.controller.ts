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
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto';

@ApiTags('Assignments')
@ApiCookieAuth('gradeflow_token')
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get()
  list(@Query('courseId') courseId?: string) {
    const cid = courseId !== undefined && courseId !== '' ? Number(courseId) : undefined;
    return this.assignments.list(cid);
  }

  @Post()
  create(@Body() body: CreateAssignmentDto) {
    return this.assignments.create(body);
  }

  @Get(':assignmentId')
  getOne(@Param('assignmentId', ParseIntPipe) id: number) {
    return this.assignments.getById(id);
  }

  @Patch(':assignmentId')
  update(
    @Param('assignmentId', ParseIntPipe) id: number,
    @Body() body: UpdateAssignmentDto,
  ) {
    return this.assignments.update(id, body);
  }

  @Post(':assignmentId/close')
  close(@Param('assignmentId', ParseIntPipe) id: number) {
    return this.assignments.setClosed(id, true);
  }

  @Post(':assignmentId/reopen')
  reopen(@Param('assignmentId', ParseIntPipe) id: number) {
    return this.assignments.setClosed(id, false);
  }

  @Delete(':assignmentId')
  delete(@Param('assignmentId', ParseIntPipe) id: number) {
    return this.assignments.delete(id);
  }
}
