import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.rolesService.remove(id);
  }

  @Delete('user/:userId/role/:roleId')
  async removeRoleFromUser(
    @Param('userId') userId: number,
    @Param('roleId') roleId: number
  ) {
    return this.rolesService.removeRoleFromUser({ userId, roleId });
  }

  @Delete('user/:userId/role-name/:roleName')
  async removeRoleByNameFromUser(
    @Param('userId') userId: number,
    @Param('roleName') roleName: string
  ) {
    return this.rolesService.removeRoleByNameFromUser({ userId, roleName });
  }

  @Post('assign')
  assignRoleToUser(@Body() dto: AssignRoleDto) {
    return this.rolesService.assignRoleToUser(dto);
  }

}
