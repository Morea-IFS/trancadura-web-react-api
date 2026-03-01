import { PartialType } from '@nestjs/mapped-types';
import { CreateApproximationDto } from './create-approximation.dto';

export class UpdateApproximationDto extends PartialType(CreateApproximationDto) {}
