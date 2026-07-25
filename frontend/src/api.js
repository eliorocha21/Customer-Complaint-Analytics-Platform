import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

export const getSummaryAggregated = () => api.get('/complaints/summary/aggregated');
export const getByStatus = () => api.get('/complaints/by-status');
export const getByCustomer = () => api.get('/complaints/by-customer');
export const getTopCustomers = () => api.get('/complaints/top-customers');

export default api;