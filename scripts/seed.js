require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://app_user@localhost:5432/CustomerComplaintAnalytics';
const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('render.com') ? { rejectUnauthorized: false } : false
});

const CUSTOMER_NAMES = [
  'Tech Solutions Ltda', 'Mercado Bom Preço', 'Auto Peças Silva',
  'Construtora Horizonte', 'Farmácia Vida Nova', 'Restaurante Sabor Caseiro',
  'Distribuidora Norte Sul', 'Consultoria Estratégica', 'Logística Rápida',
  'Padaria Pão Dourado', 'Escola Saber Mais', 'Clínica Bem Estar',
  'Loja Fashion Style', 'Oficina Mecânica Central', 'Imobiliária Lar Feliz',
  'Gráfica Impressão Total', 'Academia Corpo Ativo', 'Pet Shop Amigo Fiel',
  'Papelaria Criativa', 'Barbearia Estilo Único', 'Floricultura Jardim Azul',
  'Hotel Recanto Verde', 'Salão Beleza Pura', 'Marcenaria Madeira Nobre',
  'Studio Fotografia Click', 'Lavanderia Roupa Limpa', 'Sorveteria Doce Gelo',
  'Livraria Página Viva', 'Ótica Visão Clara', 'Serralheria Aço Forte'
];

function randomDateWithinLastMonths(months) {
  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - months);
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime);
}

async function seed() {
  console.log('Iniciando seed...');

  // 1. Inserir clientes que ainda não existem
  const { rows: existing } = await pool.query('SELECT name FROM ops.customers');
  const existingNames = new Set(existing.map(r => r.name));
  const newNames = CUSTOMER_NAMES.filter(name => !existingNames.has(name));

  const customerIds = [];
  for (const row of existing) {
    // já temos os nomes, mas precisamos dos ids — buscando de novo com id
  }
  const { rows: allCustomersBefore } = await pool.query('SELECT id, name FROM ops.customers');
  for (const c of allCustomersBefore) customerIds.push(c.id);

  for (const name of newNames) {
    const { rows } = await pool.query(
      'INSERT INTO ops.customers (name) VALUES ($1) RETURNING id',
      [name]
    );
    customerIds.push(rows[0].id);
  }
  console.log(`${newNames.length} novos clientes inseridos.`);

  // 2. Inserir reclamações aleatórias
  const TOTAL_COMPLAINTS = 200;
  let inserted = 0;

  for (let i = 0; i < TOTAL_COMPLAINTS; i++) {
    const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
    const status = Math.random() < 0.55 ? 'open' : 'closed';
    const createdAt = randomDateWithinLastMonths(6);

    await pool.query(
      'INSERT INTO ops.complaints (customer_id, status, created_at) VALUES ($1, $2, $3)',
      [customerId, status, createdAt]
    );
    inserted++;
  }

  console.log(`${inserted} reclamações inseridas.`);
  console.log('Seed concluído!');
  await pool.end();
}

seed().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});