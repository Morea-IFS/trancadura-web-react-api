import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignupDto } from './dto/signup.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { EmailService } from './email.service';

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

/** Rate-limit constants */
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 10;
const OTP_EXPIRY_MINUTES = 15;
const SESSION_EXPIRY_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
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

  // ====================================================================
  // PASSWORD RESET FLOW
  // ====================================================================

  /**
   * Step 1 — Solicita recuperação de senha.
   * Sempre retorna uma resposta genérica (não expõe se o email existe).
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericResponse = {
      message: 'Se este email estiver cadastrado, você receberá um código em breve.',
    };

    const user = await this.usersService.findByEmail(email);
    if (!user) return genericResponse;

    // Rate limit: máx 5 códigos por hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.prisma.passwordResetCode.count({
      where: {
        userId: user.id,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentCount >= OTP_MAX_PER_HOUR) {
      // Retorna resposta genérica para não expor tentativa bloqueada
      return genericResponse;
    }

    // Gera código OTP de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Salva no banco
    await this.prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
      },
    });

    // Envia email com timeout de segurança (12s) para não bloquear a resposta
    const emailTimeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Email timeout')), 12000),
    );

    try {
      await Promise.race([
        this.emailService.sendPasswordResetEmail(user.email, user.username, code),
        emailTimeout,
      ]);
    } catch (err) {
      console.error('[PasswordReset] Falha ao enviar email:', err);
    }


    return genericResponse;
  }

  /**
   * Step 2 — Valida o código OTP e cria uma sessão temporária de reset.
   * Retorna um resetToken curto válido por SESSION_EXPIRY_MINUTES.
   */
  async verifyResetCode(
    email: string,
    code: string,
  ): Promise<{ resetToken: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    // Limita tentativas: busca códigos válidos ativos
    const now = new Date();
    const validCodes = await this.prisma.passwordResetCode.findMany({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (validCodes.length === 0) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    // Rate limit de tentativas: máx 10 inválidas por usuário (códigos tentados)
    const recentAttempts = await this.prisma.passwordResetCode.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentAttempts > OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Muitas tentativas. Solicite um novo código.');
    }

    // Verifica o hash do código mais recente
    const latestCode = validCodes[0];
    const isValid = await bcrypt.compare(code, latestCode.codeHash);

    if (!isValid) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    // Marca o código como usado
    await this.prisma.passwordResetCode.update({
      where: { id: latestCode.id },
      data: { used: true },
    });

    // Invalida outros códigos pendentes do mesmo usuário
    await this.prisma.passwordResetCode.updateMany({
      where: {
        userId: user.id,
        used: false,
        id: { not: latestCode.id },
      },
      data: { used: true },
    });

    // Cria sessão temporária de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.passwordResetSession.create({
      data: {
        userId: user.id,
        resetToken,
        expiresAt: sessionExpiresAt,
      },
    });

    return { resetToken };
  }

  /**
   * Step 3 — Redefine a senha usando o token da sessão temporária.
   * Destroi a sessão após uso.
   */
  async resetPassword(
    resetToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const session = await this.prisma.passwordResetSession.findUnique({
      where: { resetToken },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new BadRequestException('Sessão de redefinição inválida ou expirada. Solicite um novo código.');
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualiza a senha do usuário
    await this.prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword },
    });

    // Destroi a sessão usada
    await this.prisma.passwordResetSession.delete({
      where: { id: session.id },
    });

    // Limpa códigos de reset antigos do usuário
    await this.prisma.passwordResetCode.deleteMany({
      where: { userId: session.userId },
    });

    return { message: 'Senha redefinida com sucesso!' };
  }
}
