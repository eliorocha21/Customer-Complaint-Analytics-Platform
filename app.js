require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { z } = require('zod');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const connectionString = process.env.DATABASE_URL || 'postgresql://app_user@localhost:5432/CustomerComplaintAnalytics';
const pool = new Pool({ connectionString });

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

console.log('Executando arquivo:', __filename);

const complaintSchema = z.object({
  customer_id: z.number().int().positive({ message: 'customer_id deve ser um número positivo' }),
  status: z.enum(['open', 'closed'], { message: 'status deve ser "open" ou "closed"' })
});

const complaintUpdateSchema = z.object({
  title: z.string().min(1, { message: 'title é obrigatório' }),
  description: z.string().min(1, { message: 'description é obrigatório' })
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'validation_failed',
        details: result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
      });
    }
    req.body = result.data;
    next();
  };
}

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica se a API está no ar
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/health', (req, res) => res.send('ok'));

/**
 * @swagger
 * /api/complaints/by-status:
 *   get:
 *     summary: Total de reclamações agrupadas por status
 *     responses:
 *       200:
 *         description: Lista de status com totais
 */
app.get('/api/complaints/by-status', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ops.v_complaints_by_status ORDER BY total DESC;');
    res.json(rows);
  } catch (err) {
    console.error('by-status error:', err.message || err);
    res.status(500).json({ error: 'query_failed' });
  }
});

/**
 * @swagger
 * /api/complaints/top-customers:
 *   get:
 *     summary: Clientes com mais reclamações abertas
 *     responses:
 *       200:
 *         description: Lista de clientes ordenada por reclamações abertas
 */
app.get('/api/complaints/top-customers', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.name,
             COUNT(p.*) FILTER (WHERE p.status='open') AS open_complaints
      FROM ops.customers c
      LEFT JOIN ops.complaints p ON p.customer_id = c.id
      GROUP BY c.id, c.name
      ORDER BY open_complaints DESC
      LIMIT 50;
    `);
    res.json(rows);
  } catch (err) {
    console.error('top-customers error:', err.message || err);
    res.status(500).json({ error: 'query_failed' });
  }
});

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Lista todos os clientes
 *     responses:
 *       200:
 *         description: Lista de clientes
 */
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ops.customers');
    res.json(result.rows);
  } catch (err) {
    console.error('customers error:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/complaints:
 *   get:
 *     summary: Lista todas as reclamações
 *     responses:
 *       200:
 *         description: Lista de reclamações
 *   post:
 *     summary: Cria uma nova reclamação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_id:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [open, closed]
 *     responses:
 *       200:
 *         description: Reclamação criada
 *       400:
 *         description: Dados inválidos
 */
app.get('/api/complaints', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ops.complaints');
    res.json(result.rows);
  } catch (err) {
    console.error('complaints error:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/complaints', validate(complaintSchema), async (req, res) => {
  const { customer_id, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO ops.complaints (customer_id, status) VALUES ($1, $2) RETURNING *',
      [customer_id, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('insert complaint error:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/complaints/by-customer:
 *   get:
 *     summary: Total de reclamações por cliente
 *     responses:
 *       200:
 *         description: Lista de clientes com totais
 */
app.get('/api/complaints/by-customer', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT name, total FROM ops.v_complaints_by_customer;');
    const out = rows.map(r => ({
      name: r.name,
      total: r.total !== null ? Number(r.total) : 0
    }));
    res.json(out);
  } catch (err) {
    console.error('by-customer error:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/complaints/summary:
 *   get:
 *     summary: Resumo de reclamações por cliente
 *     responses:
 *       200:
 *         description: Resumo detalhado
 */
app.get('/api/complaints/summary', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ops.v_complaints_summary;');
    res.json(rows);
  } catch (err) {
    console.error('summary error:', err.message || err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/complaints/summary/aggregated:
 *   get:
 *     summary: Resumo agregado (totais gerais)
 *     responses:
 *       200:
 *         description: Totais de reclamações
 */
app.get('/api/complaints/summary/aggregated', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_complaints,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END)::int AS open_complaints,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END)::int AS closed_complaints
      FROM ops.complaints;
    `);
    res.json(rows[0] || { total_complaints: 0, open_complaints: 0, closed_complaints: 0 });
  } catch (err) {
    console.error('aggregated summary error:', err.message || err);
    res.status(500).json({ error: 'query_failed' });
  }
});

app.get('/api/complaints/details', (req, res) => {
  res.json([{ id: 1, title: 'Teste', description: 'Detalhe' }]);
});

/**
 * @swagger
 * /api/complaints/{id}:
 *   put:
 *     summary: Atualiza uma reclamação (mock)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Atualizado com sucesso
 *   delete:
 *     summary: Remove uma reclamação (mock)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Removido com sucesso
 */
app.put('/api/complaints/:id', validate(complaintUpdateSchema), (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  res.json({ id, title, description, status: "Atualizado com sucesso" });
});

app.delete('/api/complaints/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, status: "Removido com sucesso" });
});

module.exports = app;