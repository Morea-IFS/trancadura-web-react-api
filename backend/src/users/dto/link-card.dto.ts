import { IsInt } from 'class-validator';

export class LinkCardDto {
  @IsInt()
  userId: number;

  @IsInt()
  approximationId: number;
}
