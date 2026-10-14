import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { DatabaseService } from './../src/database/database.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const databaseService = {
    query: vi.fn(async (sql: string) => ({
      rows: sql.startsWith('SELECT')
        ? [
            { id: 1, name: 'Adesh' },
            { id: 2, name: 'Rahul' },
          ]
        : [],
    })),
  };

  beforeEach(async () => {
    databaseService.query.mockClear();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(databaseService).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect({
        success: true,
        data: [
          { id: 1, name: 'Adesh' },
          { id: 2, name: 'Rahul' },
        ],
      })
      .expect((response) => {
        const requestTime = response.headers['x-request-time'];
        expect(requestTime).toBeDefined();
        expect(Number.isNaN(Date.parse(requestTime))).toBe(false);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
