import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateLabDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  deviceId?: number | null;
}
