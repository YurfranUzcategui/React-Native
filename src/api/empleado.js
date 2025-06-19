// ===== src/api/codigosQr.js =====
import api from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';

const codigosQrAPI = {
  // Crear un nuevo código QR
  crear: async (qrData) => {
    try {
      console.log('🔍 Enviando QR data al backend:', qrData);
      
      const payload = {
        codigo_qr: typeof qrData === 'string' ? qrData : JSON.stringify(qrData),
        proposito: 'PAGO_CARRITO'
      };
      
      console.log('📦 Payload preparado:', payload);
      
      const response = await api.post('/codigos-qr', payload);
      console.log('✅ QR creado exitosamente:', response.data);
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Error al crear código QR:', error);
      throw error.response?.data || error.message;
    }
  },

  // Obtener mis códigos QR
  obtenerMisCodigos: async (filtros = {}) => {
    try {
      const params = {};
      if (filtros.activo !== undefined) params.activo = filtros.activo;
      if (filtros.proposito) params.proposito = filtros.proposito;
      if (filtros.limit) params.limit = filtros.limit;

      const response = await api.get('/codigos-qr/mis-codigos', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener códigos QR:', error);
      throw error.response?.data || error.message;
    }
  },

  // Actualizar estado de un código QR
  actualizarEstado: async (qrId, activo) => {
    try {
      const response = await api.put(`/codigos-qr/${qrId}/estado`, { activo });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar estado del QR:', error);
      throw error.response?.data || error.message;
    }
  },

  // Obtener códigos para cajero
  obtenerParaCajero: async (proposito = 'PAGO_CARRITO') => {
    try {
      const response = await api.get('/codigos-qr/cajero', {
        params: { proposito }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener códigos para cajero:', error);
      throw error.response?.data || error.message;
    }
  },

  // Procesar QR en cajero
  procesarEnCajero: async (qrId, accion = 'PROCESAR') => {
    try {
      const response = await api.post('/codigos-qr/cajero/procesar', {
        qr_id: qrId,
        accion
      });
      return response.data;
    } catch (error) {
      console.error('Error al procesar QR en cajero:', error);
      throw error.response?.data || error.message;
    }
  },

  // Validar código QR
  validarCodigo: async (codigoQr) => {
    try {
      const response = await api.post('/codigos-qr/validar', {
        codigo_qr: typeof codigoQr === 'string' ? codigoQr : JSON.stringify(codigoQr)
      });
      return response.data;
    } catch (error) {
      console.error('Error al validar código QR:', error);
      throw error.response?.data || error.message;
    }
  },

  // Obtener códigos activos
  obtenerActivos: async (proposito = 'PAGO_CARRITO') => {
    try {
      const response = await api.get('/codigos-qr/activos', {
        params: { proposito }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener códigos activos:', error);
      throw error.response?.data || error.message;
    }
  },

  // Limpiar códigos expirados
  limpiarExpirados: async () => {
    try {
      const response = await api.post('/codigos-qr/limpiar-expirados');
      return response.data;
    } catch (error) {
      console.error('Error al limpiar códigos expirados:', error);
      throw error.response?.data || error.message;
    }
  }
};

export default codigosQrAPI;