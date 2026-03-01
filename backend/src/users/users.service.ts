import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { error } from 'console';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('E-mail já está em uso.');
    }

    //const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        //password: hashedPassword,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const dataToUpdate = { ...updateUserDto };

    if (dataToUpdate.password) {
      dataToUpdate.password = await bcrypt.hash(dataToUpdate.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async linkCardToUser(userId: number, approximationId: number) {
    // Verifica se já existe o vínculo
    const existing = await this.prisma.userCard.findUnique({
      where: {
        userId_approximationId: {
          userId,
          approximationId,
        },
      },
    });

    if (existing) {
      return { message: 'Cartão já está vinculado a este usuário.' };
    }

    // Cria o vínculo
    return this.prisma.userCard.create({
      data: {
        userId,
        approximationId,
      },
    });
  }

  async linkCardByCardId(userId: number, cardId: string) {
    // Encontra o cartão pelo cardId
    const card = await this.prisma.approximation.findUnique({
      where: { cardId }
    });

    if (!card) {
      throw new NotFoundException('Cartão não encontrado');
    }

    // Verifica se já existe o vínculo
    const existing = await this.prisma.userCard.findUnique({
      where: {
        userId_approximationId: {
          userId,
          approximationId: card.id
        }
      }
    });

    if (existing) {
      throw new ConflictException('Cartão já está vinculado a este usuário');
    }

    // Cria o vínculo
    return this.prisma.userCard.create({
      data: {
        userId,
        approximationId: card.id
      },
      include: {
        approximation: true
      }
    });
  }

  async unlinkCard(userId: number, approximationId: number) {
    // Remove o vínculo
    await this.prisma.userCard.delete({
      where: {
        userId_approximationId: {
          userId,
          approximationId
        }
      }
    });

    return { success: true };
  }

  async getUserCards(userId: number) {
    return this.prisma.userCard.findMany({
      where: { userId },
      include: {
        approximation: true,
      },
    });
  }


}
