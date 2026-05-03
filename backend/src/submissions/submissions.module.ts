import { Module } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { AssignmentSubmissionsController } from './assignment-submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  controllers: [SubmissionsController, AssignmentSubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
