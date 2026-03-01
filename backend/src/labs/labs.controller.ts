import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { LabsService } from './labs.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { AddUsersToLabDto } from './dto/add-user-to-lab.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';

@Controller('labs')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superuser', 'staff')
  create(@Body() dto: CreateLabDto) {
    return this.labsService.create(dto);
  }

  @Get()
  findAll() {
    return this.labsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyLabs() {
    //const userId = req.user.userId;
    return this.labsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.labsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superuser', 'staff')
  update(@Param('id') id: number, @Body() dto: UpdateLabDto) {
    return this.labsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superuser', 'staff')
  remove(@Param('id') id: number) {
    return this.labsService.remove(id);
  }

  @Roles('superuser', 'staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('add-users')
  async addUsersToLab(@Body() dto: AddUsersToLabDto, @Req() req) {
    const requesterId = req.user.userId;
    const userRoles = await this.labsService.getUserRoles(requesterId);

    const isSuperUser = userRoles.includes('superuser');
    if (isSuperUser) {
      return this.labsService.addUsersToLab(dto);
    }

    // Staff precisa ser staff no laboratório alvo
    const userLab = await this.labsService.getUserLab(requesterId, dto.labId);
    if (!userLab?.isStaff) {
      throw new ForbiddenException(
        'Você não tem permissão para adicionar usuários neste laboratório',
      );
    }

    return this.labsService.addUsersToLab(dto);
  }

  @Post('remove-users')
  async removeUsersFromLab(
    @Body() dto: { labIds: number[], userId: number }
  ) {
    return this.labsService.removeUsersFromLab(dto);
  }

  @Get(':id/accesses')
  @UseGuards(JwtAuthGuard)
  async getLabAccesses(@Param('id', ParseIntPipe) labId: number ) {
    return this.labsService.getAccessesByLab(labId);
  }

  @Post('unlock/:labId')
  @UseGuards(JwtAuthGuard)
  unlock(@Param('labId') labId: number, @Req() req) {
    const userId = +req.user.userId;
    return this.labsService.unlock(userId, labId);
  }
}
