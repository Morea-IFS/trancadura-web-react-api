import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoreDataDto } from './dto/store-data.dto';

@Injectable()
export class MeteringService {
  constructor(private prisma: PrismaService) {}

  // 1. Recebimento de Dados (Igual ao Django views.py -> storeData)
  async storeData(dto: StoreDataDto) {
    const { apiToken, measure } = dto;

    const device = await this.prisma.device.findUnique({ where: { apiToken } });

    if (!device) throw new UnauthorizedException({ message: 'invalid api token.' });
    if (!device.isAuthorized) throw new UnauthorizedException({ message: 'device not authorized.' });
    if (!measure || measure.length === 0) throw new BadRequestException({ message: 'data not received.' });

    for (const item of measure) {
      const value = Number(item.value);
      
      // Lógica de Acumulador do Django
      const lastReading = await this.prisma.meterReading.findFirst({
        where: { deviceId: device.id, type: item.type },
        orderBy: { id: 'desc' }
      });

      let newTotal = value;
      if (lastReading) {
        newTotal = Number(lastReading.total) + value;
      }

      await this.prisma.meterReading.create({
        data: {
          deviceId: device.id,
          type: item.type,
          value: value,
          total: newTotal
        }
      });
    }

    return { message: 'data stored.' };
  }

  // 2. Dados para o Dashboard (Substitui device_chart_data do Django)
  async getChartData(deviceId: number) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Dispositivo não encontrado');

    // Mapeamento de tipos (Baseado no Django)
    let dataTypes = [] as number[];
    if (device.type === 'WATER_METER') dataTypes = [1]; // Volume
    else if (device.type === 'ENERGY_METER') dataTypes = [2, 4]; // kWh, Ampere
    else dataTypes = [1]; // Default

    const response = {};

    for (const type of dataTypes) {
      // Pega os últimos 288 registros (24h se for a cada 5 min)
      const rawData = await this.prisma.meterReading.findMany({
        where: { deviceId, type },
        orderBy: { collectedAt: 'desc' },
        take: 288
      });

      // Reverte para ordem cronológica (Antigo -> Novo)
      const dataEntries = rawData.reverse();
      const values = dataEntries.map(d => d.value);

      // Cálculos estatísticos (Igual ao Django)
      const current = values.length > 0 ? values[values.length - 1] : 0;
      const maxVal = values.length > 0 ? Math.max(...values) : 0;
      const totalSum = values.reduce((a, b) => a + b, 0);

      // Labels amigáveis
      let label = 'Desconhecido';
      if (type === 1) label = 'Volume (L)';
      if (type === 2) label = 'kWh';
      if (type === 4) label = 'Ampere';

      response[label] = {
        labels: dataEntries.map(d => d.collectedAt), // Envia data ISO, frontend formata
        values: values,
        stats: {
          current: Number(current.toFixed(2)),
          max: Number(maxVal.toFixed(2)),
          total: Number(totalSum.toFixed(2))
        }
      };
    }

    return response;
  }
}