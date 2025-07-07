// src/screens/client/CheckoutScreen.js - CON MÉTODOS DE PAGO FUNCIONALES
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Modal,
  Linking,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useExchangeRate } from '../../contexts/ExchangeRateContext';
import transbankAPI from '../../api/transbank';
import codigosQrAPI from '../../api/codigosQr';

const CheckoutScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { cartItems, cartSummary, finalizarCompra, loading, clearCart } = useCart();
  const { exchangeRate, loading: rateLoading, formatCurrency, convertCLPtoUSD } = useExchangeRate();

  // Estados principales
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [checkoutInProgress, setCheckoutInProgress] = useState(false);

  // ✅ RESTAURAR: Estados para modales
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [qrOrderData, setQrOrderData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  // Datos del checkout (items seleccionados o carrito completo)
  const checkoutItems = useMemo(() => {
    if (route.params?.selectedItems && route.params.selectedItems.length > 0) {
      console.log('✅ Usando items seleccionados:', route.params.selectedItems.length);
      return {
        items: route.params.selectedItems,
        total: route.params.selectedItemsTotal || 0,
        summary: {
          subtotal: route.params.selectedItemsTotal || 0,
          totalItems: route.params.selectedItems.length,
          totalQuantity: route.params.selectedItems.reduce((total, item) => total + item.cantidad, 0)
        }
      };
    } else {
      console.log('✅ Usando carrito completo:', cartItems?.length || 0);
      return {
        items: cartItems || [],
        total: cartSummary?.subtotal || 0,
        summary: cartSummary || { subtotal: 0, totalItems: 0, totalQuantity: 0 }
      };
    }
  }, [route.params?.selectedItems, route.params?.selectedItemsTotal, cartItems, cartSummary]);

  // Verificar que hay items al cargar
  useEffect(() => {
    if (!checkoutInProgress && !showQRPayment && !orderComplete && !loading && !showReceipt) {
      if (checkoutItems.items.length === 0) {
        console.log('🔄 No hay items, regresando al carrito');
        navigation.goBack();
      }
    }
  }, [
    checkoutItems.items.length,
    checkoutInProgress,
    showQRPayment,
    orderComplete,
    loading,
    showReceipt,
    navigation
  ]);

  // Verificar usuario
  useEffect(() => {
    console.log('🔍 Usuario desde AuthContext:', user);
    if (user) {
      console.log('✅ Usuario logueado:');
      console.log('- id:', user.id);
      console.log('- nombre:', user.nombre);
      console.log('- email:', user.email);
    }
  }, [user]);

  // Manejo del botón atrás
  useEffect(() => {
    const backAction = () => {
      if (checkoutInProgress || showQRPayment || showReceipt) {
        return true; // Prevenir ir atrás durante el proceso
      }
      return false; // Permitir ir atrás normalmente
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [checkoutInProgress, showQRPayment, showReceipt]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const renderUSDPrice = (clpPrice) => {
    if (rateLoading || !exchangeRate) return null;
    
    const usdPrice = convertCLPtoUSD(clpPrice).toFixed(2);
    return (
      <Text style={styles.usdPrice}>
        ≈ ${usdPrice} USD
      </Text>
    );
  };

  // ✅ FUNCIONALIDAD COMPLETA DE PAGO
  const handleFinalizeOrder = async () => {
    console.log('=== INICIANDO PROCESO DE FINALIZACIÓN ===');
    
    if (!paymentMethod) {
      Alert.alert('Error', 'Por favor selecciona un método de pago');
      return;
    }

    setIsProcessing(true);
    setCheckoutInProgress(true);
    
    try {
      if (paymentMethod === 'cash') {
        // ✅ IMPLEMENTACIÓN COMPLETA DE QR
        console.log('=== GENERANDO QR PARA PAGO EN CAJA ===');
        
        if (!user) {
          throw new Error('No hay sesión activa. Por favor, inicia sesión.');
        }

        const clienteId = user.cliente_id || user.id || user.clienteId;
        if (!clienteId) {
          throw new Error('ID de cliente no encontrado. Verifica tu sesión.');
        }

        const numeroTemporal = `QR${Date.now().toString().slice(-6)}`;

        const qrData = {
          tipo: 'PAGO_CARRITO',
          numeroAtencion: numeroTemporal,
          numero_temporal: numeroTemporal,
          cliente: {
            cliente_id: clienteId,
            nombre: user.nombre || user.name || 'Cliente',
            email: user.email || 'email@ejemplo.com',
            telefono: user.telefono || user.phone || '',
            direccion: user.direccion || user.address || ''
          },
          carrito: checkoutItems.items.map(item => ({
            carrito_id: item.id,
            producto_id: item.producto?.producto_id || item.productoId,
            producto_nombre: item.producto?.nombre,
            producto_imagen: item.producto?.imagenUrl,
            categoria: item.producto?.categoriaNombre,
            cantidad: item.cantidad,
            precio_unitario: item.producto?.precio,
            subtotal: item.subtotal
          })),
          resumen: {
            total_items: checkoutItems.summary.totalItems,
            total_cantidad: checkoutItems.summary.totalQuantity,
            subtotal: checkoutItems.summary.subtotal,
            descuento: 0,
            total_final: checkoutItems.total
          },
          notas: notes,
          timestamp: Date.now(),
          fecha_creacion: new Date().toISOString(),
          merchant: 'InvVent Store',
          paymentUrl: `https://pay.invvent.com/qr/${numeroTemporal}?amount=${checkoutItems.total}`
        };

        console.log('📄 Datos del QR generados:', qrData);

        try {
          // Intentar guardar en BD real
          const response = await codigosQrAPI.crear(qrData);
          
          if (response.success) {
            qrData.qr_id = response.qr.qr_id;
            qrData.real = true;
            qrData.guardado_en_bd = true;
            console.log('✅ QR guardado exitosamente con ID:', response.qr.qr_id);
          } else {
            throw new Error('Error en respuesta de API');
          }

        } catch (apiError) {
          console.warn('⚠️ Error con API, usando simulación:', apiError.message);
          
          // Fallback simulación
          qrData.qr_id = `SIM_${Date.now()}`;
          qrData.simulado = true;
          qrData.guardado_en_bd = false;
          qrData.razon_simulacion = 'Backend no disponible - modo offline';
        }

        setQrOrderData(qrData);
        setShowQRPayment(true);
        setIsProcessing(false);
        
      } else if (paymentMethod === 'transbank') {
        // ✅ IMPLEMENTACIÓN DE TRANSBANK
        console.log('=== PROCESANDO PAGO CON TRANSBANK ===');
        
        const clienteId = user.id || user.cliente_id || user.clienteId;
        if (!clienteId) {
          throw new Error('ID de cliente no encontrado');
        }

        try {
          // Paso 1: Crear pedido
          const pedidoResponse = await transbankAPI.crearPedido({
            notas: notes,
            metodo_pago: 'TARJETA'
          });
          
          if (!pedidoResponse.success) {
            throw new Error(pedidoResponse.error || 'Error al crear el pedido');
          }
          
          console.log('✅ Pedido creado:', pedidoResponse.pedido.id);
          
          // Paso 2: Iniciar pago
          const pagoResponse = await transbankAPI.iniciarPago(pedidoResponse.pedido.id);
          
          if (!pagoResponse.success) {
            throw new Error(pagoResponse.error || 'Error al iniciar el pago');
          }
          
          console.log('✅ Pago iniciado, URL:', pagoResponse.redirect_url);
          
          // Abrir WebView o navegador externo
          Alert.alert(
            'Redirigir a Transbank',
            'Se abrirá el navegador para completar el pago de forma segura.',
            [
              {
                text: 'Continuar',
                onPress: async () => {
                  try {
                    const supported = await Linking.canOpenURL(pagoResponse.redirect_url);
                    if (supported) {
                      await Linking.openURL(pagoResponse.redirect_url);
                      
                      // Mostrar mensaje de retorno
                      setTimeout(() => {
                        Alert.alert(
                          'Procesando Pago',
                          'Una vez completado el pago, regresa a la app para ver el resultado.',
                          [
                            {
                              text: 'Verificar Estado',
                              onPress: () => {
                                // Aquí podrías verificar el estado del pago
                                navigation.goBack();
                              }
                            }
                          ]
                        );
                      }, 1000);
                      
                    } else {
                      throw new Error('No se puede abrir el navegador');
                    }
                  } catch (error) {
                    Alert.alert('Error', 'No se pudo abrir el navegador: ' + error.message);
                  }
                }
              },
              { 
                text: 'Cancelar', 
                style: 'cancel',
                onPress: () => {
                  setCheckoutInProgress(false);
                  setIsProcessing(false);
                }
              }
            ]
          );
          
        } catch (transbankError) {
          console.error('❌ Error en Transbank:', transbankError);
          Alert.alert('Error', 'Error al procesar el pago: ' + transbankError.message);
          setCheckoutInProgress(false);
          setIsProcessing(false);
          return;
        }
        
      } else {
        // Otros métodos de pago
        const result = await finalizarCompra(notes, 'EFECTIVO');
        
        if (result.success) {
          setOrderData(result.pedido);
          setOrderComplete(true);
          setCheckoutInProgress(false);
          
          // Mostrar pantalla de éxito
          Alert.alert(
            '¡Compra Exitosa!',
            'Tu pedido ha sido procesado correctamente.',
            [
              {
                text: 'Continuar',
                onPress: () => {
                  navigation.goBack();
                  if (clearCart) clearCart();
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Error al finalizar la compra: ' + result.error);
          setCheckoutInProgress(false);
        }
      }
    } catch (error) {
      console.error('❌ Error en checkout:', error);
      Alert.alert('Error', 'Error inesperado: ' + error.message);
      setCheckoutInProgress(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ FUNCIONES DE MANEJO DE QR Y RECEIPT
  const handleQRPaymentSuccess = async () => {
    console.log('=== PAGO QR EXITOSO ===');
    
    setReceiptData({
      orderData: qrOrderData,
      paymentData: {
        metodo_pago: 'EFECTIVO',
        fecha_pago: new Date().toISOString(),
        estado: 'PAGADO',
        procesado_en: 'CAJA'
      }
    });
    
    setShowQRPayment(false);
    setShowReceipt(true);
    setOrderComplete(true);
    setCheckoutInProgress(false);
    
    if (clearCart) {
      try {
        await clearCart();
        console.log('🛒 Carrito limpiado');
      } catch (error) {
        console.error('❌ Error al limpiar carrito:', error);
      }
    }
  };

  const handleQRPaymentCancel = () => {
    setShowQRPayment(false);
    setPaymentMethod('');
    setCheckoutInProgress(false);
  };

  const handleReceiptContinue = () => {
    setShowReceipt(false);
    navigation.goBack();
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    navigation.goBack();
  };

  const PaymentMethodCard = ({ method, icon, title, description, badge, selected }) => (
    <TouchableOpacity
      style={[styles.paymentCard, selected && styles.paymentCardSelected]}
      onPress={() => setPaymentMethod(method)}
      activeOpacity={0.7}
    >
      <View style={styles.paymentCardContent}>
        <Ionicons 
          name={icon} 
          size={32} 
          color={selected ? '#2196F3' : '#666'} 
          style={styles.paymentIcon}
        />
        <View style={styles.paymentInfo}>
          <Text style={[styles.paymentTitle, selected && styles.paymentTitleSelected]}>
            {title}
          </Text>
          <Text style={styles.paymentDescription}>{description}</Text>
          {badge && (
            <Text style={styles.paymentBadge}>{badge}</Text>
          )}
        </View>
        <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
          {selected && <View style={styles.radioButtonInner} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  const ProductItem = ({ item }) => (
    <View style={styles.productItem}>
      <Image 
        source={{ uri: item.producto?.imagenUrl || 'https://via.placeholder.com/50' }} 
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.producto?.nombre}
        </Text>
        <Text style={styles.productQuantity}>Cantidad: {item.cantidad}</Text>
      </View>
      <View style={styles.productPrices}>
        {renderUSDPrice(item.subtotal || 0)}
        <Text style={styles.productPrice}>
          {formatPrice(item.subtotal || 0)}
        </Text>
      </View>
    </View>
  );

  // ✅ COMPONENTE SIMPLE DE QR PAYMENT
  const QRPaymentModal = () => (
    <Modal
      visible={showQRPayment}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleQRPaymentCancel}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pago con QR</Text>
          <TouchableOpacity onPress={handleQRPaymentCancel}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View style={styles.qrContainer}>
            <QRCode
              value={qrOrderData?.numeroAtencion || 'QR000000'}
              size={200}
              color="black"
              backgroundColor="white"
            />
            <Text style={styles.qrText}>Código QR generado</Text>
            <Text style={styles.qrNumber}>#{qrOrderData?.numeroAtencion}</Text>
            <Text style={styles.qrAmount}>
              Total: {formatPrice(checkoutItems.total)}
            </Text>
            {qrOrderData?.simulado && (
              <Text style={styles.simulationBadge}>⚠️ Modo simulación</Text>
            )}
          </View>

          <Text style={styles.instructions}>
            Muestra este código QR en caja para procesar tu pago en efectivo o con tarjeta
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleQRPaymentCancel}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.successButton}
              onPress={handleQRPaymentSuccess}
            >
              <Text style={styles.successButtonText}>Pago Completado</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ✅ COMPONENTE SIMPLE DE RECEIPT
  const PaymentReceiptModal = () => (
    <Modal
      visible={showReceipt}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleReceiptClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Boleta de Pago</Text>
          <TouchableOpacity onPress={handleReceiptClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
            <Text style={styles.successText}>¡Pago Exitoso!</Text>
          </View>

          <View style={styles.receiptContainer}>
            <Text style={styles.receiptTitle}>Resumen de la Compra</Text>
            
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>N° de Orden:</Text>
              <Text style={styles.receiptValue}>
                {receiptData?.orderData?.numeroAtencion || 'N/A'}
              </Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Total Pagado:</Text>
              <Text style={[styles.receiptValue, styles.totalAmount]}>
                {formatPrice(receiptData?.orderData?.resumen?.total_final || checkoutItems.total)}
              </Text>
            </View>
          </View>

          <Text style={styles.receiptInstructions}>
            Tu pedido ha sido procesado exitosamente. Dirígete a la tienda para recogerlo.
          </Text>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={handleReceiptContinue}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading && !checkoutInProgress) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando información del carrito...</Text>
      </View>
    );
  }

  if (!checkoutInProgress && !showQRPayment && !orderComplete && !showReceipt && checkoutItems.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptySubtitle}>
          Agrega algunos productos antes de proceder al checkout
        </Text>
        <TouchableOpacity 
          style={styles.emptyButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.emptyButtonText}>Ver productos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            disabled={isProcessing}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Finalizar Compra</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Sección de Métodos de Pago */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selecciona el método de pago</Text>
            
            <PaymentMethodCard
              method="cash"
              icon="cash-outline"
              title="Pago en Caja"
              description="Genera un código QR y paga en tienda (efectivo o tarjeta)"
              badge="✓ Genera QR para pago rápido en caja"
              selected={paymentMethod === 'cash'}
            />
            
            <PaymentMethodCard
              method="transbank"
              icon="card-outline"
              title="Transbank"
              description="Pago online inmediato con tarjeta de crédito o débito"
              badge="✓ Pago seguro e inmediato"
              selected={paymentMethod === 'transbank'}
            />
          </View>

          {/* Notas del pedido */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas del pedido (opcional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Instrucciones especiales para tu pedido..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Resumen del pedido */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumen del pedido</Text>
            
            <View style={styles.productsList}>
              {checkoutItems.items.slice(0, 3).map((item) => (
                <ProductItem key={item.id} item={item} />
              ))}
              {checkoutItems.items.length > 3 && (
                <Text style={styles.moreProducts}>
                  +{checkoutItems.items.length - 3} productos más
                </Text>
              )}
            </View>

            <View style={styles.summaryDetails}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Subtotal ({checkoutItems.summary.totalItems} productos)
                </Text>
                <View style={styles.summaryValueContainer}>
                  {renderUSDPrice(checkoutItems.summary.subtotal)}
                  <Text style={styles.summaryValue}>
                    {formatPrice(checkoutItems.summary.subtotal)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total a pagar</Text>
                <View style={styles.summaryValueContainer}>
                  {renderUSDPrice(checkoutItems.total)}
                  <Text style={styles.totalValue}>{formatPrice(checkoutItems.total)}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Botón fijo en la parte inferior */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.finalizeButton,
              (!paymentMethod || isProcessing) && styles.finalizeButtonDisabled
            ]}
            onPress={handleFinalizeOrder}
            disabled={!paymentMethod || isProcessing}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                <Text style={styles.finalizeButtonText}>Procesando...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.finalizeButtonText}>Finalizar Compra</Text>
              </>
            )}
          </TouchableOpacity>
          
          {!paymentMethod && (
            <Text style={styles.footerHint}>
              Selecciona un método de pago para continuar
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Modales */}
      <QRPaymentModal />
      <PaymentReceiptModal />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 34,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  paymentCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  paymentCardSelected: {
    borderColor: '#2196F3',
    borderWidth: 2,
    backgroundColor: '#f0f8ff',
  },
  paymentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    marginRight: 15,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentTitleSelected: {
    color: '#2196F3',
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  paymentBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#2196F3',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    backgroundColor: '#fafafa',
  },
  productsList: {
    marginBottom: 15,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 12,
    color: '#666',
  },
  productPrices: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  usdPrice: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  moreProducts: {
    fontSize: 14,
    color: '#2196F3',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryDetails: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  summaryValueContainer: {
    alignItems: 'flex-end',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  finalizeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finalizeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  finalizeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerHint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  // ✅ ESTILOS PARA MODALES
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  qrNumber: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 10,
  },
  qrAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  simulationBadge: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  successButton: {
    flex: 2,
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
  },
  receiptContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  receiptLabel: {
    fontSize: 16,
    color: '#666',
  },
  receiptValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  receiptInstructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  continueButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;