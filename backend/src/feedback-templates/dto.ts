import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateFeedbackTemplateDto {
  @ApiProperty({ example: 'חסר הסבר לאלגוריתם', description: 'Short title for quick identification' })
  @IsString({ message: 'כותרת וגוף נדרשים' })
  @MinLength(1, { message: 'כותרת וגוף נדרשים' })
  title!: string;

  @ApiProperty({ example: 'הפתרון נכון אך חסר הסבר מפורט לצעדי האלגוריתם. אנא הוסף פירוט.' })
  @IsString({ message: 'כותרת וגוף נדרשים' })
  @MinLength(1, { message: 'כותרת וגוף נדרשים' })
  body!: string;

  @ApiPropertyOptional({ example: 'style', nullable: true, description: 'Optional grouping category' })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  category?: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true, description: 'Scope template to a specific course (null = global)' })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  courseId?: number | null;
}

export class UpdateFeedbackTemplateDto {
  @ApiPropertyOptional({ example: 'חסר הסבר מפורט' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  category?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  courseId?: number | null;
}
