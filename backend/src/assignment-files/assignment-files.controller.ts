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
} from '@nestjs/common';
import { AssignmentFilesService } from './assignment-files.service';
import { CreateAssignmentFileDto, UpdateAssignmentFileDto } from './dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { CourseAccessService } from '../auth/course-access.service';

@ApiTags('Assignment Files')
@ApiCookieAuth('gradeflow_token')
@Controller('assignments')
export class AssignmentFilesController {
  constructor(
    private readonly files: AssignmentFilesService,
    private readonly access: CourseAccessService,
  ) {}

  @Get(':assignmentId/files')
  async list(
    @Param('assignmentId', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.access.assertCanAccessAssignment(user, id);
    return this.files.list(id);
  }

  @Post(':assignmentId/files')
  async create(
    @Param('assignmentId', ParseIntPipe) id: number,
    @Body() body: CreateAssignmentFileDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.access.assertCanAccessAssignment(user, id);
    return this.files.create(id, body);
  }

  @Patch(':assignmentId/files/:fileId')
  async update(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Body() body: UpdateAssignmentFileDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.access.loadAssignmentFileForUser(user, fileId, assignmentId);
    return this.files.update(fileId, body);
  }

  @Delete(':assignmentId/files/:fileId')
  async delete(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.access.loadAssignmentFileForUser(user, fileId, assignmentId);
    return this.files.delete(fileId);
  }
}
