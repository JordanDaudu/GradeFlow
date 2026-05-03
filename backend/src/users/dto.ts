import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ALL_ROLES, Role } from '../auth/dto';

export class CreateUserDto {
  @ApiProperty({ example: 'lecturer@university.ac.il' })
  @IsEmail({}, { message: 'כתובת אימייל לא חוקית' })
  email!: string;

  @ApiProperty({ example: 'ד"ר ישראל ישראלי', description: 'Display name' })
  @IsString({ message: 'שם נדרש' })
  @MinLength(1, { message: 'שם נדרש' })
  name!: string;

  @ApiProperty({ enum: ALL_ROLES, example: 'lecturer', description: 'User role' })
  @IsIn(ALL_ROLES as unknown as string[], { message: 'תפקיד לא חוקי' })
  role!: Role;

  @ApiPropertyOptional({
    example: 'SecurePass1!',
    description: 'Initial password (min 8 chars). If omitted a random password is generated and returned in generatedPassword.',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'הסיסמה חייבת להכיל לפחות 8 תווים' })
  password?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'פרופ׳ כהן' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'שם נדרש' })
  name?: string;

  @ApiPropertyOptional({ enum: ALL_ROLES, example: 'grader' })
  @IsOptional()
  @IsIn(ALL_ROLES as unknown as string[], { message: 'תפקיד לא חוקי' })
  role?: Role;
}
