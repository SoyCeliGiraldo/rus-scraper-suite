const request = require('supertest');
const app = require('../../src/app');

describe('API Integration', () => {
  it('GET /api/v1/kpi should return metrics', async () => {
    const res = await request(app).get('/api/v1/kpi');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalJobs');
  });

  it('POST /api/v1/amazon-invoices/run should require API key', async () => {
    const res = await request(app)
      .post('/api/v1/amazon-invoices/run')
      .send({ maxPages: 1 })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/amazon-invoices/run should validate body', async () => {
    const res = await request(app)
      .post('/api/v1/amazon-invoices/run')
      .send({ maxPages: -5 })
      .set('x-api-key', process.env.API_KEY || 'change_me_secure')
      .set('Content-Type', 'application/json');
    expect([400, 500]).toContain(res.status);
  });
});
