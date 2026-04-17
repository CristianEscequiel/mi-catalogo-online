import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResendVerificationEmailDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
