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

    const card = await this.prisma.approximation.findUnique({
      where: { cardId: hexid },
    });

    if (!card) {
      await this.prisma.approximation.create({
        data: { cardId: hexid, permission: false },
      });
      return "Unauthorized (Sem cartão)";
    }

    if (!card.permission) {
      return "Unauthorized (Sem permisão)";
    }

    const device = await this.prisma.device.findUnique({
      where: { macAddress: macaddress },
    });

    if (!device) return "Unauthorized (Sem device)";

    const userCard = await this.prisma.userCard.findFirst({
      where: { approximationId: card.id },
      include: { user: { include: { roles: { include: { role: true } } } },
    }});

    if (!userCard) return "Unauthorized (Sem usercard)";

    const hasCommonRole = card.permission;

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
      return "Unauthorized (não tem hasC)";
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
