import { IsString, IsNumber } from 'class-validator';

export class RegisterCardDto {
  @IsString()
  hexid: string;

  @IsNumber()
  userId: number; // Adicionei userId para vincular automaticamente

  @IsNumber()
  deviceId: number; // Para registro de qual dispositivo fez o cadastro
}