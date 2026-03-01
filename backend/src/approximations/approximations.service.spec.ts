import { Test, TestingModule } from '@nestjs/testing';
import { ApproximationsService } from './approximations.service';
import { PrismaService } from '../prisma/prisma.service';

const mockApproximation = {
  id: 123,
  cardId: 'card-123',
  name: 'test name',
  permission: true,
  createdAt: new Date(),
};

describe('ApproximationsService', () => {
  let service: ApproximationsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproximationsService,
        {
          provide: PrismaService,
          useValue: {
            approximation: {
              create: jest.fn().mockResolvedValue(mockApproximation),
              findMany: jest.fn().mockResolvedValue([mockApproximation]),
              findUnique: jest.fn().mockResolvedValue(mockApproximation),
              update: jest.fn().mockResolvedValue(mockApproximation),
              delete: jest.fn().mockResolvedValue(mockApproximation),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ApproximationsService>(ApproximationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should call prisma.create', async () => {
    const dto = { cardId: 'card-123' };
    const result = await service.create(dto);
    expect(prisma.approximation.create).toHaveBeenCalledWith({ data: dto });
    expect(result).toEqual(mockApproximation);
  });

  it('findAll should return list', async () => {
    const result = await service.findAll();
    expect(prisma.approximation.findMany).toHaveBeenCalled();
    expect(result).toEqual([mockApproximation]);
  });

  it('findOne should return item', async () => {
    const id = 123;
    const result = await service.findOne(id);
    expect(prisma.approximation.findUnique).toHaveBeenCalledWith({ where: { id } });
    expect(result).toEqual(mockApproximation);
  });

  it('update should call prisma.update', async () => {
    const id = 123;
    const dto = { permission: false };
    const result = await service.update(id, dto);
    expect(prisma.approximation.update).toHaveBeenCalledWith({ where: { id }, data: dto });
    expect(result).toEqual(mockApproximation);
  });

  it('remove should call prisma.delete', async () => {
    const id = 123;
    const result = await service.remove(id);
    expect(prisma.approximation.delete).toHaveBeenCalledWith({ where: { id } });
    expect(result).toEqual(mockApproximation);
  });
});
