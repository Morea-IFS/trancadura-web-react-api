import { IsString, IsNumber } from 'class-validator';

export class RegisterCardDto {
  @IsString()
  hexid: string;

  @IsNumber()
  userId: number;

  @IsNumber()
  deviceId: number;
}