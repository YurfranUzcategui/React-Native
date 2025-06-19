// src/screens/empleado/OrderManagement.js
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
  FlatList,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useExchangeRate } from '../../contexts/ExchangeRateContext';
import empleadoService from '../../api/empleado'; // ✅ Usar API de empleado

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OrderManagement = () => {
  const { user } = useAuth();
  const { formatCurrency } = useExchangeRate();

  // Estados principales
  const [pedidosPreparacion, setPedidosPreparacion] = useState([]);
  const [pedidosListos, setPedidosListos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Estados de UI
  const [activeTab, setActiveTab] = useState(0); // 0: Preparación, 1: Listos
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [expandedCards, setExpandedCards] = useState(new Set());
  
  // Estados de confirmación
  const [confirmAction, setConfirmAction] = useState({
    type: '', // 'marcar_listo' | 'marcar_entregado'
    pedidoId: null,
    title: '',
    message: '',
    onConfirm: null
  });

  // ✅ Cargar pedidos automáticamente
  useEffect(() => {
    loadPedidos();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(() => {
      loadPedidos(true); // Silent refresh
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  // ✅ FUNCIÓN PRINCIPAL: Cargar pedidos
  const loadPedidos = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      if (activeTab === 0) {
        // Cargar pedidos en preparación
        console.log('🟡 Cargando pedidos en preparación...');
        
        const response = await empleadoService.obtenerPedidosPreparacion();
        
        if (response.success && response.data) {
          const todosLosPedidos = response.data;
          // Filtrar pedidos PAGADO y EN_PREPARACION
          const enPreparacion = todosLosPedidos.filter(p => 
            p.estado === 'PAGADO' || p.estado === 'EN_PREPARACION'
          );
          
          setPedidosPreparacion(enPreparacion);
          console.log(`📊 Pedidos en preparación: ${enPreparacion.length}`);
        } else {
          throw new Error(response.message || 'Error al cargar pedidos en preparación');
        }
        
      } else {
        // Cargar pedidos listos
        console.log('🟢 Cargando pedidos listos...');
        
        const response = await empleadoService.obtenerPedidosListos();
        
        if (response.success && response.data) {
          setPedidosListos(response.data);
          console.log(`📊 Pedidos listos: ${response.data.length}`);
        } else {
          throw new Error(response.message || 'Error al cargar pedidos listos');
        }
      }
      
    } catch (error) {
      console.error('❌ Error al cargar pedidos:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Error al cargar pedidos';
      setError(errorMessage);
      
      if (!silent) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ Función para refrescar
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPedidos();
  }, [activeTab]);

  // ✅ Cambiar entre tabs
  const handleTabChange = (tabIndex) => {
    setActiveTab(tabIndex);
    setExpandedCards(new Set()); // Limpiar expansiones
  };

  // ✅ Expandir/contraer detalles
  const toggleExpandCard = (pedidoId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(pedidoId)) {
      newExpanded.delete(pedidoId);
    } else {
      newExpanded.add(pedidoId);
    }
    setExpandedCards(newExpanded);
  };

  // ✅ Ver detalles completos
  const handleViewDetails = async (pedido) => {
    try {
      console.log('👀 Obteniendo detalles del pedido:', pedido.id);
      
      // Si ya tiene detalles, mostrar directamente
      if (pedido.detalles && pedido.detalles.length > 0) {
        setSelectedPedido(pedido);
        setDetailModalVisible(true);
        return;
      }
      
      // Obtener detalles del servidor
      const response = await empleadoService.obtenerDetallePedido(pedido.id);
      
      if (response.success && response.data) {
        setSelectedPedido(response.data);
        setDetailModalVisible(true);
      } else {
        // Si no hay detalles, mostrar con advertencia
        setSelectedPedido({
          ...pedido,
          detalles: [],
          _sinDetalles: true
        });
        setDetailModalVisible(true);
      }
      
    } catch (error) {
      console.error('❌ Error al obtener detalles:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles del pedido');
    }
  };

  // ✅ Marcar pedido como listo
  const handleMarcarListo = (pedidoId) => {
    setConfirmAction({
      type: 'marcar_listo',
      pedidoId,
      title: 'Marcar como Listo',
      message: '¿Confirmas que el pedido está listo para entregar?',
      onConfirm: async () => {
        try {
          setLoading(true);
          console.log('🔄 Marcando pedido como listo:', pedidoId);
          
          const response = await empleadoService.marcarPedidoListo(pedidoId);
          
          if (response.success) {
            Alert.alert('¡Éxito!', 'Pedido marcado como listo');
            await loadPedidos();
          } else {
            throw new Error(response.message || 'Error al marcar pedido como listo');
          }
          
        } catch (error) {
          console.error('❌ Error al marcar como listo:', error);
          Alert.alert('Error', error.message || 'Error al marcar pedido como listo');
        } finally {
          setLoading(false);
          setConfirmModalVisible(false);
        }
      }
    });
    setConfirmModalVisible(true);
  };

  // ✅ Marcar pedido como entregado
  const handleMarcarEntregado = (pedidoId) => {
    setConfirmAction({
      type: 'marcar_entregado',
      pedidoId,
      title: 'Marcar como Entregado',
      message: '¿Confirmas que el pedido ha sido entregado al cliente?',
      onConfirm: async () => {
        try {
          setLoading(true);
          console.log('🚚 Marcando pedido como entregado:', pedidoId);
          
          const response = await empleadoService.marcarPedidoEntregado(pedidoId);
          
          if (response.success) {
            Alert.alert('¡Éxito!', 'Pedido marcado como entregado');
            await loadPedidos();
          } else {
            throw new Error(response.message || 'Error al marcar pedido como entregado');
          }
          
        } catch (error) {
          console.error('❌ Error al marcar como entregado:', error);
          Alert.alert('Error', error.message || 'Error al marcar pedido como entregado');
        } finally {
          setLoading(false);
          setConfirmModalVisible(false);
        }
      }
    });
    setConfirmModalVisible(true);
  };

  // Funciones auxiliares
  const getStatusColor = (estado) => {
    switch (estado?.toUpperCase()) {
      case 'PAGADO': return '#FF9800';
      case 'EN_PREPARACION': return '#2196F3';
      case 'LISTO': return '#4CAF50';
      case 'ENTREGADO': return '#9E9E9E';
      default: return '#757575';
    }
  };

  const getStatusIcon = (estado) => {
    switch (estado?.toUpperCase()) {
      case 'PAGADO': return 'time-outline';
      case 'EN_PREPARACION': return 'restaurant-outline';
      case 'LISTO': return 'checkmark-circle-outline';
      case 'ENTREGADO': return 'cube-outline';
      default: return 'help-outline';
    }
  };

  const getStatusText = (estado) => {
    switch (estado?.toUpperCase()) {
      case 'PAGADO': return 'Pendiente Preparación';
      case 'EN_PREPARACION': return 'En Preparación';
      case 'LISTO': return 'Listo para Entregar';
      case 'ENTREGADO': return 'Entregado';
      default: return estado || 'Desconocido';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    }
  };

  const getNumeroAtencion = (pedido) => {
    return pedido.numeroAtencion || pedido.numero_atencion || `#${pedido.id}`;
  };

  // ✅ Componente de estadísticas
  const StatsGrid = () => {
    const currentData = activeTab === 0 ? pedidosPreparacion : pedidosListos;
    
    const stats = activeTab === 0 ? [
      {
        label: 'Pendientes',
        value: pedidosPreparacion.filter(p => p.estado === 'PAGADO').length,
        color: '#FF9800',
        icon: 'time-outline'
      },
      {
        label: 'En Preparación',
        value: pedidosPreparacion.filter(p => p.estado === 'EN_PREPARACION').length,
        color: '#2196F3',
        icon: 'restaurant-outline'
      },
      {
        label: 'Total Activos',
        value: pedidosPreparacion.length,
        color: '#9C27B0',
        icon: 'list-outline'
      }
    ] : [
      {
        label: 'Listos',
        value: pedidosListos.length,
        color: '#4CAF50',
        icon: 'checkmark-circle-outline'
      },
      {
        label: 'Para Entregar',
        value: pedidosListos.filter(p => p.estado === 'LISTO').length,
        color: '#FF5722',
        icon: 'cube-outline'
      },
      {
        label: 'Total',
        value: pedidosListos.length,
        color: '#607D8B',
        icon: 'apps-outline'
      }
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        {stats.map((stat, index) => (
          <View key={index} style={[styles.statCard, { borderTopColor: stat.color }]}>
            <View style={styles.statHeader}>
              <Ionicons name={stat.icon} size={24} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>
                {stat.value}
              </Text>
            </View>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  // ✅ Componente de card de pedido
  const PedidoCard = ({ pedido, isListoTab = false }) => {
    const isExpanded = expandedCards.has(pedido.id);
    const timeAgo = getTimeAgo(pedido.fechaPedido || pedido.fecha_pedido);

    return (
      <View style={[
        styles.pedidoCard,
        { borderLeftColor: getStatusColor(pedido.estado) }
      ]}>
        {/* Header del pedido */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.pedidoNumero}>
              {getNumeroAtencion(pedido)}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(pedido.estado) }
            ]}>
              <Ionicons 
                name={getStatusIcon(pedido.estado)} 
                size={12} 
                color="white" 
              />
              <Text style={styles.statusText}>
                {getStatusText(pedido.estado)}
              </Text>
            </View>
          </View>
          
          <View style={styles.cardHeaderRight}>
            <Text style={styles.pedidoTotal}>
              {formatCurrency(pedido.total || 0)}
            </Text>
            {timeAgo && (
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={12} color="#666" />
                <Text style={styles.timeAgo}>{timeAgo}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Información del cliente */}
        <View style={styles.clienteInfo}>
          <View style={styles.clienteRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.clienteNombre}>
              {pedido.cliente?.nombre || 'Cliente sin nombre'}
            </Text>
          </View>
          
          {pedido.cliente?.telefono && (
            <View style={styles.clienteRow}>
              <Ionicons name="call-outline" size={16} color="#666" />
              <Text style={styles.clienteTelefono}>
                {pedido.cliente.telefono}
              </Text>
            </View>
          )}
          
          <View style={styles.clienteRow}>
            <Ionicons name="bag-outline" size={16} color="#666" />
            <Text style={styles.productosCount}>
              {pedido.detalles?.length || 0} productos
            </Text>
          </View>
        </View>

        {/* Botón expandir */}
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => toggleExpandCard(pedido.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? 'Ocultar' : 'Ver'} Productos
          </Text>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#2196F3" 
          />
        </TouchableOpacity>

        {/* ✅ Productos expandibles */}
        {isExpanded && (
          <View style={styles.productosContainer}>
            {pedido.detalles && pedido.detalles.length > 0 ? (
              <>
                <Text style={styles.productosTitle}>Productos a Preparar:</Text>
                {pedido.detalles.map((detalle, index) => (
                  <View key={detalle.id || index} style={styles.productoItem}>
                    <View style={styles.productoInfo}>
                      <Text style={styles.productoNombre} numberOfLines={2}>
                        {detalle.productoNombre || detalle.producto?.nombre || 'Sin nombre'}
                      </Text>
                      <Text style={styles.productoDetalle}>
                        Cantidad: {detalle.cantidad} • {formatCurrency(detalle.precioUnitario || detalle.precio_unitario || 0)}
                      </Text>
                      {(detalle.productoDescripcion || detalle.producto?.descripcion) && (
                        <Text style={styles.productoDescripcion} numberOfLines={2}>
                          {detalle.productoDescripcion || detalle.producto.descripcion}
                        </Text>
                      )}
                      {detalle.notasEspeciales && (
                        <Text style={styles.notasEspeciales}>
                          ⚠️ {detalle.notasEspeciales}
                        </Text>
                      )}
                    </View>
                    <View style={styles.cantidadBadge}>
                      <Text style={styles.cantidadText}>{detalle.cantidad}</Text>
                    </View>
                    <Text style={styles.subtotalText}>
                      {formatCurrency(detalle.subtotal || 0)}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.noProductsContainer}>
                <Ionicons name="alert-circle-outline" size={24} color="#FF9800" />
                <Text style={styles.noProductsText}>
                  No hay detalles de productos disponibles
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Notas del pedido */}
        {pedido.notas && (
          <View style={styles.notasContainer}>
            <Ionicons name="document-text-outline" size={16} color="#2196F3" />
            <Text style={styles.notasText}>{pedido.notas}</Text>
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => handleViewDetails(pedido)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={16} color="#2196F3" />
            <Text style={styles.detailButtonText}>Ver Detalle</Text>
          </TouchableOpacity>

          {!isListoTab && pedido.estado === 'EN_PREPARACION' && (
            <TouchableOpacity
              style={styles.readyButton}
              onPress={() => handleMarcarListo(pedido.id)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="white" />
              <Text style={styles.readyButtonText}>Marcar Listo</Text>
            </TouchableOpacity>
          )}

          {isListoTab && pedido.estado === 'LISTO' && (
            <TouchableOpacity
              style={styles.deliveredButton}
              onPress={() => handleMarcarEntregado(pedido.id)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Ionicons name="cube-outline" size={16} color="white" />
              <Text style={styles.deliveredButtonText}>Entregar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ✅ Renderizar lista de pedidos
  const renderPedidosList = () => {
    const currentData = activeTab === 0 ? pedidosPreparacion : pedidosListos;
    
    if (loading && currentData.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>
            Cargando pedidos {activeTab === 0 ? 'en preparación' : 'listos'}...
          </Text>
        </View>
      );
    }

    if (currentData.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons 
            name={activeTab === 0 ? "restaurant-outline" : "checkmark-circle-outline"} 
            size={64} 
            color="#ccc" 
          />
          <Text style={styles.emptyTitle}>
            {activeTab === 0 
              ? 'No hay pedidos en preparación' 
              : 'No hay pedidos listos'
            }
          </Text>
          <Text style={styles.emptyMessage}>
            {activeTab === 0 
              ? 'Los nuevos pedidos aparecerán aquí automáticamente'
              : 'Los pedidos marcados como listos aparecerán aquí'
            }
          </Text>
        </View>
      );
    }

    // Ordenar pedidos: EN_PREPARACION primero, luego por fecha
    const sortedData = [...currentData].sort((a, b) => {
      if (a.estado === 'EN_PREPARACION' && b.estado !== 'EN_PREPARACION') return -1;
      if (b.estado === 'EN_PREPARACION' && a.estado !== 'EN_PREPARACION') return 1;
      return new Date(a.fechaPedido || a.fecha_pedido) - new Date(b.fechaPedido || b.fecha_pedido);
    });

    return (
      <FlatList
        data={sortedData}
        renderItem={({ item }) => (
          <PedidoCard pedido={item} isListoTab={activeTab === 1} />
        )}
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
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="restaurant-outline" size={28} color="#2196F3" />
          <Text style={styles.title}>Gestión de Pedidos</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => loadPedidos()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size={20} color="#2196F3" />
          ) : (
            <Ionicons name="refresh-outline" size={24} color="#2196F3" />
          )}
        </TouchableOpacity>
      </View>

      {/* Estadísticas */}
      <StatsGrid />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 0 && styles.activeTab
          ]}
          onPress={() => handleTabChange(0)}
        >
          <Text style={[
            styles.tabText,
            activeTab === 0 && styles.activeTabText
          ]}>
            En Preparación ({pedidosPreparacion.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 1 && styles.activeTab
          ]}
          onPress={() => handleTabChange(1)}
        >
          <Text style={[
            styles.tabText,
            activeTab === 1 && styles.activeTabText
          ]}>
            Listos ({pedidosListos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de pedidos */}
      {renderPedidosList()}

      {/* ✅ Modal de detalles */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Detalle del Pedido {selectedPedido ? getNumeroAtencion(selectedPedido) : ''}
            </Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedPedido && (
            <ScrollView style={styles.modalContent}>
              {/* Info general */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Información General</Text>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Estado:</Text>
                  <View style={[
                    styles.modalStatusBadge,
                    { backgroundColor: getStatusColor(selectedPedido.estado) }
                  ]}>
                    <Text style={styles.modalStatusText}>
                      {getStatusText(selectedPedido.estado)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha:</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(selectedPedido.fechaPedido || selectedPedido.fecha_pedido)}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total:</Text>
                  <Text style={[styles.infoValue, styles.totalValue]}>
                    {formatCurrency(selectedPedido.total || 0)}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Cliente:</Text>
                  <Text style={styles.infoValue}>
                    {selectedPedido.cliente?.nombre || 'Sin nombre'}
                  </Text>
                </View>
                
                {selectedPedido.cliente?.telefono && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Teléfono:</Text>
                    <Text style={styles.infoValue}>
                      {selectedPedido.cliente.telefono}
                    </Text>
                  </View>
                )}
                
                {selectedPedido.notas && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Notas:</Text>
                    <Text style={styles.infoValue}>
                      {selectedPedido.notas}
                    </Text>
                  </View>
                )}
              </View>

              {/* Productos */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>
                  Productos ({selectedPedido.detalles?.length || 0})
                </Text>
                
                {selectedPedido._sinDetalles ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning-outline" size={32} color="#FF9800" />
                    <Text style={styles.errorTitle}>
                      No se pudieron cargar los detalles
                    </Text>
                    <Text style={styles.errorMessage}>
                      Los productos pueden estar en la base de datos pero no se pudieron sincronizar
                    </Text>
                  </View>
                ) : selectedPedido.detalles && selectedPedido.detalles.length > 0 ? (
                  selectedPedido.detalles.map((detalle, index) => (
                    <View key={detalle.id || index} style={styles.modalProductItem}>
                      <View style={styles.modalProductInfo}>
                        <Text style={styles.modalProductName}>
                          {detalle.productoNombre || detalle.producto?.nombre || 'Sin nombre'}
                        </Text>
                        <Text style={styles.modalProductDetail}>
                          Cantidad: {detalle.cantidad} × {formatCurrency(detalle.precioUnitario || detalle.precio_unitario || 0)}
                        </Text>
                        {(detalle.productoDescripcion || detalle.producto?.descripcion) && (
                          <Text style={styles.modalProductDescription}>
                            {detalle.productoDescripcion || detalle.producto.descripcion}
                          </Text>
                        )}
                        {detalle.notasEspeciales && (
                          <Text style={styles.modalProductNotes}>
                            ⚠️ {detalle.notasEspeciales}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.modalProductSubtotal}>
                        {formatCurrency(detalle.subtotal || 0)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.noProductsContainer}>
                    <Ionicons name="bag-outline" size={32} color="#ccc" />
                    <Text style={styles.noProductsText}>
                      No hay productos disponibles
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          {/* Botones de acción en modal */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>

            {selectedPedido?.estado === 'EN_PREPARACION' && (
              <TouchableOpacity
                style={styles.modalReadyButton}
                onPress={() => {
                  setDetailModalVisible(false);
                  handleMarcarListo(selectedPedido.id);
                }}
                disabled={loading}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                <Text style={styles.modalReadyText}>Marcar Listo</Text>
              </TouchableOpacity>
            )}

            {selectedPedido?.estado === 'LISTO' && (
              <TouchableOpacity
                style={styles.modalDeliveredButton}
                onPress={() => {
                  setDetailModalVisible(false);
                  handleMarcarEntregado(selectedPedido.id);
                }}
                disabled={loading}
              >
                <Ionicons name="cube-outline" size={16} color="white" />
                <Text style={styles.modalDeliveredText}>Marcar Entregado</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ✅ Modal de confirmación */}
      <Modal
        visible={confirmModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmHeader}>
              <Ionicons 
                name={confirmAction.type === 'marcar_listo' ? "checkmark-circle-outline" : "cube-outline"}
                size={32} 
                color={confirmAction.type === 'marcar_listo' ? "#4CAF50" : "#FF5722"}
              />
              <Text style={styles.confirmTitle}>{confirmAction.title}</Text>
            </View>
            
            <Text style={styles.confirmMessage}>{confirmAction.message}</Text>
            <Text style={styles.confirmSubtext}>Esta acción no se puede deshacer.</Text>
            
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: confirmAction.type === 'marcar_listo' ? "#4CAF50" : "#FF5722" }
                ]}
                onPress={confirmAction.onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size={16} color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {confirmAction.type === 'marcar_listo' ? 'Marcar Listo' : 'Marcar Entregado'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  refreshButton: {
    padding: 8,
  },
  statsContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 110,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
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
  listContainer: {
    padding: 20,
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
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 15,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  pedidoNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  pedidoTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeAgo: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  clienteInfo: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  clienteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  clienteNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  clienteTelefono: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  productosCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    marginBottom: 15,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginRight: 6,
  },
  productosContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: -15,
    paddingTop: 15,
  },
  productosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  productoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
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
  productoDescripcion: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  notasEspeciales: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '500',
    marginTop: 2,
  },
  cantidadBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  cantidadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subtotalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minWidth: 60,
    textAlign: 'right',
  },
  noProductsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noProductsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  notasContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 8,
  },
  notasText: {
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
  },
  detailButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  readyButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  readyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  deliveredButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FF5722',
    borderRadius: 8,
  },
  deliveredButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  // Modal styles
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
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  modalStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalProductItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  modalProductDescription: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  modalProductNotes: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  modalProductSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  modalCloseButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalReadyButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  modalReadyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
  modalDeliveredButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FF5722',
    borderRadius: 8,
  },
  modalDeliveredText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 6,
  },
  // Confirmation modal styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 15,
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default OrderManagement;