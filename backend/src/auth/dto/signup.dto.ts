import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsOptional,
  ValidateNested,
  IsArray,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class SignupLabDto {
  @IsNotEmpty()
  @Type(() => Number)
  labId: number;

  @IsOptional()
  isStaff: boolean;
}

export class SignupDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  isStaff?: boolean;

  @IsOptional()
  @IsString()
  @Length(4, 6, { message: 'O PIN deve ter entre 4 e 6 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'O PIN deve conter apenas números' })
  accessPin?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignupLabDto)
  labs?: SignupLabDto[];
}
