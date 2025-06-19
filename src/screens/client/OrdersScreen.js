// src/screens/OrdersScreen.js
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useExchangeRate } from '../../contexts/ExchangeRateContext';
import pedidoService from '../../api/pedidos'; 
import codigosQrAPI from '../../api/codigosQr';

const { width: screenWidth } = Dimensions.get('window');

const OrdersScreen = () => {
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

  // Estados de modal
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // ✅ FUNCIÓN MEJORADA: Obtener productos desde QR (igual que web)
  const obtenerProductosDesdeQR = async (pedido) => {
    try {
      if (pedido.qr_id) {
        console.log('🔍 Obteniendo productos desde QR:', pedido.qr_id);
        
        const qrResponse = await codigosQrAPI.obtener(pedido.qr_id);
        
        if (qrResponse.success && qrResponse.qr) {
          const qrData = qrResponse.qr;
          let productos = [];
          
          // Parsear datos del QR
          if (qrData.datos) {
            try {
              const datosParseados = typeof qrData.datos === 'string' 
                ? JSON.parse(qrData.datos) 
                : qrData.datos;
              
              productos = datosParseados.productos || [];
              console.log('✅ Productos encontrados en QR:', productos);
            } catch (parseError) {
              console.warn('⚠️ Error al parsear datos del QR:', parseError);
            }
          }
          
          // Si el QR tiene productos directamente
          if (qrData.productos && Array.isArray(qrData.productos)) {
            productos = qrData.productos;
          }
          
          return productos;
        }
      }
      
      return [];
    } catch (error) {
      console.warn('⚠️ Error al obtener productos desde QR:', error);
      return [];
    }
  };

  // ✅ FUNCIÓN MEJORADA: Cargar detalles completos con fallback a QR
  const cargarDetallesCompletos = async (pedido) => {
    try {
      // Intentar obtener detalles normales del pedido
      let detallesFinales = [];
      
      try {
        const detalleResponse = await pedidoService.obtenerDetallePedido(pedido.id);
        if (detalleResponse.success && detalleResponse.detalles) {
          detallesFinales = detalleResponse.detalles;
        }
      } catch (detailError) {
        console.warn('⚠️ No se pudieron obtener detalles normales:', detailError);
      }
      
      // Si no hay detalles o están incompletos, intentar desde QR
      if (!detallesFinales.length || !detallesFinales[0]?.producto?.nombre) {
        console.log('🔄 Detalles incompletos, buscando en QR...');
        const productosQR = await obtenerProductosDesdeQR(pedido);
        
        if (productosQR.length > 0) {
          // Convertir productos del QR al formato de detalles
          detallesFinales = productosQR.map((producto, index) => ({
            id: producto.id || `qr_${index}`,
            cantidad: producto.cantidad || 1,
            precio_unitario: producto.precio || producto.precio_unitario || 0,
            subtotal: producto.subtotal || ((producto.precio || 0) * (producto.cantidad || 1)),
            producto: {
              id: producto.id,
              nombre: producto.nombre || 'Producto sin nombre',
              imagen_url: producto.imagenUrl || producto.imagen_url,
              categoria: producto.categoria,
              precio: producto.precio || producto.precio_unitario || 0
            }
          }));
          
          console.log('✅ Detalles reconstruidos desde QR:', detallesFinales);
        }
      }
      
      return {
        ...pedido,
        detalles: detallesFinales,
        productos_count: detallesFinales.length
      };
    } catch (error) {
      console.warn('Error al cargar detalles completos del pedido:', pedido.id, error);
      return {
        ...pedido,
        detalles: [],
        productos_count: 0
      };
    }
  };

  // ✅ FUNCIÓN PRINCIPAL: Cargar pedidos (usando API de cliente)
  const cargarPedidos = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // ✅ Usar endpoint específico para clientes
      console.log('📱 Cargando pedidos del cliente...');
      const response = await pedidoService.cliente.obtenerMisPedidos({
        limit: 50,
        offset: 0,
        orderBy: 'fecha_pedido',
        orderDir: 'DESC'
      });

      console.log('📋 Respuesta de pedidos:', response);

      if (response.success && response.pedidos) {
        // ✅ Cargar detalles completos para cada pedido
        const pedidosConDetalles = await Promise.all(
          response.pedidos.map(cargarDetallesCompletos)
        );

        setPedidos(pedidosConDetalles);
        console.log('✅ Pedidos cargados con detalles:', pedidosConDetalles.length);
      } else {
        throw new Error(response.message || 'No se pudieron cargar los pedidos');
      }

    } catch (error) {
      console.error('❌ Error al cargar pedidos:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al cargar los pedidos';
      setError(errorMessage);
      
      // Si hay un error de autenticación, mostrar alerta
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

  // Cargar pedidos al montar el componente
  useEffect(() => {
    cargarPedidos();
  }, []);

  // ✅ Función para refrescar
  const onRefresh = useCallback(() => {
    cargarPedidos(true);
  }, []);

  // Funciones auxiliares
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

    // Filtro por búsqueda
    if (filtros.busqueda.trim()) {
      const busqueda = filtros.busqueda.toLowerCase();
      const numeroAtencion = getNumeroAtencion(pedido).toLowerCase();
      cumpleFiltros = cumpleFiltros && numeroAtencion.includes(busqueda);
    }

    // Filtro por estado
    if (filtros.estado) {
      cumpleFiltros = cumpleFiltros && pedido.estado?.toUpperCase() === filtros.estado.toUpperCase();
    }

    return cumpleFiltros;
  });

  // ✅ Componente de item de pedido
  const PedidoItem = ({ pedido, index }) => {
    const isExpanded = expandedItems.has(pedido.id);

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
              {pedido.qr_id && (
                <View style={styles.qrBadge}>
                  <Ionicons name="qr-code-outline" size={12} color="#666" />
                  <Text style={styles.qrText}>QR</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.pedidoFecha}>
              {formatDate(pedido.fecha_pedido || pedido.createdAt)}
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
              {pedido.productos_count || 0} productos
            </Text>
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
                    uri: detalle.producto?.imagen_url || 'https://via.placeholder.com/50' 
                  }}
                  style={styles.productoImagen}
                  defaultSource={{ uri: 'https://via.placeholder.com/50' }}
                />
                <View style={styles.productoInfo}>
                  <Text style={styles.productoNombre} numberOfLines={2}>
                    {detalle.producto?.nombre || 'Producto sin nombre'}
                  </Text>
                  <Text style={styles.productoDetalle}>
                    Cantidad: {detalle.cantidad} • {formatCurrency(detalle.precio_unitario || 0)}
                  </Text>
                  {detalle.producto?.categoria && (
                    <Text style={styles.productoCategoria}>
                      {detalle.producto.categoria}
                    </Text>
                  )}
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

  // ✅ Renderizar contenido principal
  const renderContent = () => {
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="bag-outline" size={28} color="#2196F3" />
          <Text style={styles.title}>Mis Pedidos</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFiltros(prev => ({ ...prev, mostrandoFiltros: !prev.mostrandoFiltros }))}
        >
          <Ionicons name="options-outline" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* ✅ Filtros colapsables */}
      {filtros.mostrandoFiltros && (
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por N° de pedido"
              value={filtros.busqueda}
              onChangeText={(text) => setFiltros(prev => ({ ...prev, busqueda: text }))}
            />
            {filtros.busqueda && (
              <TouchableOpacity
                onPress={() => setFiltros(prev => ({ ...prev, busqueda: '' }))}
                style={styles.clearButton}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            )}
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

          <Text style={styles.resultCount}>
            {pedidosFiltrados.length} pedidos encontrados
          </Text>
        </View>
      )}

      {/* Contenido principal */}
      {renderContent()}

      {/* ✅ Modal de detalles */}
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
              {/* Info general */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Información General</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha:</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(selectedPedido.fecha_pedido || selectedPedido.createdAt)}
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
                {selectedPedido.notas && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Notas:</Text>
                    <Text style={styles.infoValue}>{selectedPedido.notas}</Text>
                  </View>
                )}
              </View>

              {/* Productos */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>
                  Productos ({selectedPedido.detalles?.length || 0})
                </Text>
                {selectedPedido.detalles?.map((detalle, index) => (
                  <View key={detalle.id || index} style={styles.modalProductItem}>
                    <Image
                      source={{ uri: detalle.producto?.imagen_url || 'https://via.placeholder.com/60' }}
                      style={styles.modalProductImage}
                    />
                    <View style={styles.modalProductInfo}>
                      <Text style={styles.modalProductName}>
                        {detalle.producto?.nombre || 'Producto sin nombre'}
                      </Text>
                      <Text style={styles.modalProductDetail}>
                        Cantidad: {detalle.cantidad} × {formatCurrency(detalle.precio_unitario || 0)}
                      </Text>
                      {detalle.producto?.categoria && (
                        <Text style={styles.modalProductCategory}>
                          {detalle.producto.categoria}
                        </Text>
                      )}
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
    </SafeAreaView>
  );
};

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
  clearButton: {
    padding: 5,
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
  resultCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
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
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 10,
  },
  qrText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 2,
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
  productoCategoria: {
    fontSize: 10,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
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
  modalProductCategory: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  modalProductSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default OrdersScreen;
