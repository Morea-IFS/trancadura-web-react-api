import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApproximationDto } from './dto/create-approximation.dto';
import { UpdateApproximationDto } from './dto/update-approximation.dto';
import { ApproximationAuthDto } from './dto/approximation-auth.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ApproximationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateApproximationDto) {
    const existingCard = await this.prisma.approximation.findUnique({
      where: { cardId: data.cardId },
    });

    if (existingCard) {
      return existingCard;
    }

    return await this.prisma.approximation.create({
      data,
    });
  }


  async findAll() {
    return await this.prisma.approximation.findMany();
  }

  async findOne(id: number) {
    const approximation = await this.prisma.approximation.findUnique({
      where: { id },
    });
    if (!approximation) throw new NotFoundException(`Approximation ${id} not found`);
    return approximation;
  }

  async update(id: number, data: UpdateApproximationDto) {
    await this.findOne(id);
    return await this.prisma.approximation.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return await this.prisma.approximation.delete({
      where: { id },
    });
  }

  async validateCard(dto: ApproximationAuthDto) {
    const { hexid, macaddress } = dto;

    // 1. Verifica o cartão
    const card = await this.prisma.approximation.findUnique({
      where: { cardId: hexid },
    });

    if (!card) {
      await this.prisma.approximation.create({
        data: { cardId: hexid, permission: false },
      });
      return "Unauthorized";
    }

    if (!card.permission) {
      return "Unauthorized";
    }

    // 2. Verifica o dispositivo
    const device = await this.prisma.device.findUnique({
      where: { macAddress: macaddress },
      include: { roles: { include: { role: true } } },
    });

    if (!device) return "Unauthorized";

    // 3. Verifica o usuário vinculado ao cartão
    const userCard = await this.prisma.userCard.findFirst({
      where: { approximationId: card.id },
      include: { user: { include: { roles: { include: { role: true } } } },
    }});

    if (!userCard) return "Unauthorized";

    // 4. Verifica se há interseção de papéis
    const deviceRoles = device.roles.map(dr => dr.role.name);
    const userRoles = userCard.user.roles.map(ur => ur.role.name);

    const hasCommonRole = deviceRoles.some(role => 
      userRoles.includes(role)
    );

    // 5. Registra o acesso
    await this.prisma.userAccess.create({
      data: {
        userId: userCard.user.id,
        deviceId: device.id,
        permission: hasCommonRole,
      },
    });

    if (hasCommonRole) {
      const username = userCard.user.username;
      return `Authorized?first_name=${username}`
    } else {
      return "Unauthorized";
    }
  }

  async ingestCard(hexid: string, macaddress: string) {
    // Verifica se o cartão já existe
    const existingCard = await this.prisma.approximation.findUnique({
      where: { cardId: hexid}
    });
    if (existingCard) {
      throw new Error('Este cartão já está cadastrado no sistema.');
    }

    // Criar o novo cartão (sem usuario associado)
    const newCard = await this.prisma.approximation.create({
      data: {
        cardId: hexid,
        permission: true,
        name: `Novo Cartão (${hexid.substring(0, 4)}...)`,
      }
    });

    console.log(`Cartão ${hexid} ingerido pelo dispositivo ${macaddress}.`);
    return newCard;

  }

}
