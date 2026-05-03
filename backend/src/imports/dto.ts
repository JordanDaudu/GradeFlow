import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class ImportStudentsDto {
  @ApiProperty({
    example: 'externalId,firstName,lastName,email\n123456,ישראל,ישראלי,israel@uni.ac.il',
    description: 'CSV content with header row. Required columns: externalId, firstName, lastName. Optional: email, phone, notes.',
  })
  @IsString({ message: 'CSV ריק' })
  @MinLength(1, { message: 'CSV ריק' })
  csv!: string;

  @ApiPropertyOptional({ example: 1, nullable: true, description: 'Auto-enroll imported students into this course' })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  courseId?: number | null;
}
