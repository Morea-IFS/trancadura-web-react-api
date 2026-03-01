import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { AddUsersToLabDto } from './dto/add-user-to-lab.dto';

@Injectable()
export class LabsService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateLabDto) {
    return this.prisma.lab.create({ data });
  }

  findAll() {
    return this.prisma.lab.findMany({
      include: {
        users: {
          include: {
            user: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });
  }

  findOne(id: number) {
    return this.prisma.lab.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  update(id: number, data: UpdateLabDto) {
    return this.prisma.lab.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.lab.delete({ where: { id } });
  }

  async addUsersToLab(dto: AddUsersToLabDto) {
    const data = dto.users.map((user) => ({
      userId: user.userId,
      labId: dto.labId,
      isStaff: user.isStaff,
    }));

    return this.prisma.userLab.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async getUserRoles(userId: number): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return roles.map((r) => r.role.name);
  }

  async getUserLab(userId: number, labId: number) {
    return this.prisma.userLab.findUnique({
      where: {
        userId_labId: {
          userId,
          labId,
        },
      },
    });
  }

  async unlock(userId: number, labId: number) {
    const lab = await this.prisma.lab.findUnique({
      where: { id: labId },
      include: { device: true },
    });

    if (!lab) throw new NotFoundException('Laboratório não encontrado');
    if (!lab.device) throw new NotFoundException('Nenhum dispositivo vinculado');

    // Checagem de Permissão
    let hasPermission = false;

    // 1. Superuser
    const userRoles = await this.getUserRoles(userId);
    if (userRoles.includes('superuser')) hasPermission = true;

    // 2. Permissão Permanente (Staff/Membro)
    if (!hasPermission) {
      const userInLab = await this.prisma.userLab.findUnique({
        where: { userId_labId: { userId, labId } },
      });
      if (userInLab) hasPermission = true;
    }

    // 3. Permissão Temporária (Reserva) - NOVO
    if (!hasPermission) {
      const now = new Date();
      const reservation = await this.prisma.reservation.findFirst({
        where: {
          userId,
          labId,
          startTime: { lte: now },
          endTime: { gte: now },
        },
      });
      if (reservation) hasPermission = true;
    }

    // Registro e Ação
    const access = await this.prisma.userAccess.create({
      data: {
        userId,
        deviceId: lab.device.id,
        date: new Date(),
        permission: hasPermission,
      },
    });

    if (!hasPermission) {
      throw new ForbiddenException('Sem permissão ou reserva ativa para este laboratório');
    }

    // Envia comando ao ESP32
    try {
      const espUrl = `http://${lab.device.ipAddress}/open?apiToken=${lab.device.apiToken}`;
      console.log(`Enviando comando para: ${espUrl}`);
      await fetch(espUrl);
    } catch (error) {
      console.error(`Falha ao comunicar com dispositivo:`, error);
    }

    return { message: 'Comando enviado.', access };
  }

  async removeUsersFromLab(dto: { labIds: number[], userId: number }) {
    return this.prisma.userLab.deleteMany({
      where: {
        userId: dto.userId,
        labId: { in: dto.labIds }
      }
    });
  }

  async getLabsByUser(userId: number) {
    return this.prisma.lab.findMany({
      where: {
        users: {
          some: { userId },
        },
      },
      include: {
        users: true,
      },
    });
  }

  async getAccessesByLab(labId: number) {
    // Encontra o lab para descobrir qual dispositivo está vinculado a ele
    const lab = await this.prisma.lab.findUnique({
      where: { id: labId },
    });

    // Se o lab não existir ou não tiver dispositivo, retorna uma lista vazia
    if (!lab || !lab.deviceId) {
      return [];
    }

    // Busca todos os acessos do dispositivo vinculado àquele lab
    return this.prisma.userAccess.findMany({
      where: { deviceId: lab.deviceId },
      include: { user: true },
      orderBy: { date: 'desc' },
    });
  }
}
