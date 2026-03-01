import { IsString } from 'class-validator';

export class ApproximationAuthDto {
  @IsString()
  hexid: string;

  @IsString()
  macaddress: string;
}
