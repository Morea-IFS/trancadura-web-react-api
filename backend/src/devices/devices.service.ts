import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { randomUUID } from 'crypto';
import { UpdateDeviceIpDto } from './dto/update-device-ip.dto';
import { PinAuthDto } from './dto/pin-auth.dto';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async create(createDeviceDto: CreateDeviceDto) {
    return this.prisma.device.create({
      data: createDeviceDto,
    });
  }

  async findAll() {
    return this.prisma.device.findMany({
      include: {
        lab: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.device.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateDeviceDto: UpdateDeviceDto) {
    return this.prisma.device.update({
      where: { id },
      data: updateDeviceDto,
    });
  }

  async remove(id: number) {
    return this.prisma.device.delete({
      where: { id },
    });
  }

  async identifyDevice(macAddress: string) {
      const device = await this.prisma.device.findUnique({
        where: { macAddress },
      });
  
      const newApiToken = randomUUID();
  
      if (device) {
        await this.prisma.device.update({
          where: { macAddress },
          data: { apiToken: newApiToken },
        });
  
        return {
          id: device.uuid,
          numericId: device.id,
          api_token: newApiToken,
        };
      }
  
      const newUuid = randomUUID();
  
      const created = await this.prisma.device.create({
        data: {
          uuid: newUuid,
          macAddress,
          apiToken: newApiToken,
        },
      });
  
      return {
        id: newUuid,
        numericId: created.id,
        api_token: newApiToken,
      };
    }

  async setDeviceIp(dto: UpdateDeviceIpDto) {
    const { deviceId, deviceIp, apiToken } = dto;

    const device = await this.prisma.device.findUnique({
      where: { uuid: deviceId },
    });

    if (!device) {
      throw new UnauthorizedException('device does not exist.');
    }

    if (device.apiToken !== apiToken) {
      throw new BadRequestException('api token does not exist.');
    }

    if (!deviceIp) {
      throw new BadRequestException('ip not received.');
    }

    await this.prisma.device.update({
      where: { uuid: deviceId },
      data: {
        ipAddress: deviceIp,
      },
    });

    return { message: 'ip received.' };
  }


  async validatePinAccess(dto: PinAuthDto) {
    const { pin, macAddress } = dto;

    // 1. Validar Dispositivo
    const device = await this.prisma.device.findUnique({
      where: { macAddress },
      include: { 
        roles: { include: { role: true } },
        lab: true // Importante: precisamos saber qual lab é esse
      },
    });

    if (!device) return "Unauthorized";

    // 2. Buscar Usuário pelo PIN
    const user = await this.prisma.user.findUnique({
      where: { accessPin: pin },
      include: { roles: { include: { role: true } } },
    });

    if (!user || !user.isActive) return "Unauthorized";

    // 3. Verificar Permissões
    const deviceRoles = device.roles.map(dr => dr.role.name);
    const userRoles = user.roles.map(ur => ur.role.name);
    const isSuperUser = userRoles.includes('superuser');
    
    // Permissão 1: Roles permanentes (ex: Staff)
    let hasAccess = isSuperUser || deviceRoles.some(role => userRoles.includes(role));

    // Permissão 2: Reserva Ativa (NOVO)
    if (!hasAccess && device.lab) {
      const now = new Date();
      // Busca uma reserva para este usuário, neste laboratório, que englobe o horário atual
      const activeReservation = await this.prisma.reservation.findFirst({
        where: {
          userId: user.id,
          labId: device.lab.id,
          startTime: { lte: now }, // Começou antes de agora
          endTime: { gte: now },   // Termina depois de agora
        },
      });

      if (activeReservation) {
        hasAccess = true;
        console.log(`Acesso concedido por reserva: Usuário ${user.username} no Lab ${device.lab.name}`);
      }
    }

    // 4. Registrar Acesso
    await this.prisma.userAccess.create({
      data: {
        userId: user.id,
        deviceId: device.id,
        permission: hasAccess,
        date: new Date(),
      },
    });

    if (hasAccess) {
      return `Authorized?first_name=${user.username}`;
    } else {
      return "Unauthorized";
    }
  }
}

