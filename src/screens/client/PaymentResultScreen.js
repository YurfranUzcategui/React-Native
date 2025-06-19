// src/screens/PaymentResultScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import transbankAPI from '../../api/transbank';
import { useCart } from '../../contexts/CartContext';

const PaymentResultScreen = ({ route, navigation }) => {
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState(null);

  // Obtener token de la URL
  const { token_ws, tbk_token, order_id } = route.params || {};

  useEffect(() => {
    const token = token_ws || tbk_token;
    
    if (token) {
      verifyPayment(token);
    } else if (order_id) {
      // Si viene solo order_id, verificar por ID
      verifyPaymentByOrderId(order_id);
    } else {
      setError('Token de pago no encontrado');
      setLoading(false);
    }
  }, [token_ws, tbk_token, order_id]);

  const verifyPayment = async (token) => {
    try {
      console.log('🔍 Verificando pago con token:', token);
      
      const result = await transbankAPI.confirmarPago(token);
      
      if (result.success) {
        setPaymentResult(result);
        
        if (result.estado === 'APPROVED' || result.response_code === 0) {
          // Pago exitoso
          console.log('✅ Pago aprobado');
          
          // Limpiar carrito
          if (clearCart) {
            await clearCart();
          }
          
          setTimeout(() => {
            navigation.replace('PaymentSuccess', { 
              orderData: result,
              paymentData: result 
            });
          }, 1500);
        } else {
          // Pago rechazado
          setError(`Pago rechazado: ${result.message || 'Error desconocido'}`);
        }
      } else {
        setError(result.error || 'Error al verificar el pago');
      }
    } catch (err) {
      console.error('❌ Error al verificar pago:', err);
      setError('Error de conexión al verificar el pago');
    } finally {
      setLoading(false);
    }
  };

  const verifyPaymentByOrderId = async (orderId) => {
    try {
      console.log('🔍 Verificando pago por order ID:', orderId);
      
      const result = await transbankAPI.obtenerEstadoPago(orderId);
      
      if (result.success) {
        setPaymentResult(result);
        
        if (result.estado === 'PAGADO' || result.estado === 'APPROVED') {
          console.log('✅ Pago confirmado por order ID');
          
          if (clearCart) {
            await clearCart();
          }
          
          setTimeout(() => {
            navigation.replace('PaymentSuccess', { 
              orderData: result,
              paymentData: result 
            });
          }, 1500);
        } else {
          setError(`Estado del pago: ${result.estado}`);
        }
      } else {
        setError(result.error || 'Error al verificar el estado del pago');
      }
    } catch (err) {
      console.error('❌ Error al verificar por order ID:', err);
      setError('Error de conexión al verificar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    const token = token_ws || tbk_token;
    if (token) {
      verifyPayment(token);
    } else if (order_id) {
      verifyPaymentByOrderId(order_id);
    }
  };

  const handleGoBack = () => {
    navigation.navigate('Cart');
  };

  const handleGoHome = () => {
    navigation.navigate('Home');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Verificando resultado del pago...</Text>
          <Text style={styles.subtitle}>Por favor espera un momento</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="close-circle" size={80} color="#f44336" />
          <Text style={styles.errorTitle}>Error en el Pago</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.retryButton]}
              onPress={handleRetry}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.buttonText}>Reintentar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={handleGoBack}
            >
              <Text style={styles.secondaryButtonText}>Volver al Carrito</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.tertiaryButton]}
              onPress={handleGoHome}
            >
              <Text style={styles.tertiaryButtonText}>Ir al Inicio</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Estado de procesamiento exitoso (antes de redirect)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.successTitle}>¡Pago Verificado!</Text>
        <Text style={styles.subtitle}>Redirigiendo a la confirmación...</Text>
        <ActivityIndicator size="small" color="#4CAF50" style={{ marginTop: 20 }} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tertiaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PaymentResultScreen;