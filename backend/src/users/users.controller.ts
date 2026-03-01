import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { LinkCardDto } from './dto/link-card.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    const userId = req.user.userId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    const roles = await this.prisma.userRole.findMany({
      where: { userId: id },
      include: { role: true },
    });
    const labs = await this.prisma.userLab.findMany({
      where: { userId: id },
      include: { lab: true },
    });

    return {
      ...user,
      roles,
      labs: labs.map((l) => ({ ...l.lab, isStaff: l.isStaff })),
    };
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Post(':id/link-card')
  @UseGuards(JwtAuthGuard)
  async linkCard(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: { cardId: string },
    @Req() req
  ) {
    // Verifica permissões
    await this.checkAdminOrSelf(req.user.userId, userId);
    
    return this.usersService.linkCardByCardId(userId, dto.cardId);
  }

  @Delete(':id/cards/:approximationId')
  @UseGuards(JwtAuthGuard)
  async unlinkCard(
    @Param('id', ParseIntPipe) userId: number,
    @Param('approximationId', ParseIntPipe) approximationId: number,
    @Req() req
  ) {
    // Verifica permissões
    await this.checkAdminOrSelf(req.user.userId, userId);
    
    return this.usersService.unlinkCard(userId, approximationId);
  }

  @Get(':id/cards')
  getUserCards(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserCards(id);
  }

  private async checkAdminOrSelf(currentUserId: number, targetUserId: number) {
    if (currentUserId === targetUserId) return;
    
    const user = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      include: { roles: { include: { role: true } } }
    });

    const isAdmin = user?.roles.some(r => 
      r.role.name === 'admin' || r.role.name === 'superuser'
    );

    if (!isAdmin) {
      throw new UnauthorizedException(
        'Você não tem permissão para realizar esta ação'
      );
    }
  }
}
