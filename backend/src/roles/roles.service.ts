import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    return this.prisma.role.create({
      data: createRoleDto,
    });
  }

  async findAll() {
    return this.prisma.role.findMany();
  }

  async findOne(id: number) {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    return this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });
  }

  async remove(id: number) {
    return this.prisma.role.delete({
      where: { id },
    });
  }

  async removeRoleFromUser(dto: { userId: number, roleId: number }) {
    try {
      // Remove a relação userRole
      await this.prisma.userRole.delete({
        where: {
          userId_roleId: {
            userId: dto.userId,
            roleId: dto.roleId
          }
        }
      });

      // Remove também o isStaff de todos os labs (opcional)
      await this.prisma.userLab.updateMany({
        where: {
          userId: dto.userId,
          isStaff: true
        },
        data: {
          isStaff: false
        }
      });

      return { success: true };
    } catch (error) {
      console.error("Erro ao remover role do usuário:", error);
      throw new NotFoundException("Relação usuário-role não encontrada");
    }
  }

  async removeRoleByNameFromUser(dto: { userId: number, roleName: string }) {
    // Encontra a role pelo nome
    const role = await this.prisma.role.findFirst({
      where: { name: dto.roleName }
    });

    if (!role) {
      throw new NotFoundException(`Role ${dto.roleName} não encontrada`);
    }

    try {
      // Remove a relação userRole
      await this.prisma.userRole.deleteMany({
        where: {
          userId: dto.userId,
          roleId: role.id
        }
      });

      // Se for a role 'staff', remove também o isStaff dos labs
      if (dto.roleName === 'staff') {
        await this.prisma.userLab.updateMany({
          where: {
            userId: dto.userId,
            isStaff: true
          },
          data: {
            isStaff: false
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Erro ao remover role por nome:", error);
      throw new NotFoundException("Erro ao remover role do usuário");
    }
  }

  // src/roles/roles.service.ts
  async assignRoleToUser(dto: AssignRoleDto) {
    const { userId, roleId } = dto;

    // Confirma se o usuário existe
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Confirma se o papel existe
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Papel (role) não encontrado');

    // Se for a role 'staff', atualiza os labs correspondentes
    if (role.name === 'staff') {
      await this.prisma.userLab.updateMany({
        where: {
          userId: userId,
          isStaff: false
        },
        data: {
          isStaff: true
        }
      });
    }

    // Cria ou ignora se já existir
    return this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {},
      create: {
        userId,
        roleId,
      },
    });
  }

}
