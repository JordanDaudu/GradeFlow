import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { BulkUpdateSubmissionsDto } from './dto';

@Controller('assignments')
export class AssignmentSubmissionsController {
  constructor(private readonly subs: SubmissionsService) {}

  @Get(':assignmentId/submissions')
  list(@Param('assignmentId', ParseIntPipe) id: number) {
    return this.subs.listForAssignment(id);
  }

  @Patch(':assignmentId/submissions')
  bulk(
    @Param('assignmentId', ParseIntPipe) id: number,
    @Body() body: BulkUpdateSubmissionsDto,
  ) {
    return this.subs.bulkUpdateStatus(id, body.submissionIds, body.status);
  }
}
