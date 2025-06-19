// ===== src/components/cliente/PaymentReceipt.js =====
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

const PaymentReceipt = ({ 
  visible, 
  onClose, 
  orderData, 
  paymentData,
  onContinue 
}) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleShare = async () => {
    try {
      const content = generateReceiptText();
      await Share.share({
        message: content,
        title: 'Boleta de Pago - InvVent Store'
      });
    } catch (error) {
      console.error('Error al compartir:', error);
      Alert.alert('Error', 'No se pudo compartir la boleta');
    }
  };

  const handleDownload = async () => {
    try {
      const content = generateReceiptText();
      const fileName = `boleta_${orderData?.numero_temporal || 'pedido'}.txt`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, content);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Éxito', `Boleta guardada como ${fileName}`);
      }
    } catch (error) {
      console.error('Error al descargar:', error);
      Alert.alert('Error', 'No se pudo guardar la boleta');
    }
  };

  const generateReceiptText = () => {
    return `
═══════════════════════════════════════════
            INVVENT STORE
         BOLETA DE PAGO EXITOSO
═══════════════════════════════════════════

📅 Fecha: ${formatDate(new Date())}
🎫 N° Orden: ${orderData?.numero_temporal || orderData?.numeroAtencion || 'N/A'}
👤 Cliente: ${orderData?.cliente?.nombre || 'Cliente'}
📧 Email: ${orderData?.cliente?.email || 'N/A'}

═══════════════════════════════════════════
                 PRODUCTOS
═══════════════════════════════════════════

${orderData?.carrito?.map(item => 
  `${item.cantidad}x ${item.producto_nombre}
   $${item.precio_unitario} c/u = ${formatPrice(item.subtotal)}`
).join('\n\n') || 'Sin productos'}

═══════════════════════════════════════════
                  RESUMEN
═══════════════════════════════════════════

Subtotal: ${formatPrice(orderData?.resumen?.subtotal || 0)}
${orderData?.resumen?.descuento > 0 ? `Descuento: -${formatPrice(orderData.resumen.descuento)}` : ''}
TOTAL: ${formatPrice(orderData?.resumen?.total_final || 0)}

═══════════════════════════════════════════
                   PAGO
═══════════════════════════════════════════

💳 Método: ${paymentData?.metodo_pago || 'EFECTIVO'}
✅ Estado: PAGADO EXITOSAMENTE
🏪 Procesado en caja

═══════════════════════════════════════════
¡Gracias por su compra!
Conserve esta boleta como comprobante
═══════════════════════════════════════════
    `;
  };

  if (!orderData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.successHeader}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>¡Pago Exitoso!</Text>
              <Text style={styles.headerSubtitle}>Su pedido ha sido procesado correctamente</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header de la boleta */}
          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <Ionicons name="receipt" size={48} color="#2196F3" />
              <Text style={styles.storeName}>INVVENT STORE</Text>
              <Text style={styles.receiptType}>Boleta de Pago</Text>
            </View>

            <View style={styles.divider} />

            {/* Información del pedido */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fecha y Hora:</Text>
                <Text style={styles.infoValue}>{formatDate(new Date())}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>N° de Orden:</Text>
                <Text style={styles.infoValue}>
                  {orderData.numero_temporal || orderData.numeroAtencion}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cliente:</Text>
                <Text style={styles.infoValue}>
                  {orderData.cliente?.nombre || 'Cliente'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>
                  {orderData.cliente?.email || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Productos */}
            <View style={styles.productsSection}>
              <Text style={styles.sectionTitle}>Productos Comprados</Text>
              
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Producto</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Cant.</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Precio</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
                </View>
                
                {orderData.carrito?.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.productName}>{item.producto_nombre}</Text>
                      {item.categoria && (
                        <Text style={styles.productCategory}>{item.categoria}</Text>
                      )}
                    </View>
                    <Text style={[styles.tableCell, { textAlign: 'center' }]}>
                      {item.cantidad}
                    </Text>
                    <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                      {formatPrice(item.precio_unitario)}
                    </Text>
                    <Text style={[styles.tableCellBold, { textAlign: 'right' }]}>
                      {formatPrice(item.subtotal)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Totales */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>
                  {formatPrice(orderData.resumen?.subtotal || 0)}
                </Text>
              </View>
              
              {orderData.resumen?.descuento > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: '#4CAF50' }]}>Descuento:</Text>
                  <Text style={[styles.totalValue, { color: '#4CAF50' }]}>
                    -{formatPrice(orderData.resumen.descuento)}
                  </Text>
                </View>
              )}
              
              <View style={styles.divider} />
              
              <View style={styles.totalRow}>
                <Text style={styles.finalTotalLabel}>TOTAL PAGADO:</Text>
                <Text style={styles.finalTotalValue}>
                  {formatPrice(orderData.resumen?.total_final || 0)}
                </Text>
              </View>
            </View>

            {/* Información del pago */}
            <View style={styles.paymentSection}>
              <View style={styles.paymentHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.paymentTitle}>Información del Pago</Text>
              </View>
              
              <View style={styles.paymentInfo}>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Método de Pago:</Text>
                  <Text style={styles.paymentValue}>
                    {paymentData?.metodo_pago || 'EFECTIVO'}
                  </Text>
                </View>
                
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Estado:</Text>
                  <Text style={[styles.paymentValue, { color: '#4CAF50' }]}>
                    ✅ PAGADO EXITOSAMENTE
                  </Text>
                </View>
                
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Procesado en:</Text>
                  <Text style={styles.paymentValue}>
                    🏪 Caja - InvVent Store
                  </Text>
                </View>
              </View>
            </View>

            {/* Mensaje de agradecimiento */}
            <View style={styles.thanksSection}>
              <Text style={styles.thanksTitle}>¡Gracias por su compra!</Text>
              <Text style={styles.thanksSubtitle}>
                Conserve esta boleta como comprobante de su pago
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Botones de acción */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Compartir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
            <Ionicons name="download-outline" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Descargar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </TouchableOpacity>
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

export { PaymentReceipt};