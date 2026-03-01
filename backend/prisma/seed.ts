import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Criação das roles
  const superUserRole = await prisma.role.upsert({
    where: { name: 'superuser' },
    update: {},
    create: { name: 'superuser' },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'staff' },
    update: {},
    create: { name: 'staff' },
  });

  // Criação do usuário admin
  const superUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
    },
  });

  // Relacionar usuário à role superuser (só se ainda não estiver relacionado)
  const existingUserRole = await prisma.userRole.findUnique({
    where: {
      userId_roleId: {
        userId: superUser.id,
        roleId: superUserRole.id,
      },
    },
  });

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: superUser.id,
        roleId: superUserRole.id,
      },
    });
  }

  console.log('✅ Seed finalizado: SuperUser criado com sucesso.');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
