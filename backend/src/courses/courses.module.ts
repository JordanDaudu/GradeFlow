import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { EnrollmentsService } from './enrollments.service';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, EnrollmentsService],
  exports: [CoursesService, EnrollmentsService],
})
export class CoursesModule {}
