CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE ops.customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE ops.complaints (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES ops.customers(id),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE VIEW ops.v_complaints_by_status AS
  SELECT status, COUNT(*) AS total
  FROM ops.complaints
  GROUP BY status;

CREATE VIEW ops.v_complaints_by_customer AS
  SELECT c.name, COUNT(*) AS total
  FROM ops.complaints comp
  JOIN ops.customers c ON comp.customer_id = c.id
  GROUP BY c.name
  ORDER BY COUNT(*) DESC;

CREATE VIEW ops.v_complaints_summary AS
  SELECT c.id, c.name,
    COUNT(*) AS total_complaints,
    SUM(CASE WHEN comp.status = 'open' THEN 1 ELSE 0 END) AS open_complaints,
    SUM(CASE WHEN comp.status = 'closed' THEN 1 ELSE 0 END) AS closed_complaints
  FROM ops.complaints comp
  JOIN ops.customers c ON comp.customer_id = c.id
  GROUP BY c.id, c.name;