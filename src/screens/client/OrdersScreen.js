// src/screens/OrdersScreen.js - VERSIÓN CORREGIDA FUNCIONANDO
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Modal,
  Dimensions,
  ActivityIndicator,
  Platform,
  TextInput,
  FlatList,
  StatusBar,
  Animated,
  Picker,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useExchangeRate } from '../../contexts/ExchangeRateContext';
// ✅ IMPORT CORREGIDO
import pedidosService from '../../api/pedidos'; 

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OrdersScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { formatCurrency } = useExchangeRate();

  // Estados principales
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Estados de filtros
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: '',
    mostrandoFiltros: false,
  });

  // Estados de modal de detalles
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // 🚀 ESTADOS PARA DEVOLUCIONES
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelType, setCancelType] = useState(''); 
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [cancelReason, setCancelReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [processingCancel, setProcessingCancel] = useState(false);
  
  // 🚀 ESTADOS PARA DEVOLUCIONES COMO BOLETAS
  const [devoluciones, setDevoluciones] = useState([]);
  const [loadingDevoluciones, setLoadingDevoluciones] = useState(false);
  const [showDevoluciones, setShowDevoluciones] = useState(true);
  const [expandedDevolucion, setExpandedDevolucion] = useState(null);

  // 🚀 ESTADOS PARA NOTIFICACIONES
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationData, setNotificationData] = useState({
    type: 'success',
    title: '',
    message: '',
    details: ''
  });

  // Estado para tab activo
  const [activeTab, setActiveTab] = useState('pedidos');

  // ✅ FUNCIONES DE NORMALIZACIÓN (igual que la web)
  const normalizarDetalleProducto = (detalle) => {
    return {
      id: detalle.id || detalle.detalle_id,
      cantidad: detalle.cantidad || 1,
      precioUnitario: detalle.precioUnitario || 
                     detalle.precio_unitario || 
                     detalle.precio || 
                     0,
      subtotal: detalle.subtotal || 
               (detalle.cantidad * (detalle.precioUnitario || detalle.precio_unitario || detalle.precio || 0)),
      producto: {
        id: detalle.producto?.id || 
            detalle.Producto?.id || 
            detalle.producto_id || 
            detalle.productoId,
        nombre: detalle.producto?.nombre || 
                detalle.Producto?.nombre || 
                detalle.productoNombre || 
                detalle.producto_nombre || 
                `Producto #${detalle.producto_id || detalle.productoId || 'S/N'}`,
        descripcion: detalle.producto?.descripcion || 
                     detalle.Producto?.descripcion || 
                     detalle.productoDescripcion || 
                     detalle.producto_descripcion || 
                     '',
        imagenUrl: detalle.producto?.imagenUrl || 
                   detalle.producto?.imagen_url || 
                   detalle.Producto?.imagenUrl || 
                   detalle.Producto?.imagen_url || 
                   'https://via.placeholder.com/80/60'
      },
      notasEspeciales: detalle.notas || detalle.notasEspeciales || null
    };
  };

  const normalizarPedido = (pedido) => {
    const detallesOriginales = pedido.detalles || 
                              pedido.DetallePedidos || 
                              pedido.detallesPedido || 
                              [];
    
    const detallesNormalizados = detallesOriginales.map(normalizarDetalleProducto);

    return {
      id: pedido.id || pedido.pedido_id,
      numeroAtencion: pedido.numeroAtencion || 
                     pedido.numero_atencion || 
                     pedido.id || 
                     'S/N',
      fechaPedido: pedido.fechaPedido || 
                  pedido.fecha_pedido || 
                  pedido.created_at || 
                  new Date(),
      fechaEntrega: pedido.fechaEntrega || 
                   pedido.fecha_entrega,
      estado: pedido.estado || 'PENDIENTE',
      total: pedido.total || 0,
      notas: pedido.notas || null,
      detalles: detallesNormalizados
    };
  };

  // 🚀 FUNCIÓN PARA CARGAR DEVOLUCIONES
  const cargarDevoluciones = async () => {
    try {
      setLoadingDevoluciones(true);
      console.log('🔍 Cargando devoluciones...');
      
      const response = await pedidosService.getMisDevoluciones();
      
      if (response.success) {
        console.log('✅ Devoluciones cargadas:', response.data);
        setDevoluciones(response.data || []);
      } else {
        console.warn('⚠️ Error en respuesta de devoluciones:', response);
        setDevoluciones([]);
      }
    } catch (error) {
      console.error('❌ Error al cargar devoluciones:', error);
      setDevoluciones([]);
    } finally {
      setLoadingDevoluciones(false);
    }
  };

  // ✅ FUNCIÓN PRINCIPAL CORREGIDA: Cargar pedidos
  const cargarPedidos = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('📱 === CARGANDO PEDIDOS CORREGIDO ===');
      
      // ✅ LLAMADA CORREGIDA: usar misPedidos directamente
      const response = await pedidosService.misPedidos({
        limit: 50,
        offset: 0,
        orderBy: 'fecha_pedido',
        orderDir: 'DESC'
      });

      console.log('✅ Respuesta recibida:', response);

      if (response.success && response.data) {
        console.log('📦 Datos recibidos:', response.data.length, 'pedidos');
        
        // ✅ NORMALIZAR PEDIDOS (el backend ya incluye detalles)
        const pedidosNormalizados = response.data.map(normalizarPedido);
        
        console.log('📋 Pedidos normalizados:', pedidosNormalizados.length);
        
        // ✅ DEBUG: Verificar que los pedidos tienen detalles
        pedidosNormalizados.forEach((pedido, index) => {
          console.log(`📦 Pedido ${index + 1}:`, {
            id: pedido.id,
            numero: pedido.numeroAtencion,
            total: pedido.total,
            estado: pedido.estado,
            detalles_count: pedido.detalles.length
          });
          
          if (pedido.detalles.length > 0) {
            console.log(`  📦 Productos:`, pedido.detalles.map(d => d.producto.nombre));
          } else {
            console.warn(`  ❌ Pedido ${pedido.id} SIN DETALLES`);
          }
        });
        
        setPedidos(pedidosNormalizados);
        console.log('✅ Pedidos establecidos en el estado');
      } else {
        throw new Error(response.message || 'No se pudieron cargar los pedidos');
      }

    } catch (error) {
      console.error('❌ Error al cargar pedidos:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al cargar los pedidos';
      setError(errorMessage);
      
      if (error.response?.status === 401) {
        Alert.alert(
          'Sesión Expirada',
          'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarPedidos();
    cargarDevoluciones();
  }, []);

  // ✅ Función para refrescar
  const onRefresh = useCallback(() => {
    cargarPedidos(true);
    cargarDevoluciones();
  }, []);

  // 🚀 FUNCIONES PARA DEVOLUCIONES (igual que la web)

  const showNotification = (type, title, message, details = '') => {
    setNotificationData({ type, title, message, details });
    setShowNotificationModal(true);
  };

  const obtenerTipoAccion = (estado) => {
    const estadoUpper = estado?.toUpperCase();
    
    switch (estadoUpper) {
      case 'PENDIENTE':
      case 'PAGADO':
      case 'EN_PREPARACION':
        return {
          accion: 'cancelar',
          titulo: 'Cancelar Pedido',
          descripcion: 'Cancelar productos antes de la entrega',
          botonTexto: 'Cancelar Pedido',
          tipoNotificacion: 'warning',
          colorBoton: '#F44336',
          esPostEntrega: false,
          requiereVisitaTienda: false
        };
      case 'LISTO':
        return {
          accion: 'devolver',
          titulo: 'Solicitar Devolución',
          descripcion: 'Devolver productos listos para entrega',
          botonTexto: 'Solicitar Devolución',
          tipoNotificacion: 'info',
          colorBoton: '#2196F3',
          esPostEntrega: true,
          requiereVisitaTienda: false
        };
      case 'ENTREGADO':
        return {
          accion: 'devolver',
          titulo: 'Iniciar Proceso de Devolución',
          descripcion: 'Devolver productos ya entregados - Requiere visita a tienda',
          botonTexto: 'Iniciar Devolución',
          tipoNotificacion: 'info',
          colorBoton: '#FF9800',
          esPostEntrega: true,
          requiereVisitaTienda: true,
          mensajeEspecial: 'Para productos entregados, debes traer físicamente los productos a la tienda'
        };
      default:
        return {
          accion: 'cancelar',
          titulo: 'Procesar Solicitud',
          descripcion: 'Procesar solicitud de devolución',
          botonTexto: 'Procesar',
          tipoNotificacion: 'info',
          colorBoton: '#2196F3',
          esPostEntrega: false,
          requiereVisitaTienda: false
        };
    }
  };

  const puedeSerCancelado = (pedido) => {
    const estadosValidosParaCancelar = ['PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO'];
    const estadoInvalido = pedido.estado?.toUpperCase() === 'CANCELADO';
    const tieneProductos = pedido.total > 0;
    
    return estadosValidosParaCancelar.includes(pedido.estado?.toUpperCase()) && 
           !estadoInvalido && 
           tieneProductos;
  };

  const handleCancelOrder = (order) => {
    const tipoAccion = obtenerTipoAccion(order.estado);
    
    console.log(`🔄 Iniciando ${tipoAccion.accion} para pedido ${order.estado}:`, order.id);
    setSelectedOrder(order);
    setShowCancelModal(true);
    setCancelType('');
    setSelectedProducts([]);
    setCancelReason('');
  };

  const handleCancelTypeSelect = (type) => {
    console.log('📋 Tipo de cancelación seleccionado:', type);
    setCancelType(type);
    
    if (type === 'complete') {
      const todosLosProductos = selectedOrder.detalles.map(d => ({ 
        ...d, 
        cantidad_cancelar: d.cantidad 
      }));
      setSelectedProducts(todosLosProductos);
    } else {
      setSelectedProducts([]);
    }
  };

  const handleProductSelect = (detalle, cantidadCancelar) => {
    console.log('📦 Seleccionando producto:', detalle.producto.nombre, 'cantidad:', cantidadCancelar);
    
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === detalle.id);
      
      if (cantidadCancelar === 0) {
        return prev.filter(p => p.id !== detalle.id);
      }
      
      if (existing) {
        return prev.map(p => 
          p.id === detalle.id 
            ? { ...p, cantidad_cancelar: cantidadCancelar }
            : p
        );
      } else {
        return [...prev, { ...detalle, cantidad_cancelar: cantidadCancelar }];
      }
    });
  };

  const calculateRefund = () => {
    if (cancelType === 'complete') {
      return selectedOrder?.total || 0;
    } else {
      return selectedProducts.reduce((total, product) => 
        total + (product.precioUnitario * product.cantidad_cancelar), 0
      );
    }
  };

  // ✅ PROCESAMIENTO DE CANCELACIÓN CORREGIDO
  const processCancellation = async () => {
    try {
      setProcessingCancel(true);
      console.log('🚀 Procesando cancelación/devolución...');
      
      const datosDevolucion = {
        tipo_cancelacion: cancelType,
        motivo: cancelReason || 'Cancelación solicitada por el cliente'
      };

      if (cancelType === 'complete') {
        if (!selectedOrder.detalles || selectedOrder.detalles.length === 0) {
          throw new Error('No se encontraron productos en el pedido para devolver');
        }
        
        datosDevolucion.productos_cancelar = selectedOrder.detalles.map(detalle => ({
          detalle_id: detalle.id,
          cantidad_cancelar: detalle.cantidad,
          producto_nombre: detalle.producto.nombre
        }));
      } else {
        if (!selectedProducts || selectedProducts.length === 0) {
          throw new Error('No se han seleccionado productos para la devolución parcial');
        }
        
        datosDevolucion.productos_cancelar = selectedProducts.map(producto => ({
          detalle_id: producto.id,
          cantidad_cancelar: producto.cantidad_cancelar,
          producto_nombre: producto.producto.nombre
        }));
      }

      console.log('📤 Datos finales a enviar:', JSON.stringify(datosDevolucion, null, 2));

      // ✅ LLAMADA CORREGIDA A LA API
      const response = await pedidosService.procesarDevolucion(selectedOrder.id, datosDevolucion);
      
      if (response.success) {
        console.log('✅ Devolución procesada exitosamente:', response.data);
        
        // Actualizar estado local
        const refundAmount = calculateRefund();
        
        setPedidos(prev => prev.map(pedido => {
          if (pedido.id === selectedOrder.id) {
            if (cancelType === 'complete') {
              return { ...pedido, estado: 'CANCELADO', total: 0 };
            } else {
              const detallesActualizados = pedido.detalles.map(detalle => {
                const productosCancelados = selectedProducts.find(p => p.id === detalle.id);
                if (productosCancelados) {
                  const nuevaCantidad = detalle.cantidad - productosCancelados.cantidad_cancelar;
                  return nuevaCantidad > 0 ? { ...detalle, cantidad: nuevaCantidad } : null;
                }
                return detalle;
              }).filter(Boolean);
              
              const nuevoTotal = detallesActualizados.reduce((sum, d) => sum + (d.precioUnitario * d.cantidad), 0);
              return { 
                ...pedido, 
                detalles: detallesActualizados, 
                total: nuevoTotal 
              };
            }
          }
          return pedido;
        }));

        // Recargar devoluciones
        await cargarDevoluciones();
        
        // Limpiar estados del modal
        setShowConfirmation(false);
        setShowCancelModal(false);
        setSelectedOrder(null);
        setCancelType('');
        setSelectedProducts([]);
        setCancelReason('');
        
        // Mostrar notificación de éxito
        const devolucionData = response.data.devolucion || {};
        const tipoAccion = obtenerTipoAccion(selectedOrder.estado);
        
        let tituloNotificacion = '';
        let mensajeNotificacion = '';
        
        if (tipoAccion.requiereVisitaTienda) {
          tituloNotificacion = '¡Solicitud de Devolución Generada!';
          mensajeNotificacion = 'Tu solicitud ha sido registrada. Ahora debes acercarte a la tienda con los productos físicos.';
        } else if (tipoAccion.esPostEntrega) {
          tituloNotificacion = '¡Devolución Procesada Exitosamente!';
          mensajeNotificacion = 'Tu devolución ha sido registrada y se ha generado una nota de crédito.';
        } else {
          tituloNotificacion = '¡Cancelación Procesada Exitosamente!';
          mensajeNotificacion = 'Tu cancelación ha sido procesada y el reembolso será procesado en los próximos días hábiles.';
        }
        
        showNotification(
          'success',
          tituloNotificacion,
          mensajeNotificacion,
          `Código: ${devolucionData.codigo || 'N/A'}\nMonto: ${formatCurrency(refundAmount)}`
        );
        
      } else {
        throw new Error(response.message || 'Error al procesar la devolución');
      }
      
    } catch (error) {
      console.error('❌ Error procesando devolución:', error);
      
      let errorMessage = 'No se pudo completar la devolución. Por favor, intenta nuevamente.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification(
        'error',
        'Error al Procesar Devolución',
        errorMessage,
        'Si el problema persiste, contacta al soporte técnico.'
      );
    } finally {
      setProcessingCancel(false);
    }
  };

  // Funciones auxiliares (igual que la web)
  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-CL', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const obtenerEstadoInfo = (estado) => {
    const estadoUpper = estado?.toUpperCase();
    
    switch (estadoUpper) {
      case 'PENDIENTE':
        return { color: '#FFF3C4', textColor: '#F57C00', texto: 'Pendiente' };
      case 'PAGADO':
        return { color: '#E3F2FD', textColor: '#1976D2', texto: 'Pagado' };
      case 'EN_PREPARACION':
        return { color: '#FCE4EC', textColor: '#C2185B', texto: 'En Preparación' };
      case 'LISTO':
        return { color: '#F3E5F5', textColor: '#7B1FA2', texto: 'Listo para Retiro' };
      case 'ENTREGADO':
        return { color: '#E8F5E8', textColor: '#388E3C', texto: 'Entregado' };
      case 'CANCELADO':
        return { color: '#FFEBEE', textColor: '#D32F2F', texto: 'Cancelado' };
      default:
        return { color: '#F5F5F5', textColor: '#616161', texto: estado || 'Sin estado' };
    }
  };

  // Funciones auxiliares del componente original
  const getStatusColor = (estado) => {
    switch (estado?.toUpperCase()) {
      case 'PENDIENTE': return '#FF9800';
      case 'PAGADO': return '#2196F3';
      case 'EN_PREPARACION': return '#9C27B0';
      case 'LISTO': return '#4CAF50';
      case 'ENTREGADO': return '#4CAF50';
      case 'CANCELADO': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (estado) => {
    switch (estado?.toUpperCase()) {
      case 'PENDIENTE': return 'time-outline';
      case 'PAGADO': return 'checkmark-circle-outline';
      case 'EN_PREPARACION': return 'restaurant-outline';
      case 'LISTO': return 'cube-outline';
      case 'ENTREGADO': return 'checkmark-done-outline';
      case 'CANCELADO': return 'close-circle-outline';
      default: return 'receipt-outline';
    }
  };

  const getStatusText = (estado) => {
    switch (estado?.toUpperCase()) {
      case 'PENDIENTE': return 'Pendiente';
      case 'PAGADO': return 'Pagado';
      case 'EN_PREPARACION': return 'En Preparación';
      case 'LISTO': return 'Listo';
      case 'ENTREGADO': return 'Entregado';
      case 'CANCELADO': return 'Cancelado';
      default: return estado || 'Desconocido';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNumeroAtencion = (pedido) => {
    return pedido.numeroAtencion || pedido.numero_atencion || `#${pedido.id}`;
  };

  // ✅ Filtrar pedidos
  const pedidosFiltrados = pedidos.filter(pedido => {
    let cumpleFiltros = true;

    if (filtros.busqueda.trim()) {
      const busqueda = filtros.busqueda.toLowerCase();
      const numeroAtencion = getNumeroAtencion(pedido).toLowerCase();
      cumpleFiltros = cumpleFiltros && numeroAtencion.includes(busqueda);
    }

    if (filtros.estado) {
      cumpleFiltros = cumpleFiltros && pedido.estado?.toUpperCase() === filtros.estado.toUpperCase();
    }

    return cumpleFiltros;
  });

  // ✅ COMPONENTE: Notificación Modal (igual que antes)
  const NotificationModal = () => {
    const getIconAndColors = () => {
      switch (notificationData.type) {
        case 'success':
          return {
            icon: 'checkmark-circle',
            bgColor: '#E8F5E8',
            borderColor: '#4CAF50',
            titleColor: '#2E7D32',
            buttonColor: '#4CAF50'
          };
        case 'error':
          return {
            icon: 'close-circle',
            bgColor: '#FFEBEE',
            borderColor: '#F44336',
            titleColor: '#C62828',
            buttonColor: '#F44336'
          };
        case 'warning':
          return {
            icon: 'warning',
            bgColor: '#FFF8E1',
            borderColor: '#FF9800',
            titleColor: '#E65100',
            buttonColor: '#FF9800'
          };
        case 'info':
        default:
          return {
            icon: 'information-circle',
            bgColor: '#E3F2FD',
            borderColor: '#2196F3',
            titleColor: '#1565C0',
            buttonColor: '#2196F3'
          };
      }
    };

    const { icon, bgColor, borderColor, titleColor, buttonColor } = getIconAndColors();

    return (
      <Modal
        visible={showNotificationModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationContainer}>
            <View style={[styles.notificationHeader, { backgroundColor: bgColor, borderColor }]}>
              <Ionicons name={icon} size={48} color={titleColor} style={styles.notificationIcon} />
              <Text style={[styles.notificationTitle, { color: titleColor }]}>
                {notificationData.title}
              </Text>
              <Text style={styles.notificationMessage}>
                {notificationData.message}
              </Text>
            </View>

            {notificationData.details && (
              <View style={styles.notificationDetails}>
                <Text style={styles.notificationDetailsTitle}>Detalles:</Text>
                <Text style={styles.notificationDetailsText}>
                  {notificationData.details}
                </Text>
              </View>
            )}

            <View style={styles.notificationActions}>
              <TouchableOpacity
                onPress={() => setShowNotificationModal(false)}
                style={[styles.notificationButton, { backgroundColor: buttonColor }]}
              >
                <Text style={styles.notificationButtonText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ✅ COMPONENTE: Modal de Cancelación (simplificado para mobile - mantener lo existente)
  const CancelModal = () => {
    if (!selectedOrder) return null;
    
    const tipoAccion = obtenerTipoAccion(selectedOrder.estado);

    return (
      <Modal
        visible={showCancelModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { 
            backgroundColor: tipoAccion.requiereVisitaTienda ? '#FFF8E1' : (tipoAccion.esPostEntrega ? '#E3F2FD' : '#FFEBEE')
          }]}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>
                {tipoAccion.titulo} - Pedido #{selectedOrder?.numeroAtencion}
              </Text>
              <Text style={styles.modalSubtitle}>
                Estado actual: <Text style={styles.modalSubtitleBold}>{selectedOrder?.estado}</Text>
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowCancelModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {!cancelType && (
              <View style={styles.cancelTypeSelection}>
                <Text style={styles.cancelTypeQuestion}>
                  ¿Qué tipo de {tipoAccion.accion === 'devolver' ? 'devolución' : 'cancelación'} deseas solicitar?
                </Text>
                
                <TouchableOpacity
                  onPress={() => handleCancelTypeSelect('complete')}
                  style={[styles.cancelTypeOption, styles.cancelTypeComplete]}
                >
                  <Ionicons name="cube-outline" size={40} color="#F44336" />
                  <Text style={styles.cancelTypeTitle}>
                    {tipoAccion.accion === 'devolver' ? 'Devolución Completa' : 'Cancelación Completa'}
                  </Text>
                  <Text style={styles.cancelTypeDescription}>
                    {tipoAccion.accion === 'devolver' ? 'Devolver todos los productos' : 'Cancelar todos los productos'}
                  </Text>
                  <Text style={styles.cancelTypeAmount}>
                    Monto: {formatCurrency(selectedOrder?.total)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleCancelTypeSelect('partial')}
                  style={[styles.cancelTypeOption, styles.cancelTypePartial]}
                >
                  <Ionicons name="bag-outline" size={40} color="#FF9800" />
                  <Text style={styles.cancelTypeTitle}>
                    {tipoAccion.accion === 'devolver' ? 'Devolución Parcial' : 'Cancelación Parcial'}
                  </Text>
                  <Text style={styles.cancelTypeDescription}>
                    Seleccionar productos específicos
                  </Text>
                  <Text style={styles.cancelTypeAmount}>
                    Monto variable
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {cancelType === 'complete' && (
              <View style={styles.completeView}>
                <View style={[styles.alertContainer, { 
                  backgroundColor: tipoAccion.esPostEntrega ? '#E3F2FD' : '#FFEBEE',
                  borderColor: tipoAccion.esPostEntrega ? '#2196F3' : '#F44336'
                }]}>
                  <Ionicons 
                    name="warning" 
                    size={20} 
                    color={tipoAccion.esPostEntrega ? '#2196F3' : '#F44336'} 
                  />
                  <View style={styles.alertTextContainer}>
                    <Text style={[styles.alertTitle, { 
                      color: tipoAccion.esPostEntrega ? '#2196F3' : '#F44336' 
                    }]}>
                      {tipoAccion.titulo}
                    </Text>
                    <Text style={styles.alertText}>
                      Se {tipoAccion.accion === 'devolver' ? 'devolverán' : 'cancelarán'} todos los productos por {formatCurrency(selectedOrder?.total)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.reasonSection}>
                  <Text style={styles.reasonLabel}>
                    Motivo (opcional):
                  </Text>
                  <TextInput
                    style={styles.reasonInput}
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    placeholder="Ej: Producto defectuoso..."
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  onPress={() => setShowConfirmation(true)}
                  style={[styles.actionButton, { backgroundColor: tipoAccion.colorBoton }]}
                >
                  <Text style={styles.actionButtonText}>
                    {tipoAccion.requiereVisitaTienda 
                      ? 'Generar Solicitud de Devolución' 
                      : `Proceder con ${tipoAccion.titulo}`
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {cancelType === 'partial' && (
              <View style={styles.partialView}>
                <Text style={styles.partialTitle}>
                  Seleccionar productos a {tipoAccion.accion === 'devolver' ? 'devolver' : 'cancelar'}:
                </Text>
                
                <View style={styles.productSelectionContainer}>
                  {selectedOrder?.detalles.map(detalle => (
                    <View key={detalle.id} style={styles.productSelectionItem}>
                      <View style={styles.productSelectionHeader}>
                        <Text style={styles.productSelectionName}>
                          {detalle.producto.nombre}
                        </Text>
                        <Text style={styles.productSelectionPrice}>
                          {formatCurrency(detalle.precioUnitario)} c/u
                        </Text>
                      </View>
                      
                      <View style={styles.productSelectionControls}>
                        <Text style={styles.productSelectionAvailable}>
                          Disponible: {detalle.cantidad}
                        </Text>
                        
                        <View style={styles.quantitySelector}>
                          <Text style={styles.quantitySelectorLabel}>
                            {tipoAccion.accion === 'devolver' ? 'Devolver' : 'Cancelar'}:
                          </Text>
                          <View style={styles.pickerContainer}>
                            <Picker
                              selectedValue={selectedProducts.find(p => p.id === detalle.id)?.cantidad_cancelar || 0}
                              onValueChange={(value) => handleProductSelect(detalle, value)}
                              style={styles.quantityPicker}
                            >
                              {[...Array(detalle.cantidad + 1)].map((_, i) => (
                                <Picker.Item key={i} label={i.toString()} value={i} />
                              ))}
                            </Picker>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => setShowConfirmation(true)}
                  disabled={selectedProducts.length === 0}
                  style={[
                    styles.actionButton, 
                    { 
                      backgroundColor: selectedProducts.length === 0 ? '#E0E0E0' : '#FF9800',
                      opacity: selectedProducts.length === 0 ? 0.5 : 1
                    }
                  ]}
                >
                  <Text style={[styles.actionButtonText, {
                    color: selectedProducts.length === 0 ? '#9E9E9E' : 'white'
                  }]}>
                    Proceder con Devolución
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ✅ COMPONENTE: Modal de Confirmación (simplificado)
  const ConfirmationModal = () => (
    <Modal
      visible={showConfirmation}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowConfirmation(false)}
    >
      <View style={styles.confirmationOverlay}>
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationContent}>
            <Ionicons name="warning" size={48} color="#FF9800" style={styles.confirmationIcon} />
            
            <Text style={styles.confirmationTitle}>
              Confirmar {obtenerTipoAccion(selectedOrder?.estado).titulo}
            </Text>
            
            <Text style={styles.confirmationText}>
              Se procesará por {formatCurrency(calculateRefund())}
            </Text>
            
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                onPress={() => setShowConfirmation(false)}
                disabled={processingCancel}
                style={[styles.confirmationButton, styles.confirmationCancelButton]}
              >
                <Text style={styles.confirmationCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={processCancellation}
                disabled={processingCancel}
                style={[styles.confirmationButton, styles.confirmationConfirmButton, {
                  backgroundColor: obtenerTipoAccion(selectedOrder?.estado).colorBoton,
                }]}
              >
                {processingCancel ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.confirmationConfirmText}>Procesando...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmationConfirmText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ✅ COMPONENTE: Item de pedido
  const PedidoItem = ({ pedido, index }) => {
    const isExpanded = expandedItems.has(pedido.id);
    const puedeCancel = puedeSerCancelado(pedido);
    const tipoAccion = obtenerTipoAccion(pedido.estado);

    const toggleExpand = () => {
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(pedido.id)) {
        newExpanded.delete(pedido.id);
      } else {
        newExpanded.add(pedido.id);
      }
      setExpandedItems(newExpanded);
    };

    return (
      <View style={styles.pedidoCard}>
        <TouchableOpacity 
          style={styles.pedidoHeader}
          onPress={toggleExpand}
          activeOpacity={0.7}
        >
          <View style={styles.pedidoInfo}>
            <View style={styles.pedidoTitleRow}>
              <Text style={styles.pedidoNumero}>
                {getNumeroAtencion(pedido)}
              </Text>
            </View>
            
            <Text style={styles.pedidoFecha}>
              {formatearFecha(pedido.fechaPedido)}
            </Text>
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pedido.estado) }]}>
                <Ionicons 
                  name={getStatusIcon(pedido.estado)} 
                  size={14} 
                  color="white" 
                />
                <Text style={styles.statusText}>
                  {getStatusText(pedido.estado)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.pedidoMeta}>
            <Text style={styles.pedidoTotal}>
              {formatCurrency(pedido.total || 0)}
            </Text>
            <Text style={styles.pedidoProductos}>
              {pedido.detalles?.length || 0} productos
            </Text>
            
            {puedeCancel && (
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  handleCancelOrder(pedido);
                }}
                style={[styles.devolutionButton, { backgroundColor: tipoAccion.colorBoton }]}
              >
                <Ionicons name="return-up-back-outline" size={14} color="white" />
                <Text style={styles.devolutionButtonText}>
                  {tipoAccion.botonTexto}
                </Text>
              </TouchableOpacity>
            )}
            
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666" 
            />
          </View>
        </TouchableOpacity>

        {/* ✅ Productos expandibles */}
        {isExpanded && pedido.detalles && pedido.detalles.length > 0 && (
          <View style={styles.productosContainer}>
            {pedido.detalles.map((detalle, idx) => (
              <View key={detalle.id || idx} style={styles.productoItem}>
                <Image
                  source={{ 
                    uri: detalle.producto?.imagenUrl || 'https://via.placeholder.com/50' 
                  }}
                  style={styles.productoImagen}
                  defaultSource={{ uri: 'https://via.placeholder.com/50' }}
                />
                <View style={styles.productoInfo}>
                  <Text style={styles.productoNombre} numberOfLines={2}>
                    {detalle.producto?.nombre || 'Producto sin nombre'}
                  </Text>
                  <Text style={styles.productoDetalle}>
                    Cantidad: {detalle.cantidad} • {formatCurrency(detalle.precioUnitario || 0)}
                  </Text>
                </View>
                <Text style={styles.productoSubtotal}>
                  {formatCurrency(detalle.subtotal || 0)}
                </Text>
              </View>
            ))}
            
            <TouchableOpacity 
              style={styles.verDetallesBtn}
              onPress={() => {
                setSelectedPedido(pedido);
                setModalVisible(true);
              }}
            >
              <Ionicons name="eye-outline" size={16} color="#2196F3" />
              <Text style={styles.verDetallesText}>Ver detalles completos</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ✅ RENDERIZAR CONTENIDO PRINCIPAL
  const renderContent = () => {
    if (activeTab === 'devoluciones') {
      return (
        <View style={styles.devolucionesContainer}>
          <View style={styles.devolucionesHeader}>
            <Text style={styles.devolucionesTitle}>Mis Notas de Crédito</Text>
            <TouchableOpacity
              onPress={cargarDevoluciones}
              disabled={loadingDevoluciones}
              style={styles.refreshButton}
            >
              <Ionicons name="refresh" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>

          {loadingDevoluciones ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Cargando devoluciones...</Text>
            </View>
          ) : devoluciones.length === 0 ? (
            <View style={styles.emptyDevolucionesContainer}>
              <Ionicons name="receipt-outline" size={64} color="#9E9E9E" />
              <Text style={styles.emptyDevolucionesTitle}>No tienes notas de crédito</Text>
              <Text style={styles.emptyDevolucionesText}>
                Cuando solicites la devolución de algún pedido, aparecerá aquí la nota correspondiente.
              </Text>
            </View>
          ) : (
            <FlatList
              data={devoluciones}
              renderItem={({ item: devolucion }) => (
                <View style={styles.devolucionCard}>
                  <TouchableOpacity style={styles.devolucionHeader}>
                    <View style={styles.devolucionHeaderContent}>
                      <View style={styles.devolucionHeaderLeft}>
                        <Ionicons name="receipt" size={24} color="#4CAF50" />
                        <View style={styles.devolucionHeaderInfo}>
                          <Text style={styles.devolucionHeaderTitle}>
                            Nota #{devolucion.codigo_devolucion || devolucion.id}
                          </Text>
                          <Text style={styles.devolucionHeaderMetaText}>
                            Pedido: #{devolucion.numero_pedido}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.devolucionHeaderRight}>
                        <Text style={styles.devolucionAmount}>
                          {formatCurrency(devolucion.monto_total)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.devolucionesList}
            />
          )}
        </View>
      );
    }

    // Tab de pedidos
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando pedidos...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Error al cargar pedidos</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => cargarPedidos()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (pedidosFiltrados.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="bag-outline" size={64} color="#757575" />
          <Text style={styles.emptyTitle}>
            {filtros.busqueda || filtros.estado ? 'No se encontraron pedidos' : 'No tienes pedidos aún'}
          </Text>
          <Text style={styles.emptyMessage}>
            {filtros.busqueda || filtros.estado 
              ? 'Intenta cambiar los filtros de búsqueda' 
              : 'Cuando realices tu primera compra, aparecerá aquí'
            }
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={pedidosFiltrados}
        renderItem={({ item, index }) => <PedidoItem pedido={item} index={index} />}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
        contentContainerStyle={styles.listContainer}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="bag-outline" size={28} color="#2196F3" />
          <Text style={styles.title}>Pedidos</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFiltros(prev => ({ ...prev, mostrandoFiltros: !prev.mostrandoFiltros }))}
        >
          <Ionicons name="options-outline" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pedidos' && styles.activeTab]}
          onPress={() => setActiveTab('pedidos')}
        >
          <Ionicons 
            name={activeTab === 'pedidos' ? "bag" : "bag-outline"} 
            size={20} 
            color={activeTab === 'pedidos' ? "#2196F3" : "#666"} 
          />
          <Text style={[styles.tabText, activeTab === 'pedidos' && styles.activeTabText]}>
            Pedidos ({pedidos.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'devoluciones' && styles.activeTab]}
          onPress={() => setActiveTab('devoluciones')}
        >
          <Ionicons 
            name={activeTab === 'devoluciones' ? "receipt" : "receipt-outline"} 
            size={20} 
            color={activeTab === 'devoluciones' ? "#2196F3" : "#666"} 
          />
          <Text style={[styles.tabText, activeTab === 'devoluciones' && styles.activeTabText]}>
            Devoluciones ({devoluciones.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtros (solo en tab de pedidos) */}
      {activeTab === 'pedidos' && filtros.mostrandoFiltros && (
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por N° de pedido"
              value={filtros.busqueda}
              onChangeText={(text) => setFiltros(prev => ({ ...prev, busqueda: text }))}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
            {['', 'PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'].map(estado => (
              <TouchableOpacity
                key={estado}
                style={[
                  styles.statusFilter,
                  filtros.estado === estado && styles.statusFilterActive
                ]}
                onPress={() => setFiltros(prev => ({ ...prev, estado: estado === filtros.estado ? '' : estado }))}
              >
                <Text style={[
                  styles.statusFilterText,
                  filtros.estado === estado && styles.statusFilterTextActive
                ]}>
                  {estado === '' ? 'Todos' : getStatusText(estado)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Contenido principal */}
      {renderContent()}

      {/* Modal de detalles original */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Detalles del Pedido {selectedPedido ? getNumeroAtencion(selectedPedido) : ''}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedPedido && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Información General</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha:</Text>
                  <Text style={styles.infoValue}>
                    {formatearFecha(selectedPedido.fechaPedido)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Estado:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedPedido.estado) }]}>
                    <Text style={styles.statusText}>{getStatusText(selectedPedido.estado)}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total:</Text>
                  <Text style={[styles.infoValue, styles.totalValue]}>
                    {formatCurrency(selectedPedido.total || 0)}
                  </Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>
                  Productos ({selectedPedido.detalles?.length || 0})
                </Text>
                {selectedPedido.detalles?.map((detalle, index) => (
                  <View key={detalle.id || index} style={styles.modalProductItem}>
                    <Image
                      source={{ uri: detalle.producto?.imagenUrl || 'https://via.placeholder.com/60' }}
                      style={styles.modalProductImage}
                    />
                    <View style={styles.modalProductInfo}>
                      <Text style={styles.modalProductName}>
                        {detalle.producto?.nombre || 'Producto sin nombre'}
                      </Text>
                      <Text style={styles.modalProductDetail}>
                        Cantidad: {detalle.cantidad} × {formatCurrency(detalle.precioUnitario || 0)}
                      </Text>
                    </View>
                    <Text style={styles.modalProductSubtotal}>
                      {formatCurrency(detalle.subtotal || 0)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* MODALES DE DEVOLUCIONES */}
      {showCancelModal && <CancelModal />}
      {showConfirmation && <ConfirmationModal />}
      {showNotificationModal && <NotificationModal />}
    </SafeAreaView>
  );
};

// ✅ ESTILOS (mantener los existentes - solo copio los principales)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
  },
  filterButton: {
    padding: 8,
  },
  
  // TABS
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },

  // FILTROS
  filtersContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  statusFilters: {
    marginBottom: 10,
  },
  statusFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  statusFilterActive: {
    backgroundColor: '#2196F3',
  },
  statusFilterText: {
    fontSize: 14,
    color: '#666',
  },
  statusFilterTextActive: {
    color: 'white',
    fontWeight: '500',
  },

  // CONTENIDO PRINCIPAL
  listContainer: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // PEDIDOS
  pedidoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pedidoHeader: {
    flexDirection: 'row',
    padding: 20,
  },
  pedidoInfo: {
    flex: 1,
  },
  pedidoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pedidoNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pedidoFecha: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  pedidoMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pedidoTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  pedidoProductos: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  devolutionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  devolutionButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },

  // PRODUCTOS EXPANDIBLES
  productosContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  productoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  productoImagen: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  productoInfo: {
    flex: 1,
    marginRight: 10,
  },
  productoNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  productoDetalle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productoSubtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  verDetallesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  verDetallesText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },

  // MODAL
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalSubtitleBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    marginLeft: 16,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  modalProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  modalProductInfo: {
    flex: 1,
    marginRight: 10,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  modalProductDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalProductSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  // DEVOLUCIONES
  devolucionesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  devolucionesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  devolucionesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  devolucionesList: {
    padding: 20,
  },
  emptyDevolucionesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyDevolucionesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDevolucionesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  devolucionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  devolucionHeader: {
    padding: 20,
    backgroundColor: '#f8fdf9',
  },
  devolucionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  devolucionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  devolucionHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  devolucionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  devolucionHeaderMetaText: {
    fontSize: 12,
    color: '#333',
  },
  devolucionHeaderRight: {
    alignItems: 'flex-end',
  },
  devolucionAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },

  // MODALES DE CANCELACIÓN
  modalHeaderContent: {
    flex: 1,
  },
  cancelTypeSelection: {
    padding: 20,
  },
  cancelTypeQuestion: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  cancelTypeOption: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelTypeComplete: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFEBEE',
  },
  cancelTypePartial: {
    borderColor: '#FFE0B2',
    backgroundColor: '#FFF8E1',
  },
  cancelTypeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  cancelTypeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  cancelTypeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  completeView: {
    padding: 20,
  },
  alertContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  alertTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    lineHeight: 20,
  },
  reasonSection: {
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: 'white',
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  partialView: {
    padding: 20,
  },
  partialTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 20,
  },
  productSelectionContainer: {
    marginBottom: 20,
  },
  productSelectionItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  productSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productSelectionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  productSelectionPrice: {
    fontSize: 14,
    color: '#666',
  },
  productSelectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productSelectionAvailable: {
    fontSize: 14,
    color: '#666',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantitySelectorLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 6,
    backgroundColor: 'white',
    minWidth: 60,
  },
  quantityPicker: {
    height: 40,
    width: 60,
  },

  // MODAL DE CONFIRMACIÓN
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmationContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  confirmationContent: {
    padding: 32,
    alignItems: 'center',
  },
  confirmationIcon: {
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmationCancelButton: {
    backgroundColor: '#f3f4f6',
  },
  confirmationCancelText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  confirmationConfirmButton: {
    // backgroundColor se establece dinámicamente
  },
  confirmationConfirmText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // NOTIFICACIONES
  notificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  notificationContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },
  notificationHeader: {
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  notificationIcon: {
    marginBottom: 16,
  },
  notificationTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  notificationMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  notificationDetails: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  notificationDetailsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  notificationDetailsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  notificationActions: {
    padding: 20,
  },
  notificationButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  notificationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default OrdersScreen;