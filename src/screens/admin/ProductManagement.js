// src/screens/admin/ProductManagement.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productosService } from '../../api/productos';
import { categoriasService } from '../../api/categorias';
import BarcodeScanner from '../../components/common/BarcodeScanner';

// Función de ayuda para formatear precios
const formatPrice = (price) => {
  const numericPrice = Number(price);
  return isNaN(numericPrice) ? "0.00" : numericPrice.toFixed(2);
};

const ProductManagement = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  
  
  // Estado para el modal de eliminación
  const [deleteModal, setDeleteModal] = useState({
    visible: false,
    product: null,
  });

  // Cargar productos y categorías
  const fetchProducts = async () => {
    try {
      const response = await productosService.getAll();
      setProducts(response.data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError('Error al cargar los productos');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriasService.getAll();
      setCategories(response.data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  };

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    await Promise.all([fetchProducts(), fetchCategories()]);

    if (showRefreshing) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Focus listener para recargar cuando se regrese de ProductForm
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProducts(); // Recargar productos cuando regrese a esta pantalla
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    loadData(true);
  };

  // Navegar a formulario de producto
  const handleCreateProduct = () => {
  Alert.alert(
    'Crear Producto',
    '¿Cómo deseas crear el producto?',
    [
      {
        text: 'Escanear Código',
        onPress: () => setShowScanner(true),
        style: 'default',
      },
      {
        text: 'Crear Manualmente',
        onPress: () => navigation.navigate('ProductForm'),
        style: 'default',
      },
      {
        text: 'Cancelar',
        style: 'cancel',
      },
    ]
  );
};
  
  const handleBarcodeScanned = async (barcode) => {
    setShowScanner(false);
    
    try {
      console.log('Buscando producto con código:', barcode);
      
      const response = await productosService.getByCodigoBarras(barcode);
      
      if (response.data) {
        // PRODUCTO ENCONTRADO - Ir directo a editar
        Alert.alert(
          'Producto Encontrado',
          `${response.data.nombre}\n\n¿Deseas actualizar este producto?`,
          [
            {
              text: 'Sí, Actualizar',
              onPress: () => navigation.navigate('ProductForm', { 
                product: response.data,  // Cambiar de scannedProduct a product
                isEdit: true            // Flag explícito para edición
              }),
            },
            {
              text: 'No, Crear Nuevo',
              onPress: () => {
                Alert.alert(
                  'Código Duplicado',
                  'Este código de barras ya está en uso. Por favor, usa un código diferente.',
                  [{ text: 'OK' }]
                );
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
      } else {
        // PRODUCTO NO ENCONTRADO - Crear nuevo
        navigation.navigate('ProductForm', { 
          scannedBarcode: barcode,
          isEdit: false  // Flag explícito para creación
        });
      }
      
    } catch (error) {
      console.log('Producto no encontrado, creando nuevo...');
      
      navigation.navigate('ProductForm', { 
        scannedBarcode: barcode,
        isEdit: false
      });
    }
  };

  const handleEditProduct = (product) => {
    navigation.navigate('ProductForm', { product });
  };



  // Manejar eliminación de producto
  const handleDeletePress = (product) => {
    setDeleteModal({
      visible: true,
      product,
    });
  };

  const confirmDelete = async () => {
    try {
      await productosService.delete(deleteModal.product.id);
      await fetchProducts();
      setDeleteModal({ visible: false, product: null });
      Alert.alert('Éxito', 'Producto eliminado correctamente');
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      Alert.alert('Error', 'Error al eliminar el producto. Es posible que tenga pedidos asociados.');
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ visible: false, product: null });
  };

  // Filtrar productos según búsqueda
  const filteredProducts = products.filter((product) =>
    product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.codigoBarras && product.codigoBarras.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Componente de item de producto
  const ProductItem = ({ item }) => {
    const isLowStock = item.stock <= item.stockMinimo;
    
    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.nombre}</Text>
            <Text style={styles.productCategory}>{item.categoriaNombre}</Text>
            {item.codigoBarras && (
              <Text style={styles.productCode}>Código: {item.codigoBarras}</Text>
            )}
          </View>
          <View style={styles.productActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditProduct(item)}
            >
              <Ionicons name="pencil" size={20} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeletePress(item)}
            >
              <Ionicons name="trash" size={20} color="#f44336" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.productDetails}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Precio:</Text>
            <Text style={styles.priceValue}>${formatPrice(item.precio)}</Text>
          </View>
          
          <View style={styles.stockContainer}>
            <Text style={styles.stockLabel}>Stock:</Text>
            <Text style={[
              styles.stockValue,
              isLowStock && styles.lowStock
            ]}>
              {item.stock}
            </Text>
            {isLowStock && (
              <Ionicons name="warning" size={16} color="#f44336" style={styles.warningIcon} />
            )}
          </View>
        </View>

        <View style={styles.statusContainer}>
          <View style={[
            styles.statusChip,
            item.disponible ? styles.availableChip : styles.unavailableChip
          ]}>
            <Text style={[
              styles.statusText,
              item.disponible ? styles.availableText : styles.unavailableText
            ]}>
              {item.disponible ? 'Disponible' : 'No disponible'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con búsqueda y botón agregar */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity style={styles.addButton} onPress={handleCreateProduct}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Mensaje de error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Lista de productos */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ProductItem item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No se encontraron productos</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateProduct}>
              <Text style={styles.emptyButtonText}>Crear primer producto</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal de confirmación de eliminación */}
      <Modal
        visible={deleteModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={32} color="#f44336" />
              <Text style={styles.modalTitle}>Confirmar eliminación</Text>
            </View>
            
            <Text style={styles.modalText}>
              ¿Está seguro de que desea eliminar el producto "{deleteModal.product?.nombre}"?
            </Text>
            <Text style={styles.modalSubtext}>
              Esta acción no se puede deshacer.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelDelete}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmDelete}>
                <Text style={styles.confirmButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Scanner Modal */}
      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </View>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#2196F3',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  listContainer: {
    padding: 15,
  },
  productCard: {
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
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  productCode: {
    fontSize: 12,
    color: '#999',
  },
  productActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  deleteButton: {
    // Estilo específico para botón eliminar si es necesario
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  lowStock: {
    color: '#f44336',
  },
  warningIcon: {
    marginLeft: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableChip: {
    backgroundColor: '#e8f5e8',
  },
  unavailableChip: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  availableText: {
    color: '#2e7d32',
  },
  unavailableText: {
    color: '#c62828',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#f44336',
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ProductManagement;