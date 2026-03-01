import { Controller, Get, Post, Body, Param, Delete, UseGuards, ParseIntPipe, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @Roles('superuser', 'staff')
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto);
  }

  @Get()
  @Roles('superuser', 'staff')
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get('my')
  findMyReservations(@Req() req) {
    return this.reservationsService.findByUser(req.user.userId);
  }

  @Delete(':id')
  @Roles('superuser', 'staff')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.remove(id);
  }

  @Get('sync-google')
  async syncGoogle() {
    return this.reservationsService.syncGoogleCalendar();
  }

  @Post('batch')
  async createBatch(@Body() reservations: CreateReservationDto[]) {
    if (!Array.isArray(reservations) || reservations.length === 0) {
      throw new BadRequestException('Envie uma lista de reservas válida.');
    }
    return this.reservationsService.createBatch(reservations);
  }

  @Post('populate-calendar')
  @UseInterceptors(FileInterceptor('file'))
  async populateCalendar(
    @UploadedFile() file: Express.Multer.File,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string
  ) {
    if (!file || !startDate || !endDate) {
        throw new BadRequestException('Arquivo, data de início e fim são obrigatórios.');
    }
    return this.reservationsService.populateCalendarFromPdf(file, startDate, endDate);
  }

  @Post(':id/token')
  async generateToken(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.generateAccessKey(id);
  }

  @Post('validate-access')
  async validateToken(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token é obrigatório.');
    }
    return this.reservationsService.validateAccessKey(token);
  }
}