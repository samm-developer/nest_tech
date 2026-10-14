import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { DatabaseService } from './../src/database/database.service.js';

interface TestUser {
  id: number;
  name: string;
  username: string | null;
  password_hash: string | null;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const users: TestUser[] = [];
  const databaseService = {
    query: vi.fn(async (sql: string, values: unknown[] = []) => {
      if (sql.startsWith('INSERT INTO users')) {
        const username = String(values[1]);
        if (
          users.some(
            (user) => user.username?.toLowerCase() === username.toLowerCase(),
          )
        ) {
          throw Object.assign(new Error('Duplicate username'), {
            code: '23505',
          });
        }

        const user: TestUser = {
          id: users.length + 1,
          name: String(values[0]),
          username,
          password_hash: String(values[2]),
        };
        users.push(user);
        return {
          rows: [{ id: user.id, name: user.name, username: user.username }],
        };
      }

      if (sql.includes('WHERE LOWER(username)')) {
        const user = users.find(
          (row) =>
            row.username?.toLowerCase() === String(values[0]).toLowerCase(),
        );
        return { rows: user ? [user] : [] };
      }

      if (sql.includes('ORDER BY id')) {
        return {
          rows: users.map(({ id, name, username }) => ({
            id,
            name,
            username,
          })),
        };
      }

      return { rows: [] };
    }),
  };

  beforeEach(async () => {
    users.length = 0;
    users.push(
      { id: 1, name: 'Adesh', username: null, password_hash: null },
      { id: 2, name: 'Rahul', username: null, password_hash: null },
    );
    databaseService.query.mockClear();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(databaseService)
      .compile();

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
          { id: 1, name: 'Adesh', username: null },
          { id: 2, name: 'Rahul', username: null },
        ],
      })
      .expect((response) => {
        const requestTime = response.headers['x-request-time'];
        expect(requestTime).toBeDefined();
        expect(Number.isNaN(Date.parse(requestTime))).toBe(false);
      });
  });

  it('registers users and allows them to log in', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'New User',
        username: 'new.user',
        password: 'strong-password-123',
      })
      .expect(201);

    expect(registerResponse.body).toEqual({
      success: true,
      data: { id: 3, name: 'New User', username: 'new.user' },
    });
    expect(registerResponse.body.data.password).toBeUndefined();
    expect(registerResponse.body.data.password_hash).toBeUndefined();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'NEW.USER', password: 'strong-password-123' })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.data.user).toEqual({
      id: 3,
      name: 'New User',
      username: 'new.user',
    });

    await request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect((response) => {
        expect(response.body.data).toContainEqual({
          id: 3,
          name: 'New User',
          username: 'new.user',
        });
      });
  });

  it('rejects duplicate usernames regardless of case', async () => {
    const payload = {
      name: 'First User',
      username: 'same-name',
      password: 'strong-password-123',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...payload, username: 'SAME-NAME' })
      .expect(409);
  });

  it('rejects incorrect login credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'New User',
        username: 'new.user',
        password: 'strong-password-123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'new.user', password: 'wrong-password' })
      .expect(401);
  });

  it('rejects invalid registration data', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: '', username: 'new user', password: 'short' })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
