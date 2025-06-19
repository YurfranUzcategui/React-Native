// src/contexts/ExchangeRateContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { AppState } from 'react-native';
import { exchangeService } from '../api/exchange';

const ExchangeRateContext = createContext();

export const useExchangeRate = () => useContext(ExchangeRateContext);

export const ExchangeRateProvider = ({ children }) => {
  const [exchangeRate, setExchangeRate] = useState(900);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchExchangeRate = async (force = false) => {
    setLoading(true);
    try {
      console.log('🔄 Actualizando tipo de cambio...');
      
      // Si no es forzado, verificar caché primero
      if (!force) {
        const cacheInfo = await exchangeService.getCacheInfo();
        if (cacheInfo && cacheInfo.isValid) {
          console.log('📦 Usando tipo de cambio desde caché:', cacheInfo.rate);
          setExchangeRate(cacheInfo.rate);
          setLastUpdate(new Date());
          setError(null);
          setLoading(false);
          return;
        }
      }

      // Obtener tipo de cambio fresco
      const rate = await exchangeService.getExchangeRate();
      setExchangeRate(rate);
      setLastUpdate(new Date());
      setError(null);
      
      console.log('✅ Tipo de cambio actualizado:', rate);
    } catch (err) {
      console.error("❌ Error obteniendo tipo de cambio:", err);
      setError("No se pudo obtener el tipo de cambio actual");
      
      // Mantener valor anterior si hay error
      if (exchangeRate === 900) {
        console.log('🔄 Usando valor por defecto: 900');
      }
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios de estado de la app (foreground/background)
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      console.log('📱 App regresó al foreground, verificando tipo de cambio...');
      fetchExchangeRate(false); // No forzar, usar caché si es válido
    }
  };

  useEffect(() => {
    // Cargar tipo de cambio inicial
    fetchExchangeRate();
    
    // Actualizar cada 5 minutos (solo si la app está activa)
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        fetchExchangeRate(false);
      }
    }, 300000); // 5 minutos

    // Listener para cambios de estado de la app
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, []);

  // Función para refrescar manualmente
  const refresh = () => {
    console.log('🔄 Refresh manual del tipo de cambio');
    return fetchExchangeRate(true); // Forzar actualización
  };

  // Función para obtener información del caché
  const getCacheInfo = async () => {
    try {
      return await exchangeService.getCacheInfo();
    } catch (error) {
      console.error('Error obteniendo info del caché:', error);
      return null;
    }
  };

  // Función para limpiar caché
  const clearCache = async () => {
    try {
      await exchangeService.clearCache();
      console.log('🗑️ Caché limpiado, obteniendo nuevo tipo de cambio...');
      await fetchExchangeRate(true);
    } catch (error) {
      console.error('Error al limpiar caché:', error);
    }
  };

  // Formatear moneda con el tipo de cambio actual
  const formatCurrency = (amount, currency = 'CLP') => {
    if (currency === 'USD' && exchangeRate) {
      const clpAmount = amount * exchangeRate;
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
      }).format(clpAmount);
    }
    
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Convertir USD a CLP
  const convertUSDtoCLP = (usdAmount) => {
    return usdAmount * exchangeRate;
  };

  // Convertir CLP a USD
  const convertCLPtoUSD = (clpAmount) => {
    return clpAmount / exchangeRate;
  };

  const value = {
    // Estados principales
    exchangeRate,
    loading,
    error,
    lastUpdate,
    
    // Funciones
    refresh,
    getCacheInfo,
    clearCache,
    
    // Utilidades de conversión
    formatCurrency,
    convertUSDtoCLP,
    convertCLPtoUSD,
    
    // Estado de conectividad
    isOnline: !error,
    
    // Información adicional
    cacheValid: lastUpdate && (Date.now() - lastUpdate.getTime()) < 300000 // 5 minutos
  };

  return (
    <ExchangeRateContext.Provider value={value}>
      {children}
    </ExchangeRateContext.Provider>
  );
};