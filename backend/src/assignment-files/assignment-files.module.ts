import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { AssignmentFilesController } from './assignment-files.controller';
import { AssignmentFilesPreviewController } from './assignment-files-preview.controller';
import { AssignmentFilesService } from './assignment-files.service';

@Module({
  imports: [StorageModule, AuthModule],
  controllers: [AssignmentFilesController, AssignmentFilesPreviewController],
  providers: [AssignmentFilesService],
})
export class AssignmentFilesModule {}
