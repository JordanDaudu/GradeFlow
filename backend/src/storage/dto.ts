import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, MinLength } from 'class-validator';

export class RequestUploadUrlDto {
  @ApiProperty({ example: 'homework1.pdf', description: 'Original file name (used for Content-Disposition)' })
  @IsString({ message: 'Missing or invalid required fields' })
  @MinLength(1, { message: 'Missing or invalid required fields' })
  name!: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes (max 50 MB)' })
  @Type(() => Number)
  @IsInt({ message: 'Missing or invalid required fields' })
  size!: number;

  @ApiProperty({ example: 'application/pdf', description: 'MIME type — currently only application/pdf is accepted' })
  @IsString({ message: 'Missing or invalid required fields' })
  @MinLength(1, { message: 'Missing or invalid required fields' })
  contentType!: string;
}
