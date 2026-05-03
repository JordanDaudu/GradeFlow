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
import { FeedbackTemplatesService } from './feedback-templates.service';
import { CreateFeedbackTemplateDto, UpdateFeedbackTemplateDto } from './dto';

@ApiTags('Feedback Templates')
@ApiCookieAuth('gradeflow_token')
@Controller('feedback-templates')
export class FeedbackTemplatesController {
  constructor(private readonly templates: FeedbackTemplatesService) {}

  @Get()
  list(@Query('courseId') courseId?: string) {
    const cid = courseId !== undefined && courseId !== '' ? Number(courseId) : undefined;
    return this.templates.list(cid);
  }

  @Post()
  create(@Body() body: CreateFeedbackTemplateDto) {
    return this.templates.create(body);
  }

  @Patch(':templateId')
  update(
    @Param('templateId', ParseIntPipe) id: number,
    @Body() body: UpdateFeedbackTemplateDto,
  ) {
    return this.templates.update(id, body);
  }

  @Delete(':templateId')
  delete(@Param('templateId', ParseIntPipe) id: number) {
    return this.templates.delete(id);
  }
}
