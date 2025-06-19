// ===== src/api/transbank.js =====
import api from './index';

const transbankAPI = {
  /**
   * Crea un pedido antes del pago
   * @param {Object} orderData - Datos del pedido
   * @returns {Promise<Object>}
   */
  crearPedido: async (orderData) => {
    try {
      console.log('=== CREANDO PEDIDO PARA PAGO ===');
      console.log('Datos:', orderData);
      
      const response = await api.post('/pedidos/crear-para-pago', orderData);
      
      console.log('✅ Pedido creado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al crear pedido:', error);
      throw {
        success: false,
        error: error.response?.data?.error || 'Error al crear el pedido',
        details: error.response?.data
      };
    }
  },

  /**
   * Inicia una transacción de pago con Transbank
   * @param {number} pedido_id - ID del pedido
   * @returns {Promise<Object>}
   */
  iniciarPago: async (pedido_id) => {
    try {
      console.log('=== INICIANDO PAGO TRANSBANK ===');
      console.log('Pedido ID:', pedido_id);
      
      const response = await api.post(`/pago/transbank/iniciar/${pedido_id}`);
      
      console.log('✅ Pago iniciado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al iniciar pago:', error);
      throw {
        success: false,
        error: error.response?.data?.error || 'Error al iniciar el pago',
        details: error.response?.data
      };
    }
  },

  /**
   * Obtiene el resultado de una transacción
   * @param {string} token - Token de la transacción
   * @returns {Promise<Object>}
   */
  obtenerResultado: async (token) => {
    try {
      console.log('=== OBTENIENDO RESULTADO DE TRANSACCIÓN ===');
      console.log('Token:', token);
      
      const response = await api.get(`/pago/transbank/resultado/${token}`);
      
      console.log('✅ Resultado obtenido:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al obtener resultado:', error);
      throw {
        success: false,
        error: error.response?.data?.error || 'Error al obtener el resultado',
        details: error.response?.data
      };
    }
  },

  /**
   * Reversa una transacción
   * @param {string} token - Token de la transacción
   * @param {number} amount - Monto a reversar
   * @returns {Promise<Object>}
   */
  reversarTransaccion: async (token, amount) => {
    try {
      console.log('=== REVERSANDO TRANSACCIÓN ===');
      console.log('Token:', token, 'Amount:', amount);
      
      const response = await api.post(`/pago/transbank/reversar/${token}`, {
        amount: amount
      });
      
      console.log('✅ Transacción reversada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al reversar transacción:', error);
      throw {
        success: false,
        error: error.response?.data?.error || 'Error al reversar la transacción',
        details: error.response?.data
      };
    }
  },

  /**
   * Simula un pago (para desarrollo)
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>}
   */
  simularPago: async (paymentData) => {
    try {
      console.log('=== SIMULANDO PAGO ===');
      console.log('Datos:', paymentData);
      
      const response = await api.post('/pago/simular', paymentData);
      
      console.log('✅ Pago simulado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error al simular pago:', error);
      throw {
        success: false,
        error: error.response?.data?.error || 'Error al simular el pago',
        details: error.response?.data
      };
    }
  }
};

export default transbankAPI;