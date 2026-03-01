import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignupDto } from './dto/signup.dto';
import { Response } from 'express';
import { Roles } from './roles/roles.decorator';
import { RolesGuard } from './roles/roles.guard';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    username: string;
    email: string;
    isActive: boolean;
    roles?: string[];
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles('superuser', 'staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('signup')
  async signup(@Body() dto: SignupDto, @Req() req): Promise<any> {
    const requesterId = req.user.userId;
    const userRoles = await this.authService.getUserRoles(requesterId);
    const isSuperUser = userRoles.includes('superuser');

    if (!isSuperUser) {
      if (!dto.labs || dto.labs.length === 0) {
        throw new ForbiddenException(
          'Você precisa informar os laboratórios do novo usuário',
        );
      }

      const allAuthorized = await Promise.all(
        dto.labs.map(async (lab) => {
          const userLab = await this.authService.getUserLab(
            requesterId,
            lab.labId,
          );
          return userLab?.isStaff === true;
        }),
      );

      if (allAuthorized.some((authorized) => !authorized)) {
        throw new ForbiddenException(
          'Você não tem permissão para adicionar usuários em um ou mais laboratórios informados',
        );
      }
    }

    const user = await this.authService.signup(dto);

    if (dto.labs && dto.labs.length > 0) {
      await this.prisma.userLab.createMany({
        data: dto.labs.map((lab) => ({
          userId: user.user.id,
          labId: lab.labId,
          isStaff: lab.isStaff || false,
        })),
        skipDuplicates: true,
      });

      const isStaffAnywhere = dto.labs.some((lab) => lab.isStaff);
      if (isStaffAnywhere) {
        const staffRole = await this.prisma.role.findUnique({
          where: { name: 'staff' },
        });
        
        if (staffRole) {
          await this.prisma.userRole.create({
            data: {
              userId: user.user.id,
              roleId: staffRole.id,
            },
          });
        }
      }
    }

    return {
      ...user,
      roles: isSuperUser ? ['superuser'] : dto.labs?.some(l => l.isStaff) ? ['staff'] : [],
      labs: dto.labs || [],
    };
  }

  @Post('login')
  async login(
    @Body() dto: LoginAuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const result = await this.authService.login(dto);
    
    if (!result.user) {
      throw new ForbiddenException('Credenciais inválidas');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: result.user.id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        labs: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Usuário não encontrado');
    }

    res.cookie('token', result.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    return {
      access_token: result.access_token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        roles: user.roles?.map((r) => r.role.name),
      },
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return { message: 'Logout realizado com sucesso' };
  }
}