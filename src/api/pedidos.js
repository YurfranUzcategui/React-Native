// src/api/pedidos.js - VERSIÓN CORREGIDA CON ENDPOINTS CORRECTOS
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './index';

export const pedidosService = {
  
  /**
   * ✅ CORREGIDO: Obtener mis pedidos CON ENDPOINT CORRECTO
   */
  misPedidos: async (params = {}) => {
    try {
      console.log('🔍 === misPedidos INICIADO (Mobile Corregido) ===');
      console.log('📋 Parámetros recibidos:', params);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión.');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log('🎯 URL corregida:', '/pedidos/mis-pedidos');

      // ✅ ENDPOINT CORREGIDO: /pedidos/mis-pedidos (no /pedido/)
      const response = await api.get('/pedidos/mis-pedidos', {
        params,
        headers
      });

      console.log('✅ === RESPUESTA EXITOSA ===');
      console.log('📊 Status:', response.status);
      console.log('💾 Datos recibidos:', response.data);
      
      // ✅ PROCESAR RESPUESTA IGUAL QUE EN WEB
      let pedidosData = response.data.data || response.data.pedidos || response.data || [];

      console.log('📋 Pedidos obtenidos:', pedidosData.length);

      // ✅ VERIFICAR SI LOS PEDIDOS YA TIENEN DETALLES
      if (Array.isArray(pedidosData) && pedidosData.length > 0) {
        console.log('🔍 Verificando si los pedidos tienen detalles...');
        
        pedidosData.forEach((pedido, index) => {
          console.log(`📦 Pedido ${index + 1}:`);
          console.log('  - ID:', pedido.id || pedido.pedido_id);
          console.log('  - Número:', pedido.numeroAtencion || pedido.numero_atencion);
          console.log('  - Total:', pedido.total);
          console.log('  - Estado:', pedido.estado);
          console.log('  - Detalles array:', pedido.detalles);
          console.log('  - Cantidad de detalles:', pedido.detalles?.length || 0);
          
          if (pedido.detalles && pedido.detalles.length > 0) {
            console.log('  📦 Productos en este pedido:');
            pedido.detalles.forEach((detalle, idx) => {
              const nombreProducto = detalle.producto?.nombre || 
                                    detalle.productoNombre || 
                                    detalle.producto_nombre || 
                                    detalle.Producto?.nombre ||
                                    'SIN NOMBRE';
              const cantidad = detalle.cantidad || 'SIN CANTIDAD';
              const precio = detalle.precioUnitario || detalle.precio_unitario || detalle.precio || 'SIN PRECIO';
              
              console.log(`    ${idx + 1}. ${nombreProducto} x${cantidad} - $${precio}`);
            });
          } else {
            console.error(`❌ PEDIDO ${pedido.id || pedido.pedido_id} NO TIENE DETALLES`);
          }
        });
      }
      
      const resultado = {
        data: pedidosData,
        status: response.status,
        success: true,
        total: response.data?.total || pedidosData.length,
        message: response.data?.message || 'Pedidos obtenidos exitosamente'
      };

      console.log('🎉 Resultado final:', resultado);
      return resultado;

    } catch (error) {
      console.error('❌ === ERROR EN misPedidos ===');
      console.error('🚨 Error completo:', error);
      console.error('📊 Status del error:', error.response?.status);
      console.error('📝 Mensaje del error:', error.message);
      console.error('🌐 URL que falló:', error.config?.url);
      console.error('📦 Datos de error del servidor:', error.response?.data);
      
      let errorMessage = 'Error al obtener pedidos';
      
      if (error.response?.status === 404) {
        errorMessage = 'La ruta solicitada no existe en esta API';
      } else if (error.response?.status === 401) {
        errorMessage = 'Token de autenticación inválido o expirado';
        await AsyncStorage.removeItem('token');
      } else if (error.response?.status === 403) {
        errorMessage = 'Sin permisos para acceder a los pedidos';
      } else if (!error.response) {
        errorMessage = 'No se puede conectar al servidor';
      } else {
        errorMessage = error.response?.data?.message || 
                      error.response?.data?.error || 
                      error.message;
      }
      
      throw {
        message: errorMessage,
        status: error.response?.status,
        data: error.response?.data,
        success: false,
        originalError: error
      };
    }
  },

  /**
   * ✅ CORREGIDO: Obtener pedido específico CON ENDPOINT CORRECTO
   */
  obtenerMiPedido: async (id) => {
    try {
      console.log('🔍 === obtenerMiPedido INICIADO ===');
      console.log('🆔 ID solicitado:', id);
      
      if (!id) {
        throw new Error('ID de pedido es requerido');
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      console.log('🎯 URL corregida:', `/pedidos/mis-pedidos/${id}`);

      // ✅ ENDPOINT CORREGIDO: /pedidos/mis-pedidos/${id}
      const response = await api.get(`/pedidos/mis-pedidos/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Pedido individual obtenido:', response.data);
      
      const pedidoData = response.data.data || response.data.pedido || response.data;
      
      return {
        data: pedidoData,
        status: response.status,
        success: true,
        message: response.data.message || 'Pedido obtenido exitosamente'
      };

    } catch (error) {
      console.error('❌ Error en obtenerMiPedido:', error);
      
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
      }
      
      throw {
        message: error.response?.data?.message || 
                error.response?.data?.error || 
                error.message ||
                'Error al obtener el pedido',
        status: error.response?.status,
        data: error.response?.data,
        success: false,
        originalError: error
      };
    }
  },

  /**
   * ✅ CORREGIDO: Crear pedido para pago CON ENDPOINT CORRECTO
   */
  crearParaPago: async (data) => {
    try {
      console.log('🔍 API: crearParaPago - Data:', data);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // ✅ ENDPOINT CORREGIDO: /pedidos/crear-para-pago
      const response = await api.post('/pedidos/crear-para-pago', data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Pedido para pago creado:', response.data);

      return {
        data: response.data.data || response.data.pedido || response.data,
        status: response.status,
        success: true,
        message: response.data.message || 'Pedido creado para pago exitosamente'
      };

    } catch (error) {
      console.error('❌ Error en crearParaPago:', error);
      
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
      }
      
      throw {
        message: error.response?.data?.message || 
                error.response?.data?.error || 
                error.message ||
                'Error al crear pedido para pago',
        status: error.response?.status,
        data: error.response?.data,
        success: false,
        originalError: error
      };
    }
  },
  
  /**
   * ✅ CORREGIDO: Procesar devolución CON ENDPOINT CORRECTO
   */
  procesarDevolucion: async (pedidoId, datosDevolucion) => {
    try {
      console.log('🔄 API: procesarDevolucion - ID:', pedidoId);
      console.log('📋 Datos:', datosDevolucion);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      if (!datosDevolucion.tipo_cancelacion) {
        throw new Error('Tipo de cancelación es requerido');
      }
      
      if (!datosDevolucion.productos_cancelar || datosDevolucion.productos_cancelar.length === 0) {
        throw new Error('Debe especificar productos a cancelar');
      }

      // ✅ ENDPOINT CORREGIDO: /pedidos/mis-pedidos/${pedidoId}/devolver
      const response = await api.put(`/pedidos/mis-pedidos/${pedidoId}/devolver`, datosDevolucion, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Devolución procesada exitosamente:', response.data);

      return {
        data: response.data.data || response.data,
        status: response.status,
        success: true,
        message: response.data.message || 'Devolución procesada exitosamente'
      };

    } catch (error) {
      console.error('❌ Error en procesarDevolucion:', error);
      
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
      }
      
      let errorMessage = 'Error al procesar la devolución';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Datos de devolución inválidos';
      } else if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para cancelar este pedido';
      } else if (error.response?.status === 404) {
        errorMessage = 'Pedido no encontrado';
      } else if (error.response?.status === 501) {
        errorMessage = 'Funcionalidad en desarrollo (simulación activa)';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw {
        message: errorMessage,
        status: error.response?.status,
        data: error.response?.data,
        success: false,
        originalError: error
      };
    }
  },

  /**
   * ✅ CORREGIDO: Obtener mis devoluciones CON ENDPOINT CORRECTO
   */
  getMisDevoluciones: async () => {
    try {
      console.log('💳 === API: getMisDevoluciones CORREGIDO ===');
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('❌ No hay token de autenticación');
        throw new Error('No hay token de autenticación');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log('🎯 URL corregida:', '/pedidos/mis-devoluciones');

      // ✅ ENDPOINT CORREGIDO: /pedidos/mis-devoluciones
      const response = await api.get('/pedidos/mis-devoluciones', {
        headers,
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500;
        }
      });

      console.log('✅ Respuesta recibida:', {
        status: response.status,
        dataLength: response.data?.data?.length || 0
      });

      if (response.status === 200) {
        const devoluciones = response.data.data || response.data || [];
        
        console.log('✅ Devoluciones obtenidas exitosamente:', devoluciones.length);
        
        const devolucionesFormateadas = devoluciones.map(dev => ({
          id: dev.id || dev.codigo_devolucion,
          devolucion_id: dev.devolucion_id,
          pedido_id: dev.pedido_id,
          numero_pedido: dev.numero_pedido || dev.numero_atencion,
          codigo_devolucion: dev.codigo_devolucion || dev.id,
          monto_total: parseFloat(dev.monto_total || 0),
          saldo_disponible: parseFloat(dev.saldo_disponible || 0),
          estado: dev.estado,
          tipo: dev.tipo || dev.tipo_devolucion,
          descripcion: dev.descripcion || dev.descripcion_productos,
          motivo: dev.motivo,
          fecha_emision: dev.fecha_emision,
          fecha_vencimiento: dev.fecha_vencimiento,
          total_productos: dev.total_productos || 0,
          cliente_nombre: dev.cliente_nombre
        }));

        return {
          data: devolucionesFormateadas,
          status: response.status,
          success: true,
          total: devolucionesFormateadas.length,
          message: response.data?.message || 'Devoluciones obtenidas exitosamente'
        };
      } 
      else if (response.status === 401) {
        console.warn('⚠️ Token inválido o expirado');
        await AsyncStorage.removeItem('token');
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      else if (response.status === 403 || response.status === 404) {
        console.log('ℹ️ Sistema de devoluciones no disponible');
        
        return {
          data: [],
          status: 200,
          success: true,
          total: 0,
          message: response.data?.message || 'Sistema de devoluciones en configuración'
        };
      }
      else {
        console.warn('⚠️ Status inesperado:', response.status);
        throw new Error(`Error del servidor: ${response.status} - ${response.statusText}`);
      }

    } catch (error) {
      console.error('❌ === ERROR EN getMisDevoluciones ===');
      
      if (!error.response) {
        console.log('ℹ️ Error de red - devolviendo array vacío');
        return {
          data: [],
          status: 200,
          success: true,
          total: 0,
          message: 'No se puede conectar al servidor. Mostrando vista sin devoluciones.'
        };
      }

      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
      }

      if (error.response?.status === 403 || error.response?.status === 404) {
        console.log('ℹ️ Error 403/404 - devolviendo array vacío');
        return {
          data: [],
          status: 200,
          success: true,
          total: 0,
          message: 'Sistema de devoluciones no disponible actualmente'
        };
      }

      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error al obtener devoluciones';

      throw {
        message: errorMessage,
        status: error.response?.status,
        data: error.response?.data,
        success: false,
        originalError: error
      };
    }
  },

  // ===== MÉTODOS PARA EMPLEADOS =====
  getPreparacion: () => api.get('/pedidos/empleado/pedidos-preparacion'),
  getListos: () => api.get('/pedidos/empleado/pedidos-listos'),
  getByEstado: (estado) => api.get(`/pedidos/empleado/estado/${estado}`),
  getEmpleadoPedidos: (estado) => api.get('/pedidos/empleado', { params: { estado } }),
  getDetalle: (id) => api.get(`/pedidos/empleado/pedidos/${id}/detalle`),
  marcarListo: (id) => api.put(`/pedidos/empleado/pedidos/${id}/listo`),
  updateEstado: (id, estado) => api.put(`/pedidos/empleado/pedidos/${id}/estado`, { estado }),

  // ===== MÉTODOS PARA ADMINISTRADORES =====
  todos: (params = {}) => api.get('/pedidos', { params }),
  obtenerPorId: (id) => api.get(`/pedidos/${id}`),
  actualizar: (id, data) => api.put(`/pedidos/${id}`, data),
  actualizarEstado: (id, estado) => api.put(`/pedidos/${id}/estado`, { estado }),
  estadisticas: () => api.get('/pedidos/estadisticas/resumen'),

  // ===== ALIAS PARA COMPATIBILIDAD =====
  
  /**
   * ✅ ALIAS: getMisPedidos (para OrdersScreen)
   */
  getMisPedidos: async (params = {}) => {
    return await pedidosService.misPedidos(params);
  },

  /**
   * ✅ ALIAS: getMiPedido (para OrdersScreen)
   */
  getMiPedido: async (id) => {
    return await pedidosService.obtenerMiPedido(id);
  },

  // ===== MÉTODOS LEGACY PARA COMPATIBILIDAD =====
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
    if (filters.cliente_id) params.append('cliente_id', filters.cliente_id);
    
    const queryString = params.toString();
    return api.get(`/pedidos${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id) => api.get(`/pedidos/${id}`),
  create: (pedidoData) => pedidosService.crearParaPago(pedidoData),
  updateStatus: (id, statusData) => api.put(`/pedidos/${id}/estado`, statusData),
  cancel: (id, motivo = '') => api.put(`/pedidos/${id}/cancelar`, { motivo }),
  startPreparation: (id) => api.put(`/pedidos/${id}/estado`, { estado: 'EN_PREPARACION' }),
  markAsReady: (id) => api.put(`/pedidos/empleado/pedidos/${id}/listo`),
  markAsDelivered: (id) => api.put(`/pedidos/${id}/estado`, { estado: 'ENTREGADO' }),
  getTodayOrders: () => {
    const today = new Date().toISOString().split('T')[0];
    return api.get(`/pedidos?fecha_desde=${today}&fecha_hasta=${today}`);
  },
  getPendingOrders: () => pedidosService.getEmpleadoPedidos('PENDIENTE'),
  getInPreparationOrders: () => pedidosService.getPreparacion(),
  getReadyOrders: () => pedidosService.getListos(),
  getStats: () => pedidosService.estadisticas(),
  getByCliente: (clienteId) => api.get(`/clientes/${clienteId}/pedidos`),

  // ===== MÉTODOS DE CONVENIENCIA =====
  obtenerPendientes: () => pedidosService.getEmpleadoPedidos('PENDIENTE'),
  obtenerEnPreparacion: () => pedidosService.getPreparacion(),
  obtenerListos: () => pedidosService.getListos(),
  obtenerEntregados: () => pedidosService.getEmpleadoPedidos('ENTREGADO'),
  
  cambiarEstado: (id, nuevoEstado) => {
    const estadosValidos = ['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'];
    if (!estadosValidos.includes(nuevoEstado)) {
      throw new Error(`Estado inválido: ${nuevoEstado}`);
    }
    return pedidosService.updateEstado(id, nuevoEstado);
  },

  // ===== UTILIDADES MOBILE =====
  verificarConectividad: async () => {
    try {
      const response = await api.get('/health', { timeout: 5000 });
      return {
        conectado: true,
        status: response.status,
        latencia: Date.now() - performance.now()
      };
    } catch (error) {
      return {
        conectado: false,
        error: error.message
      };
    }
  },

  getResumenPedidos: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return { pendientes: 0, total: 0 };

      const response = await api.get('/pedidos/mis-pedidos/resumen', {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 8000
      });

      return response.data || { pendientes: 0, total: 0 };
    } catch (error) {
      console.warn('No se pudo obtener resumen de pedidos:', error.message);
      return { pendientes: 0, total: 0 };
    }
  },

  cache: {
    guardarPedidos: async (pedidos) => {
      try {
        await AsyncStorage.setItem('pedidos_cache', JSON.stringify({
          data: pedidos,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.warn('Error guardando cache de pedidos:', error);
      }
    },

    obtenerPedidos: async (maxAge = 5 * 60 * 1000) => {
      try {
        const cached = await AsyncStorage.getItem('pedidos_cache');
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > maxAge) {
          return null;
        }

        return data;
      } catch (error) {
        console.warn('Error leyendo cache de pedidos:', error);
        return null;
      }
    },

    limpiar: async () => {
      try {
        await AsyncStorage.removeItem('pedidos_cache');
      } catch (error) {
        console.warn('Error limpiando cache:', error);
      }
    }
  }
};

// ✅ EXPORT CORREGIDO
export default pedidosService;