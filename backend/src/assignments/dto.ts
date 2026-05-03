import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ example: 1, description: 'ID of the course this assignment belongs to' })
  @Type(() => Number)
  @IsInt({ message: 'שדות חסרים' })
  courseId!: number;

  @ApiProperty({ example: 'תרגיל בית 1', description: 'Assignment title' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  name!: string;

  @ApiPropertyOptional({ example: 'פתרו את שאלות 1-5 מהחוברת', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    example: '2025-06-15T23:59:00.000Z',
    description: 'ISO 8601 due date/time',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  dueDate?: string | null;

  @ApiPropertyOptional({ example: 100, description: 'Maximum achievable score', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxScore?: number;

  @ApiPropertyOptional({ example: 10, description: 'Weight as percentage of final grade', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 'numeric', description: 'Grading scale type', default: 'numeric' })
  @IsOptional()
  @IsString()
  gradingScale?: string;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional({ example: 'תרגיל בית 2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: '2025-07-01T23:59:00.000Z', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  dueDate?: string | null;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxScore?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 'numeric' })
  @IsOptional()
  @IsString()
  gradingScale?: string;
}
