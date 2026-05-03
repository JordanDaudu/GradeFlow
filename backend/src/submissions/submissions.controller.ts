import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { SubmissionsService } from './submissions.service';
import { AttachSubmissionFileDto, UpdateSubmissionDto } from './dto';

@ApiTags('Submissions')
@ApiCookieAuth('gradeflow_token')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly subs: SubmissionsService) {}

  @Get(':submissionId')
  async getOne(@Param('submissionId', ParseIntPipe) id: number) {
    const d = await this.subs.getDetail(id);
    if (!d) throw new NotFoundException({ error: 'לא נמצא' });
    return d;
  }

  @Patch(':submissionId')
  update(
    @Param('submissionId', ParseIntPipe) id: number,
    @Body() body: UpdateSubmissionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.subs.update(id, body, user?.id);
  }

  @HttpCode(200)
  @Post(':submissionId/file')
  attachFile(
    @Param('submissionId', ParseIntPipe) id: number,
    @Body() body: AttachSubmissionFileDto,
  ) {
    return this.subs.attachFile(id, body);
  }

  @HttpCode(200)
  @Delete(':submissionId/file')
  removeFile(@Param('submissionId', ParseIntPipe) id: number) {
    return this.subs.removeFile(id);
  }
}
