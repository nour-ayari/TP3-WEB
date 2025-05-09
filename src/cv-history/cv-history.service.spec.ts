import { Test, TestingModule } from '@nestjs/testing';
import { CvHistoryService } from './cv-history.service';

describe('CvHistoryService', () => {
  let service: CvHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CvHistoryService],
    }).compile();

    service = module.get<CvHistoryService>(CvHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
