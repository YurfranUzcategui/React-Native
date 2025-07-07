// src/api/index.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Crear instancia de axios con configuración base
const api = axios.create({
  // Para React Native, usaremos una IP local o URL de tu servidor
  // Cambia esta URL por la de tu backend
  baseURL: 'http://192.168.1.53:3000/api', // Cambia por tu IP local
  // ** 'http://10.0.2.2:3000/api'
  // ]** 'http://localhost:3000/api'
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor para añadir token de autenticación a las peticiones
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error al obtener token del AsyncStorage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Manejar errores de autenticación (401)
    if (error.response && error.response.status === 401) {
      try {
        await AsyncStorage.multiRemove(['token', 'user']);
        // En React Native no podemos hacer window.location.href
        // Esto se manejará desde el AuthContext
        console.log('Token expirado, usuario deslogueado');
      } catch (storageError) {
        console.error('Error al limpiar AsyncStorage:', storageError);
      }
    }
    
    // Manejar errores de conexión
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout - La petición tardó demasiado');
    }
    
    if (!error.response) {
      console.error('Error de red - No se pudo conectar al servidor');
    }
    
    return Promise.reject(error);
  }
);

export default api;