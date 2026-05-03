import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class RubricCriterionDto {
  @ApiProperty({ example: 'נכונות', description: 'Criterion name' })
  @IsString({ message: 'שדות חסרים' })
  @MinLength(1, { message: 'שדות חסרים' })
  name!: string;

  @ApiPropertyOptional({ example: 'הפתרון נכון ומלא', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  description?: string | null;

  @ApiProperty({ example: 50, description: 'Maximum points for this criterion' })
  @Type(() => Number)
  @IsNumber({}, { message: 'שדות חסרים' })
  maxPoints!: number;

  @ApiPropertyOptional({ example: 1, description: 'Criterion weight multiplier', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 0, description: 'Display order (0-based)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderIndex?: number;
}

export class ReplaceRubricDto {
  @ApiProperty({ type: [RubricCriterionDto], description: 'Full list of criteria — replaces existing rubric' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  criteria!: RubricCriterionDto[];
}

export class RubricScoreDto {
  @ApiProperty({ example: 1, description: 'Rubric criterion ID' })
  @Type(() => Number)
  @IsInt({ message: 'שדות חסרים' })
  criterionId!: number;

  @ApiProperty({ example: 45, description: 'Points awarded (must not exceed criterion maxPoints)' })
  @Type(() => Number)
  @IsNumber({}, { message: 'שדות חסרים' })
  points!: number;

  @ApiPropertyOptional({ example: 'חסר הסבר לגבי סיבוכיות', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  comment?: string | null;
}

export class ReplaceRubricScoresDto {
  @ApiProperty({ type: [RubricScoreDto], description: 'Full list of scores — replaces all existing scores for this submission' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricScoreDto)
  scores!: RubricScoreDto[];
}
