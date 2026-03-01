import { Injectable, ConflictException, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtService } from '@nestjs/jwt';

const pdf = require('pdf-extraction');

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);
  private readonly DAY_MAP: Record<string, number> = {
    'SEG': 1, 'TER': 2, 'QUA': 3, 'QUI': 4, 'SEX': 5, 'SAB': 6, 'DOM': 0
  };
  private readonly TIME_SLOTS_FULL: Record<string, { start: string, end: string }> = {
    '1': { start: '07:30', end: '08:20' },
    '2': { start: '08:20', end: '09:10' },
    '3': { start: '09:10', end: '10:00' },
    '4': { start: '10:10', end: '11:00' },
    '5': { start: '11:00', end: '11:50' },
    '5,5': { start: '11:50', end: '12:40' },
    '6': { start: '13:00', end: '13:50' },
    '7': { start: '13:50', end: '14:40' },
    '8': { start: '14:40', end: '15:30' },
    '9': { start: '15:50', end: '16:40' },
    '10': { start: '16:40', end: '17:30' },
    '11': { start: '19:00', end: '19:50' },
    '12': { start: '19:50', end: '20:40' },
    '13': { start: '20:40', end: '21:30' },
    '14': { start: '21:30', end: '22:20' },
  };

  constructor(
    private prisma: PrismaService,
    private googleService: GoogleCalendarService,
    private jwtService: JwtService
  ) {}

  async create(dto: CreateReservationDto) {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (start >= end) {
      throw new BadRequestException('A data de fim deve ser maior que a de início.');
    }

    const conflict = await this.prisma.reservation.findFirst({
      where: {
        labId: dto.labId,
        OR: [
          { startTime: { lte: start }, endTime: { gt: start } },
          { startTime: { lt: end }, endTime: { gte: end } },
        ],
      },
    });

    if (conflict) {
      throw new ConflictException('Já existe uma reserva para este laboratório neste horário.');
    }

    return this.prisma.reservation.create({
      data: {
        userId: dto.userId,
        labId: dto.labId,
        startTime: start,
        endTime: end,
      },
      include: {
        user: { select: { username: true, email: true } },
        lab: { select: { name: true } },
      }
    });
  }

  async findAll() {
    return this.prisma.reservation.findMany({
      include: {
        user: { select: { username: true } },
        lab: { select: { name: true } },
      },
      orderBy: { startTime: 'desc' }
    });
  }

  async findByUser(userId: number) {
    return this.prisma.reservation.findMany({
      where: { userId },
      include: { lab: true },
      orderBy: { startTime: 'desc' }
    });
  }

  async remove(id: number) {
    return this.prisma.reservation.delete({ where: { id } });
  }

  async syncGoogleCalendar() {
    const rawEvents = await this.googleService.getEventsFromCalendar();
    
    const validatedClasses = [] as any[];
    const userCache = new Map();
    const labCache = new Map();

    for (const event of rawEvents) {
        const labName = event.lab; 
        const professorName = event.professor;

        let dbLab: any = null;
        if (labCache.has(labName)) {
            dbLab = labCache.get(labName);
        } else {
            dbLab = await this.prisma.lab.findFirst({
                where: { name: { contains: labName } } 
            });
            labCache.set(labName, dbLab);
        }

        let dbUser: any = null;
        if (userCache.has(professorName)) {
            dbUser = userCache.get(professorName);
        } else {
            const searchName = professorName.replace('Prof.', '').trim().split(' ')[0];
            
            dbUser = await this.prisma.user.findFirst({
                where: { username: { contains: searchName } }
            });
            userCache.set(professorName, dbUser);
        }

        let status = 'PENDENTE';
        let statusMessage = '';

        if (dbUser && dbLab) {
            status = 'PRONTO';
            statusMessage = 'OK';
        } else if (!dbUser) {
            status = 'ERRO_USER';
            statusMessage = `Prof. '${professorName}' não encontrado`;
        } else if (!dbLab) {
            status = 'ERRO_LAB';
            statusMessage = `Lab '${labName}' não encontrado`;
        }

        validatedClasses.push({
            ...event,
            status,
            statusMessage,
            dbUserId: dbUser?.id,
            dbLabId: dbLab?.id
        });
    }

    return {
        message: 'Sincronização realizada',
        data: validatedClasses
    };
  }

  async createBatch(reservations: CreateReservationDto[]) {
    const results = [] as any[];
    let successCount = 0;

    for (const res of reservations) {
      try {
        const created = await this.create(res);
        results.push({ status: 'SUCCESS', reservation: res, data: created });
        successCount++;
      } catch (error: any) {
        this.logger.warn(`Falha ao criar reserva em lote: ${error.message}`);
        results.push({ 
          status: 'ERROR', 
          message: error.message, 
          reservation: res 
        });
      }
    }

    return {
      totalProcessed: results.length,
      successCount,
      results
    };
  }

  async populateCalendarFromPdf(file: Express.Multer.File, semesterStart: string, semesterEnd: string) {
    this.logger.log(`Populando Calendar via PDF. Início: ${semesterStart}, Fim: ${semesterEnd}`);
    
    if (!semesterStart || !semesterEnd) {
        throw new BadRequestException("Datas de início e fim do semestre são obrigatórias.");
    }

    try {
      const data = await pdf(file.buffer);
      let text = data.text;

      text = text.replace(/LAB\s*\.?\s*\n\s*(INFORMÁTICA|REDES|ROBÓTICA|DADOS)/gi, 'LAB. $1');
      text = text.replace(/(LAB\.[^\n]+)\n\s*(\d{2,}-?COINF[-\w]*)/gi, '$1 $2');
      text = text.replace(/^\s*-\s*$/gm, '');

      const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      let createdCount = 0;
      let currentDay = ''; 

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/^(SEG|TER|QUA|QUI|SEX|SAB|DOM)/i.test(line)) {
            const match = line.match(/^(SEG|TER|QUA|QUI|SEX|SAB|DOM)/i);
            if (match) currentDay = match[0].toUpperCase();
        }

        if (line.toUpperCase().includes('LAB.') || line.toUpperCase().includes('SALA ')) {
          const labName = line;
          const nextLine = lines[i + 1];
          let slotInfo = null as { start: string, end: string } | null;
          
          if (nextLine && /^(\d{1,2}(,\d)?)$/.test(nextLine)) {
             slotInfo = this.TIME_SLOTS_FULL[nextLine];
          }

          const professorName = lines[i - 1] || 'Desconhecido';
          let subject = lines[i - 2] || 'Desconhecido';
          const preSubject = lines[i - 3];
          
          if (preSubject && !preSubject.includes('LAB') && !/^\d+$/.test(preSubject) && preSubject.length > 2) {
             subject = `${preSubject} ${subject}`;
          }

          if (currentDay && slotInfo && labName.length > 4) {
             const firstClassDate = this.calculateFirstClassDate(semesterStart, currentDay);
             const startDateTime = `${firstClassDate}T${slotInfo.start}:00`;
             const endDateTime = `${firstClassDate}T${slotInfo.end}:00`;

             const untilDate = semesterEnd.replace(/-/g, '') + 'T235959Z';
             const rrule = [`RRULE:FREQ=WEEKLY;UNTIL=${untilDate}`];

             const success = await this.googleService.createEvent({
                 summary: subject,
                 description: professorName,
                 location: labName,
                 startDateTime: startDateTime,
                 endDateTime: endDateTime,
                 recurrenceRule: rrule
             });

             if (success) createdCount++;
          }
        }
      }

      return {
        message: 'Processamento concluído',
        eventsCreated: createdCount,
        details: 'Verifique no Google Calendar. As aulas foram criadas como eventos recorrentes.'
      };

    } catch (error) {
      this.logger.error('Erro ao popular calendar', error);
      throw new Error('Falha ao processar PDF.');
    }
  }

  private calculateFirstClassDate(semesterStartISO: string, dayName: string): string {
      const start = new Date(semesterStartISO);
      const targetDay = this.DAY_MAP[dayName.substring(0, 3)]; 
      const currentDay = start.getUTCDay(); 
      
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd < 0) {
          daysToAdd += 7;
      }
      
      start.setDate(start.getDate() + daysToAdd);
      return start.toISOString().split('T')[0];
  }

  async generateAccessKey(reservationId: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { user: true, lab: true }
    });

    if (!reservation) {
      throw new BadRequestException('Reserva não encontrada.');
    }

    const startTimeUnix = Math.floor(reservation.startTime.getTime() / 1000);
    const endTimeUnix = Math.floor(reservation.endTime.getTime() / 1000);

    const payload = {
      sub: reservation.userId,
      lab: reservation.labId,
      resId: reservation.id,
      nbf: startTimeUnix,
      exp: endTimeUnix
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      valid_from: reservation.startTime,
      valid_until: reservation.endTime
    };
  }

  async validateAccessKey(token: string) {
    try {
      const decoded = this.jwtService.verify(token);

      return {
        access: true,
        message: 'ACESSO LIBERADO',
        details: decoded
      };
    } catch (error: any) {
      let reason = 'Token inválido ou corrompido';
      if (error.name === 'TokenExpiredError') reason = 'O horário da aula já acabou.';
      if (error.name === 'NotBeforeError') reason = 'A aula ainda não começou.';

      throw new UnauthorizedException(`ACESSO NEGADO: ${reason}`);
    }
  }
}