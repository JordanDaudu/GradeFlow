import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { RubricsService } from './rubrics.service';
import { ReplaceRubricDto, ReplaceRubricScoresDto } from './dto';

@ApiTags('Rubrics')
@ApiCookieAuth('gradeflow_token')
@Controller()
export class RubricsController {
  constructor(private readonly rubrics: RubricsService) {}

  @Get('assignments/:assignmentId/rubric')
  list(@Param('assignmentId', ParseIntPipe) id: number) {
    return this.rubrics.listCriteria(id);
  }

  @Put('assignments/:assignmentId/rubric')
  replace(
    @Param('assignmentId', ParseIntPipe) id: number,
    @Body() body: ReplaceRubricDto,
  ) {
    return this.rubrics.replaceCriteria(id, body.criteria ?? []);
  }

  @Get('submissions/:submissionId/rubric-scores')
  listScores(@Param('submissionId', ParseIntPipe) id: number) {
    return this.rubrics.listScores(id);
  }

  @Put('submissions/:submissionId/rubric-scores')
  replaceScores(
    @Param('submissionId', ParseIntPipe) id: number,
    @Body() body: ReplaceRubricScoresDto,
  ) {
    return this.rubrics.replaceScores(id, body.scores ?? []);
  }
}
