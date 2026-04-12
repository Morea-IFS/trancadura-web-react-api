import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as path from 'path';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private configService: ConfigService) {}

  private get CALENDAR_ID(): string {
    const calendarId = this.configService.get<string>('GOOGLE_CALENDAR_ID');
    
    if (!calendarId) {
       return 'officegenisson@gmail.com'; 
    }
    return calendarId;
  }

  private async getAuth() {
    return new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'google-credentials.json'),
      scopes: ['https://www.googleapis.com/auth/calendar'], 
    });
  }

  async getEventsFromCalendar() {
    this.logger.log(`Conectando ao Google Calendar ID: ${this.CALENDAR_ID}...`);

    try {
      const auth = await this.getAuth();
      const calendar = google.calendar({ version: 'v3', auth });

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
          if (!event.start || !event.end) {
            return null;
          }

          const startString = event.start.dateTime || event.start.date;
          const endString = event.end.dateTime || event.end.date;

          if (!startString || !endString) {
            return null;
          }

          const dateObj = new Date(startString);

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
        .filter((event): event is NonNullable<typeof event> => event !== null);

      return mappedEvents;

    } catch (error: any) {
      this.logger.error('Erro ao buscar agenda do Google', error);
      throw new Error(`Falha Google Calendar: ${error.message}`);
    }
  }

  async createEvent(eventData: {
    summary: string;
    location: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    recurrenceRule: string[];
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