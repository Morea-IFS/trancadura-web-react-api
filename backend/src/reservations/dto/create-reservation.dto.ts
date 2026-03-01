import { IsInt, IsISO8601, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReservationDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsInt()
  @IsNotEmpty()
  labId: number;

  @IsISO8601()
  @IsNotEmpty()
  startTime: string;

  @IsISO8601()
  @IsNotEmpty()
  endTime: string;
}