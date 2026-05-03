import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [CoursesModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
