// src/navigation/AppNavigator.js
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

import AdminNavigator from './AdminNavigator';
import ClienteNavigator from './ClienteNavigator';
import CajeroNavigator from './CajeroNavigator';
import { CartProvider } from '../contexts/CartContext';
import Navbar from '../components/common/Navbar';
import EmpleadoNavigator from './EmpleadoNavigator';
import { ExchangeRateProvider } from '../contexts/ExchangeRateContext';

const AppNavigator = () => {
  const { user, loading } = useAuth();

  const getNavigatorByRole = (user) => {
    if (!user) return null;

    switch (user.rol_id) {
      case 1: // Cliente
        return (
          <ExchangeRateProvider>
            <CartProvider>
              <ClienteNavigator />
            </CartProvider>
          </ExchangeRateProvider>
        );
      case 2: // Administrador
        return <AdminNavigator />;
      case 3: // Cajero
        return <CajeroNavigator />;
      case 4: // Empleado
        return <EmpleadoNavigator />; 
      default:
        return <ClienteNavigator />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="
#2196F3" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: Usuario no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Navbar />
      <View style={styles.content}>{getNavigatorByRole(user)}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
});

export default AppNavigator;