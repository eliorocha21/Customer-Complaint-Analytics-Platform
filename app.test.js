const request = require('supertest');
const app = require('./app');

describe('Health check', () => {
  it('GET /health deve retornar ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });
});

describe('Validação - POST /api/complaints', () => {
  it('deve rejeitar quando customer_id está faltando', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({ status: 'open' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_failed');
  });

  it('deve rejeitar status inválido', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({ customer_id: 1, status: 'pendente' });
    expect(res.status).toBe(400);
  });

  it('deve rejeitar customer_id não numérico', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({ customer_id: 'abc', status: 'open' });
    expect(res.status).toBe(400);
  });
});

describe('Validação - PUT /api/complaints/:id', () => {
  it('deve rejeitar quando title está faltando', async () => {
    const res = await request(app)
      .put('/api/complaints/1')
      .send({ description: 'apenas descrição' });
    expect(res.status).toBe(400);
  });

  it('deve aceitar quando title e description estão presentes', async () => {
    const res = await request(app)
      .put('/api/complaints/1')
      .send({ title: 'Título', description: 'Descrição' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Atualizado com sucesso');
  });
});

describe('Rotas mock', () => {
  it('GET /api/complaints/details deve retornar array', async () => {
    const res = await request(app).get('/api/complaints/details');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('DELETE /api/complaints/:id deve confirmar remoção', async () => {
    const res = await request(app).delete('/api/complaints/1');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Removido com sucesso');
  });
});