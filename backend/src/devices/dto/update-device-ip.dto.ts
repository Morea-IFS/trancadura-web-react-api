// src/devices/dto/update-device-ip.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateDeviceIpDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  deviceIp: string;

  @IsString()
  @IsNotEmpty()
  apiToken: string;
}
