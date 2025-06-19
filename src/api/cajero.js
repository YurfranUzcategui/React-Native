// src/api/cajero.js
import api from './index';

// Exportar funciones individuales (igual que en web)
export const generarQR = (pedidoId) => {
  return api.post(`/cajero/generar-qr/${pedidoId}`);
};

export const procesarPago = (data) => {
  return api.post('/cajero/procesar-pago', data);
};

export const obtenerPedidos = () => {
  return api.get('/cajero/pedidos');
};

export const enviarAPreparacion = (pedidoId) => {
  return api.post(`/cajero/enviar-preparacion/${pedidoId}`);
};

export const obtenerVentasDia = (fecha) => {
  const fechaParam = fecha || new Date().toISOString().split('T')[0];
  return api.get(`/cajero/ventas-dia?fecha=${fechaParam}`);
};

export const procesarCierreCaja = (data) => {
  return api.post('/cajero/cierre-caja', data);
};

export const descargarReporteExcel = (fechaInicio, fechaFin) => {
  return api.get(`/cajero/reporte-excel?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`, {
    responseType: 'blob'
  });
};

export const descargarReportePDF = (fechaInicio, fechaFin) => {
  return api.get(`/cajero/reporte-pdf?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`, {
    responseType: 'blob'
  });
};

export const verificarPago = (numeroAtencion) => {
  return api.get(`/cajero/verificar-pago/${numeroAtencion}`);
};

// Mantener el objeto cajeroService para compatibilidad con código existente
export const cajeroService = {
  // Métodos principales (mantener nombres actuales para no romper código)
  getPedidos: obtenerPedidos,
  getVentasDia: obtenerVentasDia,
  generarQR,
  procesarPago,
  enviarPreparacion: enviarAPreparacion,
  cierreCaja: procesarCierreCaja,

  // Métodos de reportes con nombres consistentes
  descargarReporteExcel,
  descargarReportePDF,
  
  // Método genérico de reporte (mantener para compatibilidad)
  getReporte: async (formato, fechaInicio, fechaFin) => {
    try {
      const response = await api.get(`/cajero/reporte-${formato}`, {
        params: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Nuevos métodos desde web
  verificarPago,

  // Método legacy (mantener por compatibilidad)
  getResumenCaja: () => {
    return api.get('/cajero/resumen-caja');
  }
};