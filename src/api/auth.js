// src/api/auth.js
import api from './index';

export const authService = {
  // Iniciar sesión
  login: (email, password) => {
    console.log('Intentando login con:', { email });
    return api.post('/auth/login', { email, password });
  },
  
  // Registrar usuario
  register: (userData) => {
    console.log('Intentando registro con:', { ...userData, password: '[HIDDEN]' });
    return api.post('/auth/register', userData);
  },
  
  // Verificar token
  verifyToken: () => {
    console.log('Verificando token...');
    return api.get('/auth/verify');
  },
  
  // Cerrar sesión (opcional, si tienes endpoint en el backend)
  logout: () => {
    console.log('Cerrando sesión...');
    return api.post('/auth/logout');
  },
  
  // MÉTODOS DE RECUPERACIÓN DE CONTRASEÑA ACTUALIZADOS
  // Solicitar recuperación por teléfono (método principal usado en web)
  solicitarRecuperacion: (telefono) => {
    console.log('Solicitando recuperación de contraseña para teléfono:', telefono);
    return api.post('/auth/solicitar-recuperacion', { telefono });
  },
  
  // Verificar código y cambiar contraseña
  verificarYCambiarPassword: (telefono, codigo, nuevaPassword) => {
    console.log('Verificando código y cambiando contraseña para:', telefono);
    return api.post('/auth/verificar-cambiar-password', { 
      telefono, 
      codigo, 
      nuevaPassword 
    });
  },
  
  // MÉTODOS LEGACY (mantener por compatibilidad)
  // Solicitar recuperación de contraseña por email (método anterior)
  forgotPassword: (email) => {
    console.log('Solicitando recuperación de contraseña para email:', email);
    return api.post('/auth/forgot-password', { email });
  },
  
  // Resetear contraseña con token (método anterior)
  resetPassword: (token, newPassword) => {
    console.log('Reseteando contraseña con token');
    return api.post('/auth/reset-password', { token, password: newPassword });
  },
};

// Exportar métodos individuales para compatibilidad (igual que en web)
export const login = authService.login;
export const register = authService.register;
export const verifyToken = authService.verifyToken;
export const solicitarRecuperacion = authService.solicitarRecuperacion;
export const verificarYCambiarPassword = authService.verificarYCambiarPassword;

// Exportar métodos legacy también
export const forgotPassword = authService.forgotPassword;
export const resetPassword = authService.resetPassword;