// src/api/pedidos.js - ACTUALIZADO para coincidir con versión web
import api from './index';

export const pedidosService = {
  // ===== MÉTODOS PARA EMPLEADOS =====
  // Pedidos por estado específico
  getPreparacion: () => api.get('/pedido/empleado/pedidos-preparacion'),
  getListos: () => api.get('/pedido/empleado/pedidos-listos'),
  
  // Obtener pedidos por estado específico (alternativo)
  getByEstado: (estado) => api.get(`/pedido/empleado/estado/${estado}`),
  
  // Obtener pedidos con query parameter (método general)
  getEmpleadoPedidos: (estado) => api.get('/pedido/empleado', { params: { estado } }),
  
  // Detalles y acciones sobre pedidos específicos
  getDetalle: (id) => api.get(`/pedido/empleado/pedidos/${id}/detalle`),
  marcarListo: (id) => api.put(`/pedido/empleado/pedidos/${id}/listo`),
  updateEstado: (id, estado) => api.put(`/pedido/empleado/pedidos/${id}/estado`, { estado }),
  
  // ===== MÉTODOS PARA CLIENTES =====
  misPedidos: () => api.get('/pedido/mis-pedidos'),
  obtenerMiPedido: (id) => api.get(`/pedido/mis-pedidos/${id}`),
  crearParaPago: (data) => api.post('/pedido/crear-para-pago', data),
  
  // ===== MÉTODOS PARA ADMINISTRADORES =====
  todos: (params = {}) => api.get('/pedido', { params }),
  obtenerPorId: (id) => api.get(`/pedido/${id}`),
  actualizar: (id, data) => api.put(`/pedido/${id}`, data),
  actualizarEstado: (id, estado) => api.put(`/pedido/${id}/estado`, { estado }),
  estadisticas: () => api.get('/pedido/estadisticas/resumen'),
  
  // ===== MÉTODOS LEGACY (mantener compatibilidad con código React Native existente) =====
  
  // Obtener todos los pedidos con filtros opcionales (método legacy)
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
    if (filters.cliente_id) params.append('cliente_id', filters.cliente_id);
    
    const queryString = params.toString();
    return api.get(`/pedidos${queryString ? `?${queryString}` : ''}`);
  },

  // Obtener un pedido por ID (método legacy)
  getById: (id) => api.get(`/pedidos/${id}`),

  // Crear nuevo pedido (método legacy - redirigir a nuevo endpoint)
  create: (pedidoData) => api.post('/pedido/crear-para-pago', pedidoData),

  // Actualizar estado del pedido (método legacy)
  updateStatus: (id, statusData) => api.put(`/pedidos/${id}/estado`, statusData),

  // Cancelar pedido (método legacy)
  cancel: (id, motivo = '') => api.put(`/pedidos/${id}/cancelar`, { motivo }),

  // Marcar como en preparación (método legacy)
  startPreparation: (id) => api.put(`/pedidos/${id}/estado`, { estado: 'EN_PREPARACION' }),

  // Marcar como listo (método legacy - redirigir a nuevo endpoint)
  markAsReady: (id) => api.put(`/pedido/empleado/pedidos/${id}/listo`),

  // Marcar como entregado (método legacy)
  markAsDelivered: (id) => api.put(`/pedidos/${id}/estado`, { estado: 'ENTREGADO' }),

  // Obtener pedidos del día (método legacy)
  getTodayOrders: () => {
    const today = new Date().toISOString().split('T')[0];
    return api.get(`/pedidos?fecha_desde=${today}&fecha_hasta=${today}`);
  },

  // Obtener pedidos pendientes (método legacy - usar nuevo endpoint)
  getPendingOrders: () => pedidosService.getEmpleadoPedidos('PENDIENTE'),

  // Obtener pedidos en preparación (método legacy - usar nuevo endpoint)
  getInPreparationOrders: () => pedidosService.getPreparacion(),

  // Obtener pedidos listos (método legacy - usar nuevo endpoint)
  getReadyOrders: () => pedidosService.getListos(),

  // Obtener estadísticas de pedidos (método legacy - redirigir a nuevo endpoint)
  getStats: () => pedidosService.estadisticas(),

  // Obtener historial de un cliente específico (método legacy)
  getByCliente: (clienteId) => api.get(`/clientes/${clienteId}/pedidos`),

  // ===== MÉTODOS DE CONVENIENCIA =====
  
  // Métodos de acceso rápido para estados comunes
  obtenerPendientes: () => pedidosService.getEmpleadoPedidos('PENDIENTE'),
  obtenerEnPreparacion: () => pedidosService.getPreparacion(),
  obtenerListos: () => pedidosService.getListos(),
  obtenerEntregados: () => pedidosService.getEmpleadoPedidos('ENTREGADO'),
  
  // Método para cambiar estado con validación
  cambiarEstado: (id, nuevoEstado) => {
    const estadosValidos = ['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'];
    if (!estadosValidos.includes(nuevoEstado)) {
      throw new Error(`Estado inválido: ${nuevoEstado}`);
    }
    return pedidosService.updateEstado(id, nuevoEstado);
  }
};

export default pedidosService;