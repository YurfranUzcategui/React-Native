// src/api/productos.js
import api from './index';

export const productosService = {
  // Obtener todos los productos con parámetros opcionales
  getAll: (params = {}) => {
    console.log('Obteniendo productos con parámetros:', params);
    return api.get('/productos', { params });
  },
  
  // Obtener producto por ID
  getById: (id) => {
    console.log(`Obteniendo producto con ID: ${id}`);
    return api.get(`/productos/${id}`);
  },
  
  // Obtener producto por código de barras
  getByCodigoBarras: (codigo) => {
    console.log(`Buscando producto con código de barras: ${codigo}`);
    return api.get(`/productos/codigo/${codigo}`);
  },
  
  // Crear nuevo producto
  create: (data) => {
    console.log('Enviando datos para crear producto:', {
      ...data,
      // Ocultar datos sensibles en logs si es necesario
    });
    return api.post('/productos', data);
  },
  
  // Actualizar producto existente
  update: (id, data) => {
    console.log(`Enviando datos para actualizar producto ${id}:`, {
      ...data,
    });
    return api.put(`/productos/${id}`, data);
  },
  
  // Ajustar stock de producto
  ajustarStock: (id, data) => {
    console.log(`Ajustando stock del producto ${id}:`, data);
    return api.post(`/productos/${id}/stock`, data);
  },
  
  // Eliminar producto
  delete: (id) => {
    console.log(`Eliminando producto con ID: ${id}`);
    return api.delete(`/productos/${id}`);
  },
  
  // Búsqueda de productos con filtros
  search: (query, filters = {}) => {
    console.log(`Buscando productos con query: "${query}"`, filters);
    return api.get('/productos/search', { 
      params: { 
        q: query, 
        ...filters 
      } 
    });
  },
  
  // Obtener productos por categoría
  getByCategoria: (categoriaId) => {
    console.log(`Obteniendo productos de categoría: ${categoriaId}`);
    return api.get(`/productos/categoria/${categoriaId}`);
  },
  
  // Obtener productos con stock bajo
  getStockBajo: (limite = 10) => {
    console.log(`Obteniendo productos con stock bajo (límite: ${limite})`);
    return api.get('/productos/stock-bajo', { params: { limite } });
  },
};