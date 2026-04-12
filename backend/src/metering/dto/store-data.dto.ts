import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class MeasureItem {
  @IsNumber()
  type: number;

  @IsNumber()
  value: number;
}

export class StoreDataDto {
  @IsString()
  macAddress: string;

  @IsString()
  apiToken: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeasureItem)
  measure: MeasureItem[];
}