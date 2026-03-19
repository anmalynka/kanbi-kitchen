import request from 'supertest';
import app from '../src/app';

describe('API Endpoints', () => {
  it('GET /api/recipes should return a list of recipes', async () => {
    const res = await request(app).get('/api/recipes');
    expect(res.status).toEqual(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /health should return OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toEqual(200);
    expect(res.text).toEqual('OK');
  });
});
