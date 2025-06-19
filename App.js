import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// Importar contexto
import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';

// Importar navegadores
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import CajeroNavigator from './src/navigation/CajeroNavigator';

// Importar hook de autenticación
import { useAuth } from './src/contexts/AuthContext';

import { ExchangeRateProvider } from './src/contexts/ExchangeRateContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createStackNavigator();

// Componente principal de navegación
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // Pantalla de carga mientras se verifica la autenticación
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 10 }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ExchangeRateProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </ExchangeRateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}