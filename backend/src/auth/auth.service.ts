import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignupDto } from './dto/signup.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    username: string;
    email: string;
    isActive: boolean;
  };
}

interface SignupResponse {
  user: {
    id: number;
    username: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  access_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(username: string, password: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(dto: LoginAuthDto): Promise<LoginResponse> {
    const user =
      (await this.usersService.findByUsername(dto.username)) ||
      (await this.usersService.findByEmail(dto.username));

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const roles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: roles.map((r) => r.role.name),
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
      },
    };
  }

  async signup(dto: SignupDto): Promise<SignupResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      password: hashedPassword,
      isActive: dto.isActive ?? true,
      accessPin: dto.accessPin,
    });

    if (dto.labs?.length) {
      const labIds = dto.labs.map((l) => l.labId);
      const existingLabs = await this.prisma.lab.findMany({
        where: { id: { in: labIds } },
      });

      if (existingLabs.length !== dto.labs.length) {
        const existingLabIds = existingLabs.map((lab) => lab.id);
        const invalidLabIds = labIds.filter((id) => !existingLabIds.includes(id));
        throw new ConflictException(
          `Laboratórios não encontrados: ${invalidLabIds.join(', ')}`,
        );
      }

      await this.prisma.userLab.createMany({
        data: dto.labs.map((lab) => ({
          userId: newUser.id,
          labId: lab.labId,
          isStaff: lab.isStaff ?? false,
        })),
        skipDuplicates: true,
      });
    }

    const payload = {
      sub: newUser.id,
      username: newUser.username,
      email: newUser.email,
    };

    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
      access_token: this.jwtService.sign(payload),
    };
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
}