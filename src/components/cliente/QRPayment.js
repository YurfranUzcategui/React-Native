// ===== src/components/cliente/QRPayment.js =====
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import codigosQrAPI from '../../api/codigosQr';
import { cajeroService } from '../../api/cajero';

const { width } = Dimensions.get('window');

const QRPayment = ({
  visible,
  onClose,
  orderData,
  totalAmount,
  onPaymentSuccess,
  onPaymentCancel
}) => {
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [remainingTime, setRemainingTime] = useState(300);
  const [qrData, setQrData] = useState('');
  const [qrId, setQrId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState(null);

  // Verificar pago directamente
  const verificarPagoDirecto = useCallback(async (numeroAtencion) => {
    try {
      console.log('🔍 Verificando pago para:', numeroAtencion);
      
      const response = await cajeroService.verificarPago(numeroAtencion);
      
      if (response.data.success && response.data.pagado) {
        console.log('🎉 ¡PAGO DETECTADO!');
        
        // Detener monitoreo
        if (monitoringInterval) {
          clearInterval(monitoringInterval);
          setMonitoringInterval(null);
        }
        
        setPaymentStatus('success');
        
        // Llamar callback de éxito
        setTimeout(() => {
          onPaymentSuccess?.();
        }, 1000);
        
        return true;
      } else {
        console.log('⏳ Pago aún pendiente...');
      }
    } catch (error) {
      console.warn('⚠️ Error en verificación:', error.message);
    }
    
    return false;
  }, [monitoringInterval, onPaymentSuccess]);

  // Iniciar monitoreo automático
  const iniciarMonitoreo = useCallback((numeroAtencion) => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
    }

    console.log('🔍 Iniciando monitoreo para:', numeroAtencion);
    
    const interval = setInterval(async () => {
      const pagado = await verificarPagoDirecto(numeroAtencion);
      if (pagado) {
        clearInterval(interval);
        setMonitoringInterval(null);
      }
    }, 3000); // Verificar cada 3 segundos

    setMonitoringInterval(interval);
    
    // Auto-detener después de 10 minutos
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setMonitoringInterval(null);
        console.log('⏰ Monitoreo detenido por timeout');
      }
    }, 600000);
    
  }, [verificarPagoDirecto, monitoringInterval]);

  // Generar QR
  const generarYGuardarQR = useCallback(async () => {
    if (qrGenerated || !orderData) return;
    
    try {
      setLoading(true);
      setError(null);
      setQrGenerated(true);
      
      console.log('=== QR PAYMENT: PROCESANDO DATOS ===');
      console.log('Order data recibida:', orderData);
      
      // Si ya tiene qr_id, solo mostrar el QR
      if (orderData.qr_id) {
        console.log('QR ya existe con ID:', orderData.qr_id);
        setQrData(JSON.stringify(orderData, null, 2));
        setQrId(orderData.qr_id);
        setPaymentStatus('pending');
        setRemainingTime(300);
        setLoading(false);
        
        // Iniciar monitoreo automático
        const numeroAtencion = orderData.numeroAtencion || orderData.numero_temporal;
        if (numeroAtencion) {
          iniciarMonitoreo(numeroAtencion);
        }
        
        return;
      }
      
      // Si no tiene qr_id, crear uno nuevo
      console.log('Creando nuevo QR en la base de datos...');
      
      const response = await codigosQrAPI.crear(orderData);
      
      console.log('QR guardado en BD:', response);
      
      if (response.success) {
        setQrData(JSON.stringify(orderData, null, 2));
        setQrId(response.qr.qr_id);
        setPaymentStatus('pending');
        setRemainingTime(300);
        
        console.log('QR configurado con ID:', response.qr.qr_id);
        
        // Iniciar monitoreo automático
        const numeroAtencion = orderData.numeroAtencion || orderData.numero_temporal;
        if (numeroAtencion) {
          iniciarMonitoreo(numeroAtencion);
        }
        
      } else {
        throw new Error('Error en la respuesta de la API');
      }
      
    } catch (error) {
      console.error('Error al procesar QR:', error);
      setError('Error al generar el código QR: ' + (error.error || error.message));
      setPaymentStatus('failed');
      setQrGenerated(false);
    } finally {
      setLoading(false);
    }
  }, [orderData, qrGenerated, iniciarMonitoreo]);

  // Resetear estados cuando se abre/cierra el modal
  useEffect(() => {
    if (visible) {
      if (!qrGenerated) {
        setPaymentStatus('pending');
        setRemainingTime(300);
        setQrData('');
        setQrId(null);
        setError(null);
        setLoading(false);
      }
    } else {
      // Limpiar monitoreo al cerrar
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
        setMonitoringInterval(null);
      }
      
      // Resetear todo al cerrar
      setQrGenerated(false);
      setPaymentStatus('pending');
      setRemainingTime(300);
      setQrData('');
      setQrId(null);
      setError(null);
      setLoading(false);
    }
  }, [visible, qrGenerated, monitoringInterval]);

  // Generar QR solo cuando se abre por primera vez
  useEffect(() => {
    if (visible && orderData && !qrGenerated && !loading) {
      generarYGuardarQR();
    }
  }, [visible, orderData, qrGenerated, loading, generarYGuardarQR]);

  // Contador regresivo
  useEffect(() => {
    if (!visible || paymentStatus !== 'pending') return;

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          setPaymentStatus('failed');
          // Detener monitoreo al expirar
          if (monitoringInterval) {
            clearInterval(monitoringInterval);
            setMonitoringInterval(null);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, paymentStatus, monitoringInterval]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleCopyQR = () => {
    Clipboard.setString(qrData);
    Alert.alert('Copiado', 'Datos QR copiados al portapapeles');
  };

  const handleClose = async () => {
    // Detener monitoreo al cerrar
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
    
    if (paymentStatus === 'success') {
      onPaymentSuccess?.();
    } else {
      onPaymentCancel?.();
    }
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    setPaymentStatus('pending');
    setQrGenerated(false);
    setLoading(false);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingTitle}>Generando código QR...</Text>
          <Text style={styles.loadingSubtitle}>Preparando tu código de pago</Text>
        </View>
      );
    }

    if (paymentStatus === 'success') {
      return (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.successTitle}>¡Pago exitoso!</Text>
          <Text style={styles.successSubtitle}>
            Tu pedido #{orderData?.numeroAtencion || orderData?.numero_temporal} ha sido confirmado
          </Text>
          <Text style={styles.successDescription}>
            Procesando información del pedido...
          </Text>
        </View>
      );
    }

    if (paymentStatus === 'failed') {
      return (
        <View style={styles.failedContainer}>
          <View style={styles.errorAlert}>
            <Ionicons name="warning" size={24} color="#f44336" />
            <Text style={styles.errorTitle}>
              {error || 'Tiempo de pago expirado'}
            </Text>
            <Text style={styles.errorDescription}>
              {error
                ? 'Hubo un problema al generar el código QR.'
                : 'El código QR ha expirado. Puedes intentar nuevamente o elegir otro método de pago.'
              }
            </Text>
          </View>
          
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Generar nuevo QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.changeMethodButton} onPress={handleClose}>
              <Text style={styles.changeMethodButtonText}>Cambiar método de pago</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Estado pending
    return (
      <View style={styles.pendingContainer}>
        <View style={styles.qrHeader}>
          <MaterialIcons name="qr-code" size={32} color="#2196F3" />
          <Text style={styles.qrTitle}>Escanea el código QR para pagar</Text>
          <Text style={styles.qrSubtitle}>
            El cajero procesará tu pago al ingresar el número de orden
          </Text>
        </View>

        {/* Código QR */}
        <View style={styles.qrContainer}>
          {qrData ? (
            <QRCode
              value={qrData}
              size={200}
              backgroundColor="white"
              color="black"
            />
          ) : (
            <View style={styles.qrPlaceholder}>
              <MaterialIcons name="qr-code" size={120} color="#ccc" />
              <Text style={styles.qrPlaceholderText}>
                {orderData?.numero_temporal}
              </Text>
            </View>
          )}
        </View>

        {/* Información del pago */}
        <View style={styles.paymentInfo}>
          <Text style={styles.amountLabel}>Monto a pagar:</Text>
          <Text style={styles.amountValue}>{formatPrice(totalAmount)}</Text>
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.orderLabel}>Número de orden:</Text>
          <View style={styles.orderChip}>
            <Text style={styles.orderNumber}>
              {orderData?.numero_temporal || orderData?.numeroAtencion}
            </Text>
          </View>
        </View>

        {/* Indicador de monitoreo */}
        {monitoringInterval && (
          <View style={styles.monitoringAlert}>
            <Ionicons name="search" size={16} color="#2196F3" />
            <Text style={styles.monitoringText}>
              Esperando confirmación del cajero...{'\n'}
              <Text style={styles.monitoringSubtext}>
                El sistema detectará automáticamente cuando se procese el pago
              </Text>
            </Text>
          </View>
        )}

        {/* Tiempo restante */}
        <View style={styles.timeAlert}>
          <Ionicons name="time" size={16} color="#FF9800" />
          <Text style={styles.timeText}>
            Tiempo restante: <Text style={styles.timeValue}>{formatTime(remainingTime)}</Text>
          </Text>
        </View>

        {/* Botón para copiar */}
        <TouchableOpacity style={styles.copyButton} onPress={handleCopyQR}>
          <Ionicons name="copy-outline" size={16} color="#2196F3" />
          <Text style={styles.copyButtonText}>Copiar datos del QR</Text>
        </TouchableOpacity>

        <Text style={styles.instructionText}>
          Proporciona el número de orden al cajero para procesar tu pago
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={paymentStatus === 'success' ? handleClose : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pago con Código QR</Text>
          {paymentStatus !== 'success' && (
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Content */}
        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {paymentStatus === 'success' ? (
            <TouchableOpacity style={styles.continueButton} onPress={handleClose}>
              <Text style={styles.continueButtonText}>Continuar</Text>
            </TouchableOpacity>
          ) : paymentStatus === 'pending' ? (
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancelar pago</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // PaymentReceipt Styles
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  closeButton: {
    padding: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  receiptCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 10,
  },
  receiptType: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  infoSection: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  productsSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 15,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  productCategory: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  tableCell: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  tableCellBold: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  totalsSection: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#333',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  paymentSection: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: 15,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  paymentInfo: {
    marginBottom: 0,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  thanksSection: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  thanksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  thanksSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    gap: 5,
  },
  actionButtonText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },

  // QRPayment Styles
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  successDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  failedContainer: {
    paddingVertical: 40,
  },
  errorAlert: {
    backgroundColor: '#FFEBEE',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  changeMethodButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeMethodButtonText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  pendingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 30,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  qrPlaceholderText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  paymentInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  orderInfo: {
    alignItems: 'center',
    marginBottom: 25,
  },
  orderLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  orderChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  monitoringAlert: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'flex-start',
    width: '100%',
  },
  monitoringText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 8,
    flex: 1,
  },
  monitoringSubtext: {
    fontSize: 12,
    color: '#1976D2',
  },
  timeAlert: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    width: '100%',
  },
  timeText: {
    fontSize: 14,
    color: '#F57C00',
    marginLeft: 8,
  },
  timeValue: {
    fontWeight: 'bold',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 20,
    marginBottom: 15,
  },
  copyButtonText: {
    color: '#2196F3',
    fontSize: 12,
    marginLeft: 5,
  },
  instructionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  continueButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
});

export { QRPayment };