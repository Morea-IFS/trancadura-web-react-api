import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe, NotFoundException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDeviceIpDto } from './dto/update-device-ip.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { PinAuthDto } from './dto/pin-auth.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService, private prisma: PrismaService) {}

  @Post()
  create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  findAll() {
    return this.devicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.devicesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.devicesService.remove(id);
  }

  @Get(':id/all')
  @UseGuards(JwtAuthGuard)
  async getAllAccess(@Param('id', ParseIntPipe) deviceId: number) {
    const accesses = await this.prisma.userAccess.findMany({
      where: {
        deviceId: deviceId,
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        user: true,
      },
    });

    return accesses;
    }

  @Post('identify')
  async identifyDevice(@Body('macAddress') macAddress: string) {
    if (!macAddress) {
      return { error: 'macAddress é obrigatório' };
    }

    return this.devicesService.identifyDevice(macAddress);
  }

  @Post(':id/roles')
  @UseGuards(JwtAuthGuard)
  async addRole(
    @Param('id', ParseIntPipe) deviceId: number,
    @Body('roleId', ParseIntPipe) roleId: number
  ) {
    return this.prisma.deviceRole.create({
      data: { deviceId, roleId }
    });
  }

  @Delete(':id/roles/:roleId')
  @UseGuards(JwtAuthGuard)
  async removeRole(
    @Param('id', ParseIntPipe) deviceId: number,
    @Param('roleId', ParseIntPipe) roleId: number
  ) {
    return this.prisma.deviceRole.delete({
      where: {
        deviceId_roleId: { deviceId, roleId }
      }
    });
  }

  @Post('ip')
  async setIp(@Body(new ValidationPipe()) body: UpdateDeviceIpDto) {
    return this.devicesService.setDeviceIp(body);
  }

  @Post(':id/hexid')
  @UseGuards(JwtAuthGuard)
  async startCardRegistration(
    @Param('id', ParseIntPipe) deviceId: number,
    @Body('userId', ParseIntPipe) userId: number
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { lab: true }
    });

    if (!device) {
      throw new NotFoundException('Dispositivo não encontrado');
    }

    // Verifica se o usuário tem permissão no laboratório
    const hasAccess = await this.prisma.userLab.findFirst({
      where: {
        userId,
        labId: device.lab?.id
      }
    });

    if (!hasAccess) {
      throw new ForbiddenException('Usuário não tem acesso a este laboratório');
    }

    return {
      message: 'Dispositivo pronto para ler cartão',
      apiToken: device.apiToken,
      deviceIp: device.ipAddress,
      timeout: 15000,
      deviceUuid: device.uuid 
    };
  }

  @Get(':id/roles')
  @UseGuards(JwtAuthGuard)
  async getDeviceRoles(@Param('id', ParseIntPipe) deviceId: number) {
    return this.prisma.deviceRole.findMany({
      where: { deviceId },
      include: { role: true },
    });
  }

  @Post(':id/roles')
  @UseGuards(JwtAuthGuard)
  async addRoleToDevice(
    @Param('id', ParseIntPipe) deviceId: number,
    @Body('roleId', ParseIntPipe) roleId: number
  ) {
    return this.prisma.deviceRole.create({
      data: { deviceId, roleId },
      include: { role: true },
    });
  }

  @Delete(':id/roles/:roleId')
  @UseGuards(JwtAuthGuard)
  async removeRoleFromDevice(
    @Param('id', ParseIntPipe) deviceId: number,
    @Param('roleId', ParseIntPipe) roleId: number
  ) {
    return this.prisma.deviceRole.delete({
      where: {
        deviceId_roleId: { deviceId, roleId }
      }
    });
  }

  @Post('auth/pin')
  async validatePin(@Body() dto: PinAuthDto) {
    return this.devicesService.validatePinAccess(dto);
  }

  
}