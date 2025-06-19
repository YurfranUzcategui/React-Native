// src/api/categorias.js
import api from './index';

export const categoriasService = {
  // Obtener todas las categorías
  getAll: () => {
    console.log('Obteniendo todas las categorías');
    return api.get('/categorias');
  },
  
  // Obtener categoría por ID
  getById: (id) => {
    console.log(`Obteniendo categoría con ID: ${id}`);
    return api.get(`/categorias/${id}`);
  },
  
  // Crear nueva categoría
  create: (data) => {
    console.log('Creando nueva categoría:', data);
    return api.post('/categorias', data);
  },
  
  // Actualizar categoría existente
  update: (id, data) => {
    console.log(`Actualizando categoría ${id}:`, data);
    return api.put(`/categorias/${id}`, data);
  },
  
  // Eliminar categoría
  delete: (id) => {
    console.log(`Eliminando categoría con ID: ${id}`);
    return api.delete(`/categorias/${id}`);
  },
  
  // Obtener categorías activas solamente
  getActivas: () => {
    console.log('Obteniendo categorías activas');
    return api.get('/categorias/activas');
  },
  
  // Obtener productos de una categoría específica
  getProductos: (id) => {
    console.log(`Obteniendo productos de la categoría: ${id}`);
    return api.get(`/categorias/${id}/productos`);
  },
};