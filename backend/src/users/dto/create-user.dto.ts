import { IsString, IsBoolean, IsOptional, IsEmail, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Length(4, 6, { message: 'O PIN deve ter entre 4 e 6 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'O PIN deve conter apenas números' })
  accessPin?: string;
}
