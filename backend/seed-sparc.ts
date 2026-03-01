// backend/seed-sparc.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed do Sparc...');

  // 1. Criar (ou buscar) um Dispositivo de Teste para ÁGUA
  const waterDevice = await prisma.device.upsert({
    where: { macAddress: 'AA:BB:CC:DD:EE:FF' },
    update: {},
    create: {
      macAddress: 'AA:BB:CC:DD:EE:FF',
      apiToken: 'TOKEN-AGUA-123',
      name: 'Medidor de Água (Teste)',
      type: 'WATER_METER',
      isAuthorized: true, // Importante: tem que estar autorizado!
      location: 'Bloco A',
      section: 'Banheiros',
      ipAddress: '192.168.1.50'
    },
  });

  // 2. Criar (ou buscar) um Dispositivo de Teste para ENERGIA
  const energyDevice = await prisma.device.upsert({
    where: { macAddress: '11:22:33:44:55:66' },
    update: {},
    create: {
      macAddress: '11:22:33:44:55:66',
      apiToken: 'TOKEN-ENERGIA-123',
      name: 'Medidor de Energia (Teste)',
      type: 'ENERGY_METER',
      isAuthorized: true,
      location: 'Bloco B',
      section: 'Laboratórios',
      ipAddress: '192.168.1.51'
    },
  });

  console.log(`✅ Dispositivos criados/encontrados:`);
  console.log(`   - Água ID: ${waterDevice.id}`);
  console.log(`   - Energia ID: ${energyDevice.id}`);

  // 3. Gerar dados para as últimas 24 horas (288 leituras de 5 em 5 min)
  const now = new Date();
  const readingsCount = 288;
  
  // Limpa dados antigos desses devices para não duplicar no gráfico de teste
  await prisma.meterReading.deleteMany({ where: { deviceId: { in: [waterDevice.id, energyDevice.id] } } });

  console.log('🔄 Gerando histórico de 24h...');

  const waterReadings = [] as any[];
  const energyReadings = [] as any[];
  let totalWater = 1000; // Começa com 1000 litros
  let totalEnergy = 500; // Começa com 500 kWh

  for (let i = readingsCount; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000); // Subtrai 5 minutos * i

    // Simula consumo variável (Senóide + Random para parecer real)
    const waterFlow = Math.max(0, 10 + Math.sin(i / 10) * 5 + Math.random() * 2); // Litros por minuto
    const energyKwh = Math.max(0, 2 + Math.cos(i / 15) * 1 + Math.random() * 0.5); // kWh instantâneo

    totalWater += waterFlow;
    totalEnergy += energyKwh;

    // Push para inserir depois
    waterReadings.push({
      deviceId: waterDevice.id,
      type: 1, // 1 = Volume
      value: parseFloat(waterFlow.toFixed(2)),
      total: parseFloat(totalWater.toFixed(2)),
      collectedAt: time,
    });

    energyReadings.push({
      deviceId: energyDevice.id,
      type: 2, // 2 = kWh
      value: parseFloat(energyKwh.toFixed(2)),
      total: parseFloat(totalEnergy.toFixed(2)),
      collectedAt: time,
    });
  }

  // Inserção em massa (CreateMany é muito mais rápido)
  await prisma.meterReading.createMany({ data: waterReadings });
  await prisma.meterReading.createMany({ data: energyReadings });

  console.log(`🚀 Inseridos ${waterReadings.length} registros de Água.`);
  console.log(`🚀 Inseridos ${energyReadings.length} registros de Energia.`);
  console.log('✅ Concluído! Abra o Dashboard para ver os gráficos cheios.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());