// src/labs/dto/create-lab.dto.ts
import { IsOptional, IsInt, IsString } from 'class-validator';

export class CreateLabDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  deviceId?: number;
}
