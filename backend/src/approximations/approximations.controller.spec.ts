import { Test, TestingModule } from '@nestjs/testing';
import { ApproximationsController } from './approximations.controller';

describe('ApproximationsController', () => {
  let controller: ApproximationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApproximationsController],
    }).compile();

    controller = module.get<ApproximationsController>(ApproximationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
