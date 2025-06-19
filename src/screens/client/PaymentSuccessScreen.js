// src/screens/PaymentSuccessScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../contexts/CartContext';
import { useExchangeRate } from '../../contexts/ExchangeRateContext';

const PaymentSuccessScreen = ({ route, navigation }) => {
  const { clearCart } = useCart();
  const { formatCurrency } = useExchangeRate();
  const { orderData, paymentData } = route.params || {};
  
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Limpiar carrito al llegar aquí (por si no se hizo antes)
    if (clearCart) {
      clearCart();
    }
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShare = async () => {
    try {
      const message = `¡Compra exitosa en InvVent Store! 🎉\n\n` +
                     `Orden: ${getOrderNumber()}\n` +
                     `Monto: ${formatCurrency(getAmount())}\n` +
                     `Fecha: ${formatDate(getDate())}\n\n` +
                     `¡Gracias por tu compra!`;
      
      await Share.share({
        message: message,
        title: 'Compra Exitosa - InvVent Store'
      });
    } catch (error) {
      console.log('Error al compartir:', error);
    }
  };

  const handleViewOrders = () => {
    navigation.navigate('Orders');
  };

  const handleContinueShopping = () => {
    navigation.navigate('Home');
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contactar Soporte',
      '¿Cómo te gustaría contactarnos?',
      [
        {
          text: 'WhatsApp',
          onPress: () => {
            // Aquí podrías abrir WhatsApp con un número específico
            Alert.alert('WhatsApp', 'Funcionalidad en desarrollo');
          }
        },
        {
          text: 'Email',
          onPress: () => {
            Alert.alert('Email', 'soporte@invvent.com');
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  // Funciones auxiliares para obtener datos
  const getOrderNumber = () => {
    return orderData?.id || 
           orderData?.order || 
           paymentData?.order || 
           paymentData?.id || 
           'N/A';
  };

  const getAmount = () => {
    return orderData?.total || 
           orderData?.amount || 
           paymentData?.amount || 
           paymentData?.total || 
           0;
  };

  const getDate = () => {
    return orderData?.fecha_pago || 
           orderData?.created_at || 
           paymentData?.fecha_pago || 
           paymentData?.created_at || 
           new Date().toISOString();
  };

  const getAuthorizationCode = () => {
    return paymentData?.authorization_code || 
           paymentData?.auth_code || 
           orderData?.authorization_code ||
           'N/A';
  };

  const getCardType = () => {
    return paymentData?.card_type || 
           paymentData?.payment_type_code || 
           'Tarjeta';
  };

  const getLastFourDigits = () => {
    return paymentData?.card_number || 
           paymentData?.last_four_digits || 
           '****';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header de éxito */}
        <View style={styles.successHeader}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={100} color="#4CAF50" />
          </View>
          
          <Text style={styles.title}>¡Pago Exitoso!</Text>
          <Text style={styles.subtitle}>
            Tu compra ha sido procesada correctamente
          </Text>
          
          <View style={styles.orderNumberContainer}>
            <Text style={styles.orderNumberLabel}>Número de Orden</Text>
            <Text style={styles.orderNumber}>#{getOrderNumber()}</Text>
          </View>
        </View>

        {/* Resumen de la transacción */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Resumen de la Transacción</Text>
            <TouchableOpacity 
              onPress={() => setShowDetails(!showDetails)}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>
                {showDetails ? 'Ocultar' : 'Ver'} detalles
              </Text>
              <Ionicons 
                name={showDetails ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#2196F3" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Monto Total:</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(getAmount())}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fecha y Hora:</Text>
            <Text style={styles.summaryValue}>
              {formatDate(getDate())}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Método de Pago:</Text>
            <Text style={styles.summaryValue}>
              {getCardType()} ****{getLastFourDigits()}
            </Text>
          </View>

          {showDetails && (
            <View style={styles.detailsContainer}>
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Código de Autorización:</Text>
                <Text style={styles.detailValue}>{getAuthorizationCode()}</Text>
              </View>
              
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Estado:</Text>
                <View style={styles.statusContainer}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.approvedText}>APROBADO</Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Tipo de Transacción:</Text>
                <Text style={styles.detailValue}>Venta</Text>
              </View>
            </View>
          )}
        </View>

        {/* Información adicional */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
          <Text style={styles.infoText}>
            Recibirás un email de confirmación con los detalles de tu compra. 
            Tu pedido será preparado y estará listo para recoger en tienda.
          </Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleContinueShopping}
          >
            <Ionicons name="storefront-outline" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Continuar Comprando</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleViewOrders}
          >
            <Ionicons name="receipt-outline" size={20} color="#2196F3" />
            <Text style={styles.secondaryButtonText}>Ver Mis Pedidos</Text>
          </TouchableOpacity>

          <View style={styles.utilityButtons}>
            <TouchableOpacity 
              style={styles.utilityButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color="#666" />
              <Text style={styles.utilityButtonText}>Compartir</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.utilityButton}
              onPress={handleContactSupport}
            >
              <Ionicons name="help-circle-outline" size={20} color="#666" />
              <Text style={styles.utilityButtonText}>Soporte</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¡Gracias por confiar en InvVent Store! 🎉
          </Text>
          <Text style={styles.footerSubtext}>
            Tu satisfacción es nuestra prioridad
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  orderNumberContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderNumberLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  detailsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  approvedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2196F3',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  utilityButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  utilityButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  utilityButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default PaymentSuccessScreen;