import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class MeasureItem {
  @IsNumber()
  type: number; // 1, 2, 3 ou 4

  @IsNumber()
  value: number; // O valor da leitura
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