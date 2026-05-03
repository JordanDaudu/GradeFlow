import { Module } from '@nestjs/common';
import { SubmissionsModule } from '../submissions/submissions.module';
import { RubricsController } from './rubrics.controller';
import { RubricsService } from './rubrics.service';

@Module({
  imports: [SubmissionsModule],
  controllers: [RubricsController],
  providers: [RubricsService],
})
export class RubricsModule {}
