// src/labs/dto/add-users-to-lab.dto.ts
import { IsInt, IsArray, ArrayNotEmpty, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class UserLabEntry {
  @IsInt()
  userId: number;

  @IsBoolean()
  isStaff: boolean;
}

export class AddUsersToLabDto {
  @IsInt()
  labId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UserLabEntry)
  users: UserLabEntry[];
}
