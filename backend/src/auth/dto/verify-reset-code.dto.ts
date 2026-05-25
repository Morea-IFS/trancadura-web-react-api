import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyResetCodeDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'O código deve ter exatamente 6 dígitos' })
  code: string;
}
