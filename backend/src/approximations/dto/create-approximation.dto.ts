import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateApproximationDto {
  @IsNotEmpty()
  @IsString()
  cardId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  permission?: boolean;
}
