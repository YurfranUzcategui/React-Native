// src/api/clientes.js
import api from './index';

export const clientesService = {
  // Métodos para el perfil del usuario actual
  getMiPerfil: () => {
    console.log('Obteniendo mi perfil');
    return api.get('/clientes/mi-perfil');
  },
  
  actualizarMiPerfil: (data) => {
    console.log('Actualizando mi perfil:', { ...data, password: data.password ? '[HIDDEN]' : undefined });
    return api.put('/clientes/mi-perfil', data);
  },
  
  // Métodos para administradores - gestión de todos los clientes
  getAll: () => {
    console.log('Obteniendo todos los clientes (admin)');
    return api.get('/clientes');
  },
  
  getById: (id) => {
    console.log(`Obteniendo cliente con ID: ${id}`);
    return api.get(`/clientes/${id}`);
  },
  
  // Actualizar datos de un cliente específico (admin)
  update: (id, data) => {
    console.log(`Actualizando cliente ${id}:`, { ...data, password: data.password ? '[HIDDEN]' : undefined });
    return api.put(`/clientes/${id}`, data);
  },
  
  // Actualizar datos básicos del cliente (alias para compatibilidad con web)
  actualizarCliente: (id, data) => {
    console.log(`Actualizando cliente ${id}:`, { ...data, password: data.password ? '[HIDDEN]' : undefined });
    return api.put(`/clientes/${id}`, data);
  },
  
  // Actualizar rol de un cliente (admin) - CORREGIDO para coincidir con web
  updateRole: (id, data) => {
    console.log(`Actualizando rol del cliente ${id}:`, data);
    // Si recibe un número directo, lo convierte a objeto
    const roleData = typeof data === 'number' ? { rol_id: data } : data;
    return api.put(`/clientes/${id}/role`, roleData); // Cambiado de /rol a /role
  },
  
  // Actualizar estado de un cliente (admin)
  updateStatus: (id, data) => {
    console.log(`Actualizando estado del cliente ${id}:`, data);
    return api.put(`/clientes/${id}/status`, data);
  },
  
  // Eliminar cliente (admin)
  delete: (id) => {
    console.log(`Eliminando cliente con ID: ${id}`);
    return api.delete(`/clientes/${id}`);
  },
  
  // Buscar clientes por diferentes criterios
  search: (query) => {
    console.log(`Buscando clientes con query: "${query}"`);
    return api.get('/clientes/search', { params: { q: query } });
  },
  
  // Obtener estadísticas de clientes (admin)
  getEstadisticas: () => {
    console.log('Obteniendo estadísticas de clientes');
    return api.get('/clientes/estadisticas');
  },
};