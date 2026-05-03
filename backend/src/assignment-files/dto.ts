import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export const ASSIGNMENT_FILE_TYPES = ['instructions', 'grading_guide', 'reference', 'extra'] as const;

export const MAX_ASSIGNMENT_FILE_BYTES = 50 * 1024 * 1024;
export const DANGEROUS_FILE_EXTENSIONS = [
  'exe',
  'bat',
  'sh',
  'cmd',
  'msi',
  'ps1',
  'scr',
] as const;

const DANGEROUS_EXT_PATTERN = new RegExp(
  `\\.(?:${DANGEROUS_FILE_EXTENSIONS.join('|')})$`,
  'i',
);

export class CreateAssignmentFileDto {
  @ApiProperty({ example: 'instructions.pdf', description: 'Display file name (dangerous extensions are blocked)' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  @Matches(/^(?!.*\.(?:exe|bat|sh|cmd|msi|ps1|scr)$).+$/i, {
    message: 'סוג הקובץ אינו נתמך מטעמי אבטחה',
  })
  name!: string;

  @ApiProperty({ example: 'assignments/5/instructions.pdf', description: 'Object storage path returned by the upload URL endpoint' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  objectPath!: string;

  @ApiProperty({ example: 'application/pdf', description: 'MIME content type' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  contentType!: string;

  @ApiProperty({ example: 512000, description: 'File size in bytes (1 byte – 50 MB)' })
  @Type(() => Number)
  @IsInt({ message: 'שדות חסרים' })
  @Min(1, { message: 'שדות חסרים' })
  @Max(MAX_ASSIGNMENT_FILE_BYTES, {
    message: 'גודל הקובץ חורג מהמגבלה המותרת',
  })
  size!: number;

  @ApiPropertyOptional({
    enum: ASSIGNMENT_FILE_TYPES,
    example: 'instructions',
    description: 'File role classification',
    default: 'extra',
  })
  @IsOptional()
  @IsIn(ASSIGNMENT_FILE_TYPES as unknown as string[])
  fileType?: string;
}

export class UpdateAssignmentFileDto {
  @ApiPropertyOptional({ example: 'updated-instructions.pdf' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ASSIGNMENT_FILE_TYPES, example: 'grading_guide' })
  @IsOptional()
  @IsIn(ASSIGNMENT_FILE_TYPES as unknown as string[])
  fileType?: string;
}

export function isDangerousFileName(name: string): boolean {
  return DANGEROUS_EXT_PATTERN.test(name);
}
