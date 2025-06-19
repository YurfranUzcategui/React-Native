// src/screens/client/OrderSuccessScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import transbankAPI from '../../api/transbank';

const OrderSuccessScreen = ({ navigation, route }) => {
  const { 
    orderData, 
    paymentMethod, 
    paymentData, 
    fromQR = false,
    // Parámetros para Transbank
    status, 
    pedidoId, 
    buyOrder, 
    amount, 
    authorizationCode, 
    responseCode, 
    token, 
    message,
    tempToken,
    bypassCajero,
    tokenWs 
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [processedPaymentData, setProcessedPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Determinar si es resultado de Transbank
  const isTransbankResult = tokenWs || status || token;

  useEffect(() => {
    if (isTransbankResult) {
      processTransbankResult();
    }
  }, []);

  const processTransbankResult = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('=== PROCESANDO RESULTADO DE TRANSBANK ===');
      console.log('Parámetros:', { status, tokenWs, tempToken });

      // Manejar token_ws directo de Transbank
      if (tokenWs) {
        try {
          const result = await transbankAPI.obtenerResultado(tokenWs);
          console.log('✅ Resultado de Transbank:', result);
          
          if (!result.success) {
            throw new Error(result.error || 'Error al confirmar transacción');
          }
          
          // Manejar token temporal para restaurar sesión
          if (result.temp_token) {
            console.log('🔐 Restaurando sesión con token temporal');
            try {
              await AsyncStorage.setItem('token', result.temp_token);
              
              const payload = JSON.parse(atob(result.temp_token.split('.')[1]));
              const userData = {
                id: payload.cliente_id,
                cliente_id: payload.cliente_id,
                usuario_id: payload.usuario_id,
                nombre: payload.nombre,
                email: payload.email,
                temp: true
              };
              await AsyncStorage.setItem('user', JSON.stringify(userData));
              setSessionRestored(true);
            } catch (decodeError) {
              console.warn('⚠️ Error al decodificar token temporal:', decodeError);
            }
          }
          
          setProcessedPaymentData({
            success: true,
            status: 'success',
            pedido_id: result.pedido_id,
            buy_order: result.buy_order,
            amount: result.amount,
            authorization_code: result.authorization_code,
            response_code: result.response_code,
            transaction_date: result.transaction_date,
            message: result.message || 'Pago procesado exitosamente',
            pedido_estado: result.pedido_estado,
            bypass_cajero: result.bypass_cajero,
            forced_success: result.forced_success,
            development_mode: result.development_mode
          });
          
        } catch (confirmError) {
          console.error('❌ Error al confirmar Transbank:', confirmError);
          setError(`Error al confirmar la transacción: ${confirmError.message}`);
        }
      } 
      // Manejar token temporal si viene en parámetros normales
      else if (tempToken) {
        console.log('🔐 Restaurando sesión con token temporal');
        try {
          await AsyncStorage.setItem('token', tempToken);
          
          const payload = JSON.parse(atob(tempToken.split('.')[1]));
          const userData = {
            id: payload.cliente_id,
            cliente_id: payload.cliente_id,
            usuario_id: payload.usuario_id,
            nombre: payload.nombre,
            email: payload.email,
            temp: true
          };
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          setSessionRestored(true);
        } catch (decodeError) {
          console.warn('⚠️ Error al decodificar token temporal:', decodeError);
        }

        setProcessedPaymentData({
          success: status === 'success',
          pedido_id: pedidoId,
          buy_order: buyOrder,
          amount: amount,
          authorization_code: authorizationCode,
          response_code: responseCode,
          status: status,
          message: message ? decodeURIComponent(message) : undefined,
          bypass_cajero: bypassCajero === 'true'
        });
      } 
      // Manejo normal con parámetros existentes
      else {
        const currentStatus = status || 'unknown';
        const decodedMessage = message ? decodeURIComponent(message) : 'Sin información adicional';
        
        setProcessedPaymentData({
          success: currentStatus === 'success',
          pedido_id: pedidoId,
          buy_order: buyOrder,
          amount: amount,
          authorization_code: authorizationCode,
          response_code: responseCode,
          status: currentStatus,
          message: decodedMessage,
          bypass_cajero: bypassCajero === 'true'
        });
      }

    } catch (error) {
      console.error('❌ Error al procesar resultado:', error);
      setError('Error al procesar el resultado del pago');
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'ProductCatalog' }],
      })
    );
  };

  const handleViewOrders = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'ProductCatalog' },
          { name: 'OrdersScreen' }
        ],
      })
    );
  };

  const handleRetryPayment = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'ProductCatalog' },
          { name: 'CartScreen' }
        ],
      })
    );
  };

  const handleContinueShopping = async () => {
    // Limpiar token temporal si existe
    try {
      const currentUser = await AsyncStorage.getItem('user');
      if (currentUser) {
        const userData = JSON.parse(currentUser);
        if (userData.temp) {
          console.log('🧹 Limpiando sesión temporal');
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
        }
      }
    } catch (error) {
      console.error('Error al limpiar sesión temporal:', error);
    }
    
    handleGoHome();
  };

  const getPaymentIcon = () => {
    if (isTransbankResult) return 'card-outline';
    
    switch(paymentMethod) {
      case 'cash': return 'cash-outline';
      case 'transbank': return 'card-outline';
      case 'qr': return 'qr-code-outline';
      default: return 'card-outline';
    }
  };

  const getPaymentText = () => {
    if (isTransbankResult) return 'Transbank';
    
    switch(paymentMethod) {
      case 'cash': return 'Pago en Caja';
      case 'transbank': return 'Transbank';
      case 'qr': return 'Código QR';
      default: return 'Pago procesado';
    }
  };

  const getPaymentDescription = () => {
    if (isTransbankResult) {
      return processedPaymentData?.bypass_cajero 
        ? 'Tu pedido ha sido confirmado automáticamente y está en preparación' 
        : 'Tu pago ha sido procesado de forma segura a través de Transbank';
    }
    
    switch(paymentMethod) {
      case 'cash': 
        return fromQR 
          ? 'Tu pago ha sido procesado exitosamente en caja' 
          : 'Puedes pagar en efectivo o con tarjeta al recoger tu pedido en la tienda';
      case 'transbank': 
        return 'Tu pago ha sido procesado de forma segura a través de Transbank';
      case 'qr': 
        return 'Tu pago por código QR ha sido confirmado exitosamente';
      default: 
        return 'Tu pago ha sido procesado correctamente';
    }
  };

  const formatPrice = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getDisplayAmount = () => {
    if (processedPaymentData?.amount) return processedPaymentData.amount;
    if (orderData?.total) return orderData.total;
    if (orderData?.resumen?.total_final) return orderData.resumen.total_final;
    if (paymentData?.amount) return paymentData.amount;
    return null;
  };

  const getOrderNumber = () => {
    if (processedPaymentData?.pedido_id) return processedPaymentData.pedido_id;
    if (orderData?.numeroAtencion) return orderData.numeroAtencion;
    if (orderData?.numero_temporal) return orderData.numero_temporal;
    return 'N/A';
  };

  const getStatusIcon = () => {
    if (error) return <Ionicons name="warning" size={100} color="#f44336" />;
    if (processedPaymentData?.success === false) return <Ionicons name="close-circle" size={100} color="#f44336" />;
    return <Ionicons name="checkmark-circle" size={100} color="#4CAF50" />;
  };

  const getTitle = () => {
    if (error) return 'Error en el pago';
    if (processedPaymentData?.success === false) return 'Pago fallido';
    if (isTransbankResult) return '¡Pago exitoso!';
    if (fromQR) return '¡Pago exitoso!';
    return '¡Pedido realizado con éxito!';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingTitle}>
          Procesando resultado del pago...
        </Text>
        <Text style={styles.loadingSubtitle}>
          Por favor espera mientras verificamos tu transacción
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        {/* Mensaje de sesión restaurada */}
        {sessionRestored && (
          <View style={styles.sessionAlert}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
            <Text style={styles.sessionAlertText}>
              Tu sesión ha sido restaurada automáticamente después del pago.
            </Text>
          </View>
        )}

        {/* Icono de éxito/error */}
        <View style={styles.successIconContainer}>
          <View style={styles.successIconCircle}>
            {getStatusIcon()}
          </View>
        </View>

        {/* Mensaje principal */}
        <Text style={styles.successTitle}>
          {getTitle()}
        </Text>
        
        {/* Número de pedido */}
        <View style={styles.orderNumberContainer}>
          <Text style={styles.orderNumberLabel}>Número de pedido:</Text>
          <Text style={styles.orderNumber}>#{getOrderNumber()}</Text>
        </View>

        {/* Información de pago */}
        <View style={styles.paymentInfoContainer}>
          <View style={styles.paymentHeader}>
            <Ionicons name={getPaymentIcon()} size={24} color="#2196F3" />
            <Text style={styles.paymentMethod}>{getPaymentText()}</Text>
          </View>
          <Text style={styles.paymentDescription}>
            {getPaymentDescription()}
          </Text>
          
          {/* Mostrar monto si está disponible */}
          {getDisplayAmount() && (
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Monto pagado:</Text>
              <Text style={styles.amountValue}>
                {formatPrice(getDisplayAmount())}
              </Text>
            </View>
          )}
        </View>

        {/* Detalles de Transbank si están disponibles */}
        {isTransbankResult && processedPaymentData && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Detalles de la transacción</Text>
            
            {processedPaymentData.buy_order && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Orden de compra:</Text>
                <Text style={styles.detailValue}>{processedPaymentData.buy_order}</Text>
              </View>
            )}

            {processedPaymentData.authorization_code && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Código autorización:</Text>
                <Text style={styles.detailValue}>{processedPaymentData.authorization_code}</Text>
              </View>
            )}

            {processedPaymentData.response_code !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Código respuesta:</Text>
                <View style={[
                  styles.chip,
                  { backgroundColor: processedPaymentData.response_code == 0 ? '#E8F5E9' : '#FFEBEE' }
                ]}>
                  <Text style={[
                    styles.chipText,
                    { color: processedPaymentData.response_code == 0 ? '#4CAF50' : '#f44336' }
                  ]}>
                    {processedPaymentData.response_code}
                  </Text>
                </View>
              </View>
            )}

            {processedPaymentData.transaction_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fecha:</Text>
                <Text style={styles.detailValue}>
                  {new Date(processedPaymentData.transaction_date).toLocaleString('es-CL')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Información adicional */}
        <View style={styles.infoContainer}>
          <Ionicons name="mail-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Recibirás una confirmación por correo electrónico
          </Text>
        </View>

        {!fromQR && !isTransbankResult && (
          <View style={styles.infoContainer}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Tu pedido estará listo en aproximadamente 30-45 minutos
            </Text>
          </View>
        )}

        {(fromQR || processedPaymentData?.bypass_cajero) && (
          <View style={styles.infoContainer}>
            <Ionicons name="restaurant-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Tu pedido está siendo preparado en este momento
            </Text>
          </View>
        )}

        {/* Alertas según resultado */}
        {processedPaymentData?.success && (
          <View style={[styles.alertCard, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={[styles.alertText, { color: '#2E7D32' }]}>
              {processedPaymentData?.bypass_cajero 
                ? 'Tu pedido ha sido confirmado automáticamente y está en preparación.' 
                : 'Tu pedido ha sido confirmado y será procesado a la brevedad.'
              } Recibirás una confirmación por correo electrónico.
            </Text>
          </View>
        )}

        {processedPaymentData?.success === false && (
          <View style={[styles.alertCard, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="close-circle" size={20} color="#f44336" />
            <Text style={[styles.alertText, { color: '#C62828' }]}>
              {processedPaymentData?.message || 'El pago no pudo ser procesado. Puedes intentar nuevamente o contactar con soporte.'}
            </Text>
          </View>
        )}

        {error && (
          <View style={[styles.alertCard, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="warning" size={20} color="#f44336" />
            <Text style={[styles.alertText, { color: '#C62828' }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.buttonsContainer}>
          {(error || processedPaymentData?.success === false) ? (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={handleRetryPayment}>
                <Text style={styles.primaryButtonText}>Reintentar pago</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
                <Ionicons name="home-outline" size={20} color="#2196F3" style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>Ir al inicio</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {sessionRestored ? (
                <TouchableOpacity style={styles.primaryButton} onPress={handleViewOrders}>
                  <Ionicons name="receipt-outline" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>Ver mis pedidos</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryButton} onPress={isTransbankResult ? handleContinueShopping : handleGoHome}>
                  <Ionicons name="home-outline" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>
                    {isTransbankResult ? 'Continuar comprando' : 'Ir al inicio'}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.secondaryButton} onPress={handleViewOrders}>
                <Ionicons name="receipt-outline" size={20} color="#2196F3" style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>Ver mis pedidos</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Información de soporte */}
        <View style={styles.supportContainer}>
          <Text style={styles.supportTitle}>
            {error || processedPaymentData?.success === false 
              ? '¿Tienes problemas con tu pago?' 
              : '¿Tienes problemas con tu pedido?'
            }
          </Text>
          <Text style={styles.supportEmail}>soporte@invvent.com</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  sessionAlert: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  sessionAlertText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 10,
    flex: 1,
  },
  successIconContainer: {
    marginBottom: 30,
  },
  successIconCircle: {
    backgroundColor: '#e8f5e9',
    borderRadius: 100,
    padding: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 20,
  },
  orderNumberContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  orderNumberLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentInfoContainer: {
    backgroundColor: '#f0f8ff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
    width: '100%',
    maxWidth: 400,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethod: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8,
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  detailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 400,
  },
  alertText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 400,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 30,
    paddingHorizontal: 20,
    maxWidth: 400,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  supportContainer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  supportEmail: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
});

export default OrderSuccessScreen;