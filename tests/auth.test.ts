import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { isValidIANATimezone } from '@/server/domain/timezone';
import { InMemoryRateLimiter } from '@/server/lib/rate-limit';
import { POST as registerHandler } from '@app/api/auth/register/route';
import { POST as loginHandler } from '@app/api/auth/login/route';
import { GET as getMeHandler, PATCH as patchMeHandler } from '@app/api/me/route';
import { prisma } from '@/server/lib/prisma';

beforeAll(async () => {
  await prisma.user.updateMany({
    where: { email: 'maya@example.com' },
    data: { name: 'Maya Chen', timezone: 'America/New_York' },
  });
});

afterAll(async () => {
  await prisma.user.updateMany({
    where: { email: 'maya@example.com' },
    data: { name: 'Maya Chen', timezone: 'America/New_York' },
  });
});

describe('Domain: IANA Timezone Validation', () => {
  it('accepts valid IANA timezones', () => {
    expect(isValidIANATimezone('UTC')).toBe(true);
    expect(isValidIANATimezone('America/New_York')).toBe(true);
    expect(isValidIANATimezone('Europe/London')).toBe(true);
    expect(isValidIANATimezone('Asia/Tokyo')).toBe(true);
    expect(isValidIANATimezone('Asia/Kolkata')).toBe(true);
  });

  it('rejects invalid timezones', () => {
    expect(isValidIANATimezone('Invalid/Timezone')).toBe(false);
    expect(isValidIANATimezone('Moon/Base_Alpha')).toBe(false);
    expect(isValidIANATimezone('')).toBe(false);
    expect(isValidIANATimezone('   ')).toBe(false);
    expect(isValidIANATimezone('GMT+5')).toBe(false);
  });
});

describe('Rate Limiter', () => {
  it('enforces request limits within the time window', async () => {
    const limiter = new InMemoryRateLimiter();
    const key = 'test-ip';

    // Allow 3 requests
    const r1 = await limiter.check(key, 3, 10000);
    const r2 = await limiter.check(key, 3, 10000);
    const r3 = await limiter.check(key, 3, 10000);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request should be blocked
    const r4 = await limiter.check(key, 3, 10000);
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
  });
});

describe('POST /api/auth/register', () => {
  const uniqueId = Date.now();
  const testEmail = `test_${uniqueId}@example.com`;

  it('fails when email is invalid', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'password123',
        name: 'Test User',
        timezone: 'UTC',
      }),
    });

    const res = await registerHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toContain('email');
  });

  it('fails when password is shorter than 8 characters', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'valid@example.com',
        password: 'short',
        name: 'Test User',
        timezone: 'UTC',
      }),
    });

    const res = await registerHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toContain('at least 8 characters');
  });

  it('fails when timezone is not a valid IANA timezone', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'valid@example.com',
        password: 'password123',
        name: 'Test User',
        timezone: 'Not_A_Real_Timezone',
      }),
    });

    const res = await registerHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toContain('timezone');
  });

  it('successfully registers with valid data', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'securePassword123',
        name: 'New Registered User',
        timezone: 'America/New_York',
      }),
    });

    const res = await registerHandler(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.user.email).toBe(testEmail);
    expect(json.data.user.name).toBe('New Registered User');
    expect(json.data.user.timezone).toBe('America/New_York');
    expect(json.data.user.level).toBe(1);
    expect(json.data.user.xp).toBe(0);
    expect(json.data.user.freezesRemaining).toBe(3);
  });

  it('fails when registering with an existing email', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'securePassword123',
        name: 'Duplicate User',
        timezone: 'UTC',
      }),
    });

    const res = await registerHandler(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});

describe('POST /api/auth/login', () => {
  it('fails with incorrect password', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'maya@example.com',
        password: 'wrongpassword',
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('succeeds with correct password', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'maya@example.com',
        password: 'password123',
      }),
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.user.email).toBe('maya@example.com');
    expect(json.data.user.name).toBe('Maya Chen');
  });
});

describe('GET /api/me and PATCH /api/me', () => {
  it('rejects unauthenticated request to GET /api/me with 401', async () => {
    const req = new Request('http://localhost/api/me');
    const res = await getMeHandler(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns profile for authenticated session on GET /api/me', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'maya@example.com' },
    });
    expect(user).toBeDefined();

    const req = new Request('http://localhost/api/me', {
      headers: {
        authorization: `Bearer ${user!.id}`,
      },
    });

    const res = await getMeHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.user.email).toBe('maya@example.com');
    expect(json.data.user.name).toBe('Maya Chen');
  });

  it('rejects unauthenticated request to PATCH /api/me with 401', async () => {
    const req = new Request('http://localhost/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker' }),
    });
    const res = await patchMeHandler(req);
    expect(res.status).toBe(401);
  });

  it('rejects invalid timezone in PATCH /api/me with 400', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'maya@example.com' },
    });

    const req = new Request('http://localhost/api/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${user!.id}`,
      },
      body: JSON.stringify({ timezone: 'Invalid/City_Nowhere' }),
    });

    const res = await patchMeHandler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects empty payload in PATCH /api/me with 400', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'maya@example.com' },
    });

    const req = new Request('http://localhost/api/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${user!.id}`,
      },
      body: JSON.stringify({}),
    });

    const res = await patchMeHandler(req);
    expect(res.status).toBe(400);
  });

  it('updates name and timezone on PATCH /api/me', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'maya@example.com' },
    });

    const req = new Request('http://localhost/api/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${user!.id}`,
      },
      body: JSON.stringify({
        name: 'Maya Chen Updated',
        timezone: 'Europe/Paris',
      }),
    });

    const res = await patchMeHandler(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.user.name).toBe('Maya Chen Updated');
    expect(json.data.user.timezone).toBe('Europe/Paris');
  });
});
