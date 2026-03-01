import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as path from 'path';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private configService: ConfigService) {}

  // Pega o ID da variável de ambiente ou usa um fallback
  private get CALENDAR_ID(): string {
    const calendarId = this.configService.get<string>('GOOGLE_CALENDAR_ID');
    
    if (!calendarId) {
       return 'officegenisson@gmail.com'; 
    }
    return calendarId;
  }

  // Helper privado para autenticação (Centraliza a config de auth)
  private async getAuth() {
    return new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'google-credentials.json'),
      scopes: ['https://www.googleapis.com/auth/calendar'], 
    });
  }

  // --- Método de Leitura (Sincronização) ---
  async getEventsFromCalendar() {
    this.logger.log(`Conectando ao Google Calendar ID: ${this.CALENDAR_ID}...`);

    try {
      // Usa o helper de auth
      const auth = await this.getAuth();
      const calendar = google.calendar({ version: 'v3', auth });

      // Intervalo de tempo (Próximos 7 dias)
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      const response = await calendar.events.list({
        calendarId: this.CALENDAR_ID,
        timeMin: now.toISOString(),
        timeMax: nextWeek.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items;
      if (!events || events.length === 0) {
        this.logger.warn('Nenhum evento encontrado.');
        return [];
      }

      const mappedEvents = events
        .map((event) => {
          // 1. Verificação Defensiva
          if (!event.start || !event.end) {
            return null;
          }

          // 2. Extração Segura
          const startString = event.start.dateTime || event.start.date;
          const endString = event.end.dateTime || event.end.date;

          if (!startString || !endString) {
            return null;
          }

          const dateObj = new Date(startString);
          
          // Formatação visual
          const timeString = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dateString = dateObj.toISOString().split('T')[0];

          return {
            subject: event.summary || 'Sem Título',
            lab: event.location || 'Sem Local',
            professor: event.description || 'Desconhecido',
            
            startTimeISO: startString,
            endTimeISO: endString,
            
            detectedStartTime: timeString, 
            detectedSlot: 'Google', 
            selectedDate: dateString, 
          };
        })
        // 3. Filtragem de nulos
        .filter((event): event is NonNullable<typeof event> => event !== null);

      return mappedEvents;

    } catch (error: any) {
      this.logger.error('Erro ao buscar agenda do Google', error);
      throw new Error(`Falha Google Calendar: ${error.message}`);
    }
  }

  // --- Método de Criação de Evento ---
  async createEvent(eventData: {
    summary: string;
    location: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    recurrenceRule: string[]; // Ex: ["RRULE:FREQ=WEEKLY;UNTIL=20250630T235959Z"]
  }) {
    try {
      const auth = await this.getAuth();
      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.insert({
        calendarId: this.CALENDAR_ID,
        requestBody: {
          summary: eventData.summary,
          location: eventData.location,
          description: eventData.description,
          start: {
            dateTime: eventData.startDateTime,
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: eventData.endDateTime,
            timeZone: 'America/Sao_Paulo',
          },
          recurrence: eventData.recurrenceRule,
        },
      });
      
      this.logger.log(`Evento criado com sucesso: ${eventData.summary}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Erro ao criar evento ${eventData.summary}`, error);
      return false;
    }
  }
}