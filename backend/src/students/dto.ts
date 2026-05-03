import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({ example: '123456789', description: 'University ID / external identifier (must be unique)' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  externalId!: string;

  @ApiProperty({ example: 'ישראל', description: 'First name' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  firstName!: string;

  @ApiProperty({ example: 'ישראלי', description: 'Last name' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  lastName!: string;

  @ApiPropertyOptional({ example: 'student@university.ac.il', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  email?: string | null;

  @ApiPropertyOptional({ example: '050-0000000', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ example: 'Needs extra time on exams', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  notes?: string | null;
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ example: 'דוד' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'כהן' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'student@university.ac.il', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  email?: string | null;

  @ApiPropertyOptional({ example: '050-1234567', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  notes?: string | null;
}
