import { Module } from '@nestjs/common';
import { FeedbackTemplatesController } from './feedback-templates.controller';
import { FeedbackTemplatesService } from './feedback-templates.service';

@Module({
  controllers: [FeedbackTemplatesController],
  providers: [FeedbackTemplatesService],
})
export class FeedbackTemplatesModule {}
