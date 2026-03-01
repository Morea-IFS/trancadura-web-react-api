// src/roles/dto/assign-role.dto.ts
import { IsInt } from 'class-validator';

export class AssignRoleDto {
  @IsInt()
  userId: number;

  @IsInt()
  roleId: number;
}
