import { IsString, IsNotEmpty } from 'class-validator';

export class PinAuthDto {
  @IsString()
  @IsNotEmpty()
  pin: string;

  @IsString()
  @IsNotEmpty()
  macAddress: string;
}