// src/api/carrito.js
import api from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Función helper para obtener el sessionId
const getSessionId = async () => {
  try {
    let sessionId = await AsyncStorage.getItem('sessionId');
    if (!sessionId) {
      // Generar un nuevo sessionId si no existe
      sessionId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  } catch (error) {
    console.error('Error al obtener sessionId:', error);
    return null;
  }
};

export const carritoService = {
  // Obtener carrito actual
  getCarrito: async () => {
    const sessionId = await getSessionId();
    const headers = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    return api.get('/carrito', { headers });
  },

  // Agregar producto al carrito
  agregarProducto: async (producto_id, cantidad) => {
    const sessionId = await getSessionId();
    const headers = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    return api.post('/carrito/productos', { producto_id, cantidad }, { headers });
  },

  // Actualizar cantidad de un producto
  actualizarCantidad: async (carrito_id, cantidad) => {
    const sessionId = await getSessionId();
    const headers = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    return api.put(`/carrito/productos/${carrito_id}`, { cantidad }, { headers });
  },

  // Eliminar producto del carrito
  eliminarProducto: async (carrito_id) => {
    const sessionId = await getSessionId();
    const headers = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    return api.delete(`/carrito/productos/${carrito_id}`, { headers });
  },

  // Limpiar todo el carrito
  limpiarCarrito: async () => {
    const sessionId = await getSessionId();
    const headers = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    return api.delete('/carrito', { headers });
  },

  // Finalizar compra (requiere autenticación)
  finalizarCompra: async (notas = '', metodo_pago = 'EFECTIVO') => {
    const sessionId = await getSessionId();
    const headers = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    return api.post('/carrito/finalizar', { notas, metodo_pago }, { headers });
  },

  // Simular pago
  simularPago: async (pedido_id, metodo_pago, referencia_transaccion = null) => {
    return api.post('/carrito/pagar', { 
      pedido_id, 
      metodo_pago, 
      referencia_transaccion 
    });
  },

  // Limpiar sessionId (útil para logout)
  clearSessionId: async () => {
    try {
      await AsyncStorage.removeItem('sessionId');
    } catch (error) {
      console.error('Error al limpiar sessionId:', error);
    }
  }
};