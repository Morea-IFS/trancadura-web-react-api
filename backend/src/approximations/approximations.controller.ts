import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, ConflictException } from '@nestjs/common';
import { ApproximationsService } from './approximations.service';
import { CreateApproximationDto } from './dto/create-approximation.dto';
import { UpdateApproximationDto } from './dto/update-approximation.dto';
import { ApproximationAuthDto } from './dto/approximation-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterCardDto } from './dto/register-card.dto';

@Controller('approximations')
export class ApproximationsController {
  constructor(
    private readonly service: ApproximationsService, 
    private prisma: PrismaService
  ) {}

  @Post()
  create(@Body() data: CreateApproximationDto) {
    return this.service.create(data);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('available')
  async getAvailableCards() {
    const usedCardIds = await this.prisma.userCard.findMany({
      select: {
        approximationId: true,
      },
    });

    const idsInUse = usedCardIds.map(uc => uc.approximationId);

    return this.prisma.approximation.findMany({
      where: {
        id: {
          notIn: idsInUse,
        },
      },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() data: UpdateApproximationDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.service.remove(id);
  }

  @Post('auth')
  async validate(@Body() dto: ApproximationAuthDto) {
    const result = await this.service.validateCard(dto);
    return result;
  }

  @Post('newcard')
  async registerNewCard(@Body() dto: RegisterCardDto) {
    const { hexid, deviceId, userId } = dto;

    // 1) cria/ativa o cartão
    let card = await this.prisma.approximation.findUnique({ where: { cardId: hexid }});
    if (!card) {
      card = await this.prisma.approximation.create({
        data: {
          cardId: hexid,
          permission: true,
          name: `Cartão ${hexid.slice(0,4)}...`
        }
      });
    } else {
      await this.prisma.approximation.update({
        where: { id: card.id },
        data: { permission: true }
      });
    }

    // 2) vincula ao usuário (se não já vinculado)
    const existing = await this.prisma.userCard.findUnique({
      where: { userId_approximationId: { userId, approximationId: card.id } }
    });
    if (!existing) {
      await this.prisma.userCard.create({
        data: { userId, approximationId: card.id }
      });
    }

    return { success: true, cardId: card.id, userId };
  }

  

  @Post('ingest')
  async ingestNewCards(@Body() data: { hexid: string; macaddress: string }) {
    return this.service.ingestCard(data.hexid, data.macaddress);
  }
  
}
