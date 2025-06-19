// src/screens/cajero/CajeroDashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  Share,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import QRCode from 'react-native-qrcode-svg';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { cajeroService } from '../../api/cajero';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

const CajeroDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'pedidos', title: 'Pedidos' },
    { key: 'ventas', title: 'Ventas del Día' },
  ]);

  // Estados para datos
  const [pedidos, setPedidos] = useState([]);
  const [ventasDia, setVentasDia] = useState({ 
    ventas: [], 
    resumen: {
      efectivo: { total: 0, cantidad: 0 },
      webpay: { total: 0, cantidad: 0 },
      qr: { total: 0, cantidad: 0 }
    }, 
    totalDia: 0 
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para modales
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [qrData, setQrData] = useState('');
  const [detallesPedido, setDetallesPedido] = useState(null);

  // Estados para formularios
  const [paymentForm, setPaymentForm] = useState({
    codigo: '',
    metodo_pago: 'EFECTIVO'
  });

  const [closeForm, setCloseForm] = useState({
    ventas_efectivo: '0',
    ventas_transbank: '0',
    ventas_otros: '0',
    observaciones: '',
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadPedidos();
    loadVentasDia();
  }, []);

  const loadPedidos = async () => {
    try {
      setLoading(true);
      const response = await cajeroService.getPedidos();
      
      if (response.data.success === false) {
        throw new Error(response.data.message || 'Error al cargar pedidos');
      }
      
      setPedidos(response.data || []);
    } catch (error) {
      console.error('Error al cargar pedidos:', error.response?.data || error.message);
      showAlert('Error', error.response?.data?.message || 'No se pudieron cargar los pedidos');
      setPedidos([]); // Establecer array vacío para evitar errores
    } finally {
      setLoading(false);
    }
  };

  const loadVentasDia = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await cajeroService.getVentasDia(today);
      
      if (response.data.success === false) {
        throw new Error(response.data.message || 'Error al cargar ventas');
      }

      // Estructura de respaldo por si el formato cambia
      const ventas = response.data.ventas || [];
      const resumen = response.data.resumen || {
        efectivo: { total: 0, cantidad: 0 },
        webpay: { total: 0, cantidad: 0 },
        qr: { total: 0, cantidad: 0 }
      };
      
      setVentasDia({
        ventas,
        resumen,
        totalDia: response.data.totalDia || 0
      });
      
    } catch (error) {
      console.error('Error al cargar ventas:', error.response?.data || error.message);
      showAlert('Error', error.response?.data?.message || 'No se pudieron cargar las ventas del día');
      
      // Establecer valores por defecto para evitar errores en la UI
      setVentasDia({
        ventas: [],
        resumen: {
          efectivo: { total: 0, cantidad: 0 },
          webpay: { total: 0, cantidad: 0 },
          qr: { total: 0, cantidad: 0 }
        },
        totalDia: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPedidos(), loadVentasDia()]);
    setRefreshing(false);
  };

  const showAlert = (title, message, type = 'default') => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  // Generar QR con estructura mejorada
  const handleGenerateQR = async (pedido) => {
    try {
      setLoading(true);
      const response = await cajeroService.generarQR(pedido.id);
      
      // Extraer datos del response similar a la versión web
      const qrContent = response.data.qr_data || JSON.parse(response.data.codigo_qr);
      const numeroAtencion = qrContent.numeroAtencion || response.data.numero_atencion;
      const clienteInfo = qrContent.cliente || { nombre: pedido.clienteNombre };
      
      setQrData(response.data.codigo_qr);
      setDetallesPedido({
        codigo: numeroAtencion.slice(-5), // Últimos 5 dígitos del número de atención
        cliente: clienteInfo.nombre,
        fecha: new Date(pedido.fechaPedido).toLocaleString('es-CL'),
        numeroAtencion: numeroAtencion,
        total: pedido.total
      });
      
      setSelectedPedido(pedido);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error al generar QR:', error);
      showAlert('Error', 'No se pudo generar el código QR: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Procesar pago mejorado
  const handleProcessPayment = async () => {
    if (!paymentForm.codigo.trim()) {
      showAlert('Error', 'Ingrese el código del pedido');
      return;
    }

    try {
      setLoading(true);
      await cajeroService.procesarPago(paymentForm);
      
      setShowPaymentModal(false);
      setPaymentForm({ codigo: '', metodo_pago: 'EFECTIVO' });
      
      await Promise.all([loadPedidos(), loadVentasDia()]);
      showAlert('Éxito', 'Pago procesado correctamente');
    } catch (error) {
      showAlert('Error', error.response?.data?.error || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  // Enviar a preparación
  const handleSendToPreparation = async (pedidoId) => {
    try {
      await cajeroService.enviarPreparacion(pedidoId);
      await loadPedidos();
      showAlert('Éxito', 'Pedido enviado a preparación');
    } catch (error) {
      showAlert('Error', 'No se pudo enviar el pedido a preparación');
    }
  };

  // Cerrar caja mejorado
  const handleCloseCash = async () => {
    const totalDeclarado = 
      parseFloat(closeForm.ventas_efectivo || 0) + 
      parseFloat(closeForm.ventas_transbank || 0) + 
      parseFloat(closeForm.ventas_otros || 0);

    Alert.alert(
      'Confirmar Cierre',
      `Total Sistema: ${formatCurrency(ventasDia.totalDia)}\nTotal Declarado: ${formatCurrency(totalDeclarado)}\n\n¿Confirmar cierre de caja?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoading(true);
              const today = new Date().toISOString().split('T')[0];
              
              await cajeroService.cierreCaja({
                fecha: today,
                totales: {
                  ...closeForm,
                  ventas_efectivo: parseFloat(closeForm.ventas_efectivo),
                  ventas_transbank: parseFloat(closeForm.ventas_transbank),
                  ventas_otros: parseFloat(closeForm.ventas_otros),
                  total_declarado: totalDeclarado
                }
              });
              
              setShowCloseModal(false);
              setCloseForm({
                ventas_efectivo: '0',
                ventas_transbank: '0',
                ventas_otros: '0',
                observaciones: '',
              });
              
              await loadVentasDia();
              showAlert('Éxito', 'Cierre de caja procesado correctamente');
            } catch (error) {
              showAlert('Error', error.response?.data?.error || 'Error al procesar el cierre');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Función para compartir reportes (equivalente a descargar en web)
  const handleShareReport = async (format) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await cajeroService.getReporte(format, today, today);
      
      if (response.data) {
        // Crear contenido para compartir
        let content = `REPORTE DE VENTAS - ${today}\n\n`;
        content += `Total del Día: ${formatCurrency(ventasDia.totalDia)}\n\n`;
        
        Object.entries(ventasDia.resumen).forEach(([metodo, data]) => {
          content += `${metodo.toUpperCase()}: ${formatCurrency(data.total)} (${data.cantidad} ventas)\n`;
        });
        
        content += `\nDetalle de Ventas:\n`;
        ventasDia.ventas.forEach((venta, idx) => {
          content += `${idx + 1}. ${new Date(venta.fechaVenta).toLocaleTimeString('es-CL')} - `;
          content += `#${venta.numeroAtencion} - ${venta.clienteNombre} - `;
          content += `${venta.metodoPago} - ${formatCurrency(venta.monto)}\n`;
        });

        await Share.share({
          message: content,
          title: `Reporte de Ventas ${today}`
        });
        
        showAlert('Éxito', `Reporte ${format.toUpperCase()} compartido`);
      }
    } catch (error) {
      showAlert('Error', 'Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return '#FF9800';
      case 'PAGADO': return '#4CAF50';
      case 'EN_PREPARACION': return '#2196F3';
      case 'LISTO': return '#9C27B0';
      default: return '#666';
    }
  };

  // Renderizar Tab de Pedidos
  const PedidosTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.actionBar}>
        <Text style={styles.sectionTitle}>Gestión de Pedidos</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowPaymentModal(true)}
        >
          <Ionicons name="card" size={20} color="white" />
          <Text style={styles.buttonText}>Procesar Pago</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.pedidosContainer}>
          {pedidos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No hay pedidos pendientes</Text>
            </View>
          ) : (
            pedidos.map((pedido) => (
              <View key={pedido.id} style={styles.pedidoCard}>
                <View style={styles.pedidoHeader}>
                  <Text style={styles.pedidoNumber}>#{pedido.numeroAtencion}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pedido.estado) }]}>
                    <Text style={styles.statusText}>{pedido.estado}</Text>
                  </View>
                </View>

                <View style={styles.pedidoInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>{pedido.clienteNombre}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                      {new Date(pedido.fechaPedido).toLocaleString('es-CL')}
                    </Text>
                  </View>

                  <Text style={styles.pedidoTotal}>{formatCurrency(pedido.total)}</Text>
                </View>

                <View style={styles.pedidoActions}>
                  {pedido.estado === 'PENDIENTE' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleGenerateQR(pedido)}
                    >
                      <MaterialIcons name="qr-code" size={20} color="#2196F3" />
                      <Text style={styles.actionButtonText}>Generar QR</Text>
                    </TouchableOpacity>
                  )}

                  {pedido.estado === 'PAGADO' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.sendButton]}
                      onPress={() => handleSendToPreparation(pedido.id)}
                    >
                      <Ionicons name="send" size={20} color="white" />
                      <Text style={[styles.actionButtonText, { color: 'white' }]}>A Cocina</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );

  // Renderizar Tab de Ventas mejorado
  const VentasTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.actionBar}>
        <Text style={styles.sectionTitle}>Ventas del Día</Text>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, { marginRight: 10 }]}
            onPress={() => handleShareReport('excel')}
          >
            <Ionicons name="download-outline" size={16} color="#2196F3" />
            <Text style={styles.secondaryButtonText}>Exportar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowCloseModal(true)}
          >
            <MaterialIcons name="attach-money" size={20} color="white" />
            <Text style={styles.buttonText}>Cerrar Caja</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Resumen de ventas */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, styles.totalCard]}>
          <MaterialIcons name="attach-money" size={32} color="#4CAF50" />
          <Text style={styles.summaryAmount}>{formatCurrency(ventasDia.totalDia)}</Text>
          <Text style={styles.summaryLabel}>Total del Día</Text>
        </View>

        {Object.entries(ventasDia.resumen).map(([metodo, data]) => (
          <View key={metodo} style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              {metodo === 'efectivo' && <MaterialIcons name="money" size={24} color="#2196F3" />}
              {metodo === 'webpay' && <Ionicons name="card" size={24} color="#2196F3" />}
              {metodo === 'qr' && <MaterialIcons name="qr-code" size={24} color="#2196F3" />}
            </View>
            <Text style={styles.summaryMethodLabel}>{metodo.toUpperCase()}</Text>
            <Text style={styles.summaryMethodAmount}>{formatCurrency(data.total)}</Text>
            <Text style={styles.summaryMethodCount}>{data.cantidad} ventas</Text>
          </View>
        ))}
      </View>

      {/* Lista de ventas */}
      <View style={styles.ventasListContainer}>
        <Text style={styles.subsectionTitle}>Detalle de Ventas</Text>
        {ventasDia.ventas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No hay ventas registradas hoy</Text>
          </View>
        ) : (
          ventasDia.ventas.map((venta, idx) => (
            <View key={idx} style={styles.ventaItem}>
              <View style={styles.ventaInfo}>
                <Text style={styles.ventaTime}>
                  {new Date(venta.fechaVenta).toLocaleTimeString('es-CL')}
                </Text>
                <Text style={styles.ventaClient}>#{venta.numeroAtencion} - {venta.clienteNombre}</Text>
                <View style={styles.ventaMethod}>
                  <Text style={styles.methodChip}>{venta.metodoPago}</Text>
                </View>
              </View>
              <Text style={styles.ventaAmount}>{formatCurrency(venta.monto)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderScene = SceneMap({
    pedidos: PedidosTab,
    ventas: VentasTab,
  });

  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor="#2196F3"
      inactiveColor="#666"
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Cajero</Text>
        <Text style={styles.subtitle}>Bienvenido, {user?.nombre}</Text>
      </View>

      {/* Tabs */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width }}
        renderTabBar={renderTabBar}
      />

      {/* Modal QR mejorado */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Código QR - Pedido #{detallesPedido?.numeroAtencion}
              </Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              {detallesPedido && qrData ? (
                <>
                  {/* Código (últimos 5 dígitos) */}
                  <Text style={styles.qrCode}>{detallesPedido.codigo}</Text>
                  
                  {/* Nombre del cliente */}
                  <Text style={styles.qrClientName}>{detallesPedido.cliente}</Text>
                  
                  {/* Fecha formateada */}
                  <Text style={styles.qrDate}>{detallesPedido.fecha}</Text>
                  
                  {/* Número interno */}
                  <Text style={styles.qrInternalNumber}>04</Text>
                  
                  {/* Primer nombre */}
                  <Text style={styles.qrFirstName}>{detallesPedido.cliente.split(' ')[0]}</Text>
                  
                  {/* Total del pedido */}
                  <Text style={styles.qrAmount}>{formatCurrency(detallesPedido.total)}</Text>

                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={qrData}
                      size={200}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>
                  
                  <View style={styles.qrInfo}>
                    <Ionicons name="information-circle" size={20} color="#2196F3" />
                    <Text style={styles.qrInfoText}>
                      El cliente debe escanear este código para confirmar el pago
                    </Text>
                  </View>

                  <TextInput
                    style={styles.qrCodeInput}
                    value={qrData}
                    editable={false}
                    placeholder="Código QR"
                  />
                </>
              ) : (
                <ActivityIndicator size="large" color="#2196F3" />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Procesar Pago */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Procesar Pago en Caja</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Código QR o Número de Atención"
                value={paymentForm.codigo}
                onChangeText={(text) => setPaymentForm({ ...paymentForm, codigo: text })}
              />

              <View style={styles.pickerContainer}>
                <Text style={styles.inputLabel}>Método de Pago</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={paymentForm.metodo_pago}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, metodo_pago: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Efectivo" value="EFECTIVO" />
                    <Picker.Item label="Código QR" value="QR" />
                    <Picker.Item label="Tarjeta" value="TARJETA" />
                  </Picker>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleProcessPayment}
                  disabled={!paymentForm.codigo.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Procesar Pago</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cierre de Caja */}
      <Modal
        visible={showCloseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCloseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cierre de Caja</Text>
                <TouchableOpacity onPress={() => setShowCloseModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ventas en Efectivo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="$0"
                    value={closeForm.ventas_efectivo}
                    onChangeText={(text) => setCloseForm({ ...closeForm, ventas_efectivo: text })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ventas Transbank</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="$0"
                    value={closeForm.ventas_transbank}
                    onChangeText={(text) => setCloseForm({ ...closeForm, ventas_transbank: text })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Otras Ventas</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="$0"
                    value={closeForm.ventas_otros}
                    onChangeText={(text) => setCloseForm({ ...closeForm, ventas_otros: text })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Observaciones</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Observaciones opcionales"
                    value={closeForm.observaciones}
                    onChangeText={(text) => setCloseForm({ ...closeForm, observaciones: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.totalsInfo}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total del Sistema:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(ventasDia.totalDia)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Declarado:</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(
                        parseFloat(closeForm.ventas_efectivo || 0) + 
                        parseFloat(closeForm.ventas_transbank || 0) + 
                        parseFloat(closeForm.ventas_otros || 0)
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowCloseModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleCloseCash}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Cerrar Caja</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  tabBar: {
    backgroundColor: 'white',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabIndicator: {
    backgroundColor: '#2196F3',
    height: 3,
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#2196F3',
    marginLeft: 5,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    textAlign: 'center',
  },
  pedidosContainer: {
    padding: 15,
  },
  pedidoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pedidoNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pedidoInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  pedidoTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 10,
  },
  pedidoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginLeft: 10,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  actionButtonText: {
    marginLeft: 5,
    color: '#2196F3',
    fontWeight: '600',
  },
  summaryContainer: {
    padding: 15,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  totalCard: {
    backgroundColor: '#E8F5E9',
    marginBottom: 15,
  },
  summaryIcon: {
    marginBottom: 10,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 5,
  },
  summaryMethodAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 5,
  },
  summaryMethodCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ventasListContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  ventaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ventaInfo: {
    flex: 1,
  },
  ventaTime: {
    fontSize: 12,
    color: '#666',
  },
  ventaClient: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
  },
  ventaMethod: {
    marginTop: 4,
  },
  methodChip: {
    fontSize: 12,
    color: '#2196F3',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  ventaAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
  },
  qrCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  qrClientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  qrDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  qrInternalNumber: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  qrFirstName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  qrAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 15,
  },
  qrInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    marginHorizontal: 20,
  },
  qrInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 8,
  },
  qrCodeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
    backgroundColor: '#f5f5f5',
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  totalsInfo: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default CajeroDashboard;