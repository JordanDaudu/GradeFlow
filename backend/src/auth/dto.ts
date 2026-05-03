import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export const ALL_ROLES = ['admin', 'lecturer', 'grader'] as const;
export type Role = (typeof ALL_ROLES)[number];

export class LoginDto {
  @ApiProperty({ example: 'admin@gradeflow.app', description: 'User email address' })
  @IsString({ message: 'אימייל וסיסמה נדרשים' })
  @MinLength(1, { message: 'אימייל וסיסמה נדרשים' })
  email!: string;

  @ApiProperty({ example: 'admin123', description: 'User password' })
  @IsString({ message: 'אימייל וסיסמה נדרשים' })
  @MinLength(1, { message: 'אימייל וסיסמה נדרשים' })
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password for verification' })
  @IsString({ message: 'הסיסמה הנוכחית נדרשת' })
  @MinLength(1, { message: 'הסיסמה הנוכחית נדרשת' })
  currentPassword!: string;

  @ApiProperty({ description: 'New password (minimum 8 characters)', minLength: 8 })
  @IsString({ message: 'הסיסמה החדשה נדרשת' })
  @MinLength(8, { message: 'הסיסמה החדשה חייבת להכיל לפחות 8 תווים' })
  newPassword!: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'user@university.ac.il', description: 'Email address to send the reset link to' })
  @IsEmail({}, { message: 'כתובת אימייל לא חוקית' })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'One-time reset token received via out-of-band channel' })
  @IsString({ message: 'קוד איפוס נדרש' })
  @MinLength(1, { message: 'קוד איפוס נדרש' })
  token!: string;

  @ApiProperty({ description: 'New password (minimum 8 characters)', minLength: 8 })
  @IsString({ message: 'סיסמה חדשה נדרשת' })
  @MinLength(8, { message: 'הסיסמה חייבת להכיל לפחות 8 תווים' })
  newPassword!: string;
}
