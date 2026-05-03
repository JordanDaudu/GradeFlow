import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { StudentsModule } from './students/students.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AssignmentFilesModule } from './assignment-files/assignment-files.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { RubricsModule } from './rubrics/rubrics.module';
import { FeedbackTemplatesModule } from './feedback-templates/feedback-templates.module';
import { ImportsModule } from './imports/imports.module';
import { ExportsModule } from './exports/exports.module';
import { StorageModule } from './storage/storage.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    StudentsModule,
    AssignmentsModule,
    AssignmentFilesModule,
    SubmissionsModule,
    RubricsModule,
    FeedbackTemplatesModule,
    ImportsModule,
    ExportsModule,
    StorageModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
