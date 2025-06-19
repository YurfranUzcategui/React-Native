// ===== src/api/exchange.js =====
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache en AsyncStorage con tiempo de expiración (5 minutos)
const CACHE_KEY = 'exchange_rate_cache';
const CACHE_TIME_KEY = 'exchange_rate_cache_time';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

export const exchangeService = {
  getExchangeRate: async () => {
    try {
      // Verificar caché en AsyncStorage
      const cachedRate = await AsyncStorage.getItem(CACHE_KEY);
      const cacheTime = await AsyncStorage.getItem(CACHE_TIME_KEY);
      
      const now = Date.now();
      if (cachedRate && cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION) {
        console.log('🎯 Usando tipo de cambio desde caché:', parseFloat(cachedRate));
        return parseFloat(cachedRate);
      }

      console.log('🔄 Obteniendo tipo de cambio desde API...');

      try {
        // Intentar con API primaria
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=CLP');
        const data = await response.json();
        
        if (data && data.rates && data.rates.CLP) {
          const rate = data.rates.CLP;
          
          // Guardar en caché
          await AsyncStorage.setItem(CACHE_KEY, rate.toString());
          await AsyncStorage.setItem(CACHE_TIME_KEY, now.toString());
          
          console.log('✅ Tipo de cambio obtenido (API primaria):', rate);
          return rate;
        }
      } catch (error) {
        console.warn("⚠️ Error con API primaria, usando alternativa", error.message);
      }

      try {
        // Fallback a API secundaria
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        
        if (data && data.rates && data.rates.CLP) {
          const rate = data.rates.CLP;
          
          // Guardar en caché
          await AsyncStorage.setItem(CACHE_KEY, rate.toString());
          await AsyncStorage.setItem(CACHE_TIME_KEY, now.toString());
          
          console.log('✅ Tipo de cambio obtenido (API secundaria):', rate);
          return rate;
        }
      } catch (error) {
        console.error("❌ Error obteniendo tipo de cambio:", error);
      }

      // Valor de respaldo si todo falla
      console.log('🔄 Usando valor de respaldo para tipo de cambio: 900');
      return 900;
      
    } catch (error) {
      console.error("❌ Error general en exchangeService:", error);
      return 900; // Valor de respaldo
    }
  },

  // Limpiar caché manualmente
  clearCache: async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIME_KEY);
      console.log('🗑️ Caché de tipo de cambio limpiado');
    } catch (error) {
      console.error('Error al limpiar caché:', error);
    }
  },

  // Obtener información del caché
  getCacheInfo: async () => {
    try {
      const cachedRate = await AsyncStorage.getItem(CACHE_KEY);
      const cacheTime = await AsyncStorage.getItem(CACHE_TIME_KEY);
      
      if (cachedRate && cacheTime) {
        const now = Date.now();
        const timeLeft = CACHE_DURATION - (now - parseInt(cacheTime));
        
        return {
          rate: parseFloat(cachedRate),
          timeLeft: Math.max(0, timeLeft),
          isValid: timeLeft > 0
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener info del caché:', error);
      return null;
    }
  }
};