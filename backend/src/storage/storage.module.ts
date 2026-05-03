import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { ObjectStorageService } from './object-storage.service';

@Module({
  controllers: [StorageController],
  providers: [ObjectStorageService],
  exports: [ObjectStorageService],
})
export class StorageModule {}
