import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'CS-101', description: 'Unique course code within the same term+year' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  code!: string;

  @ApiProperty({ example: 'מבנה נתונים ואלגוריתמים', description: 'Full course name' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  name!: string;

  @ApiProperty({ example: 'אביב', description: 'Academic term (e.g. אביב, קיץ, חורף)' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  term!: string;

  @ApiProperty({ example: 2025, description: 'Academic year' })
  @Type(() => Number)
  @IsInt({ message: 'שדות חסרים' })
  year!: number;
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'CS-101' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'מבנה נתונים ואלגוריתמים' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'קיץ' })
  @IsOptional()
  @IsString()
  term?: string;

  @ApiPropertyOptional({ example: 2025 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ example: false, description: 'Set to true to archive the course' })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

export class EnrollStudentDto {
  @ApiProperty({ example: 1, description: 'ID of the student to enroll' })
  @Type(() => Number)
  @IsInt({ message: 'studentId נדרש' })
  studentId!: number;
}
