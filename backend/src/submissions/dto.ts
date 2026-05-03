import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const SUBMISSION_STATUSES = [
  'pending',
  'in_progress',
  'needs_review',
  'graded',
  'returned',
  'missing',
] as const;

export class UpdateSubmissionDto {
  @ApiPropertyOptional({
    enum: SUBMISSION_STATUSES,
    example: 'graded',
    description: 'Grading workflow status',
  })
  @IsOptional()
  @IsIn(SUBMISSION_STATUSES as unknown as string[], { message: 'סטטוס לא חוקי' })
  status?: string;

  @ApiPropertyOptional({ example: 87.5, nullable: true, description: 'Numeric score (null to clear)' })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  score?: number | null;

  @ApiPropertyOptional({ example: 'עבודה טובה! שים לב לסיבוכיות.', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  feedback?: string | null;

  @ApiPropertyOptional({ example: 'Copied from student #3', nullable: true, description: 'Internal notes (not visible to student)' })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  privateNotes?: string | null;

  @ApiPropertyOptional({ example: false, description: 'Flag for suspected plagiarism' })
  @IsOptional()
  @IsBoolean()
  originalityFlag?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  submittedLate?: boolean;

  @ApiPropertyOptional({ example: '2025-06-10T14:30:00.000Z', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  submittedAt?: string | null;
}

export class AttachSubmissionFileDto {
  @ApiProperty({ example: 'submissions/42/homework.pdf', description: 'Object storage path returned by the upload URL endpoint' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  objectPath!: string;

  @ApiProperty({ example: 'homework.pdf' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  contentType!: string;

  @ApiProperty({ example: 204800, description: 'File size in bytes' })
  @Type(() => Number)
  @IsInt({ message: 'שדות חסרים' })
  fileSize!: number;
}

export class BulkUpdateSubmissionsDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3], description: 'List of submission IDs to update' })
  @IsArray({ message: 'submissionIds נדרש' })
  @ArrayNotEmpty({ message: 'submissionIds נדרש' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'submissionIds נדרש' })
  submissionIds!: number[];

  @ApiProperty({ enum: SUBMISSION_STATUSES, example: 'returned' })
  @IsIn(SUBMISSION_STATUSES as unknown as string[], { message: 'סטטוס לא חוקי' })
  status!: string;
}
