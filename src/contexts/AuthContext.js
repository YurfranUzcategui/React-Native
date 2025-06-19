// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../api/auth';

// Crear contexto
const AuthContext = createContext(null);

// Hook personalizado para usar el contexto
export const useAuth = () => useContext(AuthContext);

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario desde AsyncStorage al iniciar
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          try {
            // Hacer una petición al backend para verificar el token
            const response = await authService.verifyToken();
            const userData = response.data;
            
            // Si el token es válido, establecer el usuario como autenticado
            setUser(userData);
            setIsAuthenticated(true);
            setIsAdmin(userData.rol_id === 2);
            setToken(storedToken);
          } catch (error) {
            // Si el token no es válido, limpiar el almacenamiento
            console.error('Token inválido:', error);
            await AsyncStorage.multiRemove(['token', 'user']);
          }
        }
      } catch (error) {
        console.error('Error verificando token:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  // Función para iniciar sesión
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authService.login(email, password);
      const { user: userData, token: authToken } = response.data;
      
      // Guardar en AsyncStorage
      await AsyncStorage.multiSet([
        ['token', authToken],
        ['user', JSON.stringify(userData)]
      ]);
      
      // Actualizar estado
      setToken(authToken);
      setUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.rol_id === 2);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Correo o contraseña incorrectos'
      };
    } finally {
      setLoading(false);
    }
  };

  // Función para registrarse
  const register = async (userData) => {
    try {
      setLoading(true);
      await authService.register(userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al registrarse' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'user']);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Función para actualizar perfil
  const updateProfile = async (updatedUser) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
    }
  };

  // Función para obtener el token almacenado
  const getStoredToken = async () => {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error al obtener token:', error);
      return null;
    }
  };

  // Función para obtener el usuario almacenado
  const getStoredUser = async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }
  };

  const value = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    loading,
    login,
    register,
    logout,
    updateProfile,
    getStoredToken,
    getStoredUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;