const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Customer Complaint Analytics API',
      version: '1.0.0',
      description: 'API para gestão e análise de reclamações de clientes'
    },
    servers: [{ url: 'http://localhost:3000' }]
  },
  apis: ['./app.js']
};

module.exports = swaggerJsdoc(options);