// src/screens/client/CartScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../contexts/CartContext';

const CartScreen = ({ navigation }) => {
  const { 
    items: cartItems = [],
    cartSummary, 
    loading, 
    error, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    fetchCart 
  } = useCart();

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [localLoading, setLocalLoading] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Seleccionar todos los items por defecto
    const allItemIds = new Set(cartItems.map(item => item.id));
    setSelectedItems(allItemIds);
  }, [cartItems]);

  useEffect(() => {
    fetchCart();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCart();
    setRefreshing(false);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setLocalLoading(prev => ({ ...prev, [itemId]: true }));
    const result = await updateQuantity(itemId, newQuantity);
    setLocalLoading(prev => ({ ...prev, [itemId]: false }));
    
    if (!result.success) {
      Alert.alert('Error', 'No se pudo actualizar la cantidad');
    }
  };

  const handleRemoveItem = async (itemId) => {
    Alert.alert(
      'Eliminar producto',
      '¿Estás seguro de que deseas eliminar este producto del carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLocalLoading(prev => ({ ...prev, [itemId]: true }));
            const result = await removeFromCart(itemId);
            setLocalLoading(prev => ({ ...prev, [itemId]: false }));
            
            if (result.success) {
              setSelectedItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
              });
            } else {
              Alert.alert('Error', 'No se pudo eliminar el producto');
            }
          }
        }
      ]
    );
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map(item => item.id)));
    }
  };

  const handleClearCart = () => {
    Alert.alert(
      'Limpiar carrito',
      '¿Estás seguro de que deseas eliminar todos los productos del carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            await clearCart();
          }
        }
      ]
    );
  };

  const getSelectedItemsTotal = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  const getSelectedItemsCount = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + item.cantidad, 0);
  };

  const handleContinueToCheckout = () => {
    if (selectedItems.size === 0) {
      Alert.alert('Atención', 'Selecciona al menos un producto para continuar');
      return;
    }
    
    const selectedCartItems = cartItems.filter(item => selectedItems.has(item.id));
    
    navigation.navigate('Checkout', { 
      selectedItems: selectedCartItems,
      selectedItemsCount: selectedItems.size,
      selectedItemsTotal: getSelectedItemsTotal()
    });
  };

  // Componente Checkbox personalizado
  const CustomCheckbox = ({ value, onValueChange, disabled }) => (
    <TouchableOpacity
      style={[styles.checkbox, value && styles.checkboxChecked, disabled && styles.checkboxDisabled]}
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
    >
      {value && <Ionicons name="checkmark" size={18} color="white" />}
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }) => {
    const isSelected = selectedItems.has(item.id);
    const isLoading = localLoading[item.id];

    return (
      <View style={styles.cartItem}>
        {/* Checkbox */}
        <View style={styles.checkboxContainer}>
          <CustomCheckbox
            value={isSelected}
            onValueChange={() => handleSelectItem(item.id)}
            disabled={isLoading}
          />
        </View>

        {/* Producto Info */}
        <View style={styles.productInfo}>
          <Image 
            source={{ 
              uri: item.producto?.imagenUrl || 'https://via.placeholder.com/80' 
            }} 
            style={styles.productImage}
          />
          
          <View style={styles.productDetails}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.producto?.nombre}
            </Text>
            <Text style={styles.productCategory}>
              {item.producto?.categoriaNombre}
            </Text>
            <Text style={styles.productPrice}>
              {formatPrice(item.producto?.precio || 0)}
            </Text>
          </View>
        </View>

        {/* Cantidad y Acciones */}
        <View style={styles.actionsContainer}>
          {/* Control de cantidad */}
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[styles.quantityButton, isLoading && styles.buttonDisabled]}
              onPress={() => handleQuantityChange(item.id, item.cantidad - 1)}
              disabled={item.cantidad <= 1 || isLoading}
            >
              <Ionicons name="remove" size={20} color="#2196F3" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.quantityInput}
              value={item.cantidad.toString()}
              onChangeText={(text) => {
                const value = parseInt(text) || 1;
                if (value > 0) {
                  handleQuantityChange(item.id, value);
                }
              }}
              keyboardType="numeric"
              editable={!isLoading}
            />
            
            <TouchableOpacity
              style={[styles.quantityButton, isLoading && styles.buttonDisabled]}
              onPress={() => handleQuantityChange(item.id, item.cantidad + 1)}
              disabled={isLoading}
            >
              <Ionicons name="add" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>

          {/* Subtotal y Eliminar */}
          <View style={styles.subtotalContainer}>
            <Text style={styles.subtotalText}>
              {formatPrice(item.subtotal || 0)}
            </Text>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleRemoveItem(item.id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#f44336" />
              ) : (
                <Ionicons name="trash-outline" size={20} color="#f44336" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={100} color="#ccc" />
      <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
      <Text style={styles.emptySubtitle}>
        ¡Descubre nuestros productos y encuentra lo que necesitas!
      </Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => navigation.navigate('Catalog')}
      >
        <Text style={styles.exploreButtonText}>Explorar productos</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Productos ({cartItems.length})</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleSelectAll} style={styles.selectAllButton}>
            <CustomCheckbox
              value={selectedItems.size === cartItems.length && cartItems.length > 0}
              onValueChange={handleSelectAll}
              disabled={false}
            />
            <Text style={styles.selectAllText}>
              {selectedItems.size === cartItems.length ? 'Deseleccionar' : 'Seleccionar'} todo
            </Text>
          </TouchableOpacity>
          {cartItems.length > 0 && (
            <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
              <Ionicons name="trash-outline" size={20} color="#f44336" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>
          Productos seleccionados ({selectedItems.size})
        </Text>
        <Text style={styles.summaryValue}>
          {formatPrice(getSelectedItemsTotal())}
        </Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Cantidad total</Text>
        <Text style={styles.summaryValue}>{getSelectedItemsCount()} items</Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>
          {formatPrice(getSelectedItemsTotal())}
        </Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.checkoutButton,
          selectedItems.size === 0 && styles.checkoutButtonDisabled
        ]}
        onPress={handleContinueToCheckout}
        disabled={selectedItems.size === 0 || loading}
      >
        <Text style={styles.checkoutButtonText}>
          Proceder al Pago ({selectedItems.size})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.continueShoppingButton}
        onPress={() => navigation.navigate('Catalog')}
      >
        <Text style={styles.continueShoppingText}>Seguir comprando</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && cartItems.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando carrito...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {cartItems.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2196F3']}
              />
            }
          />
          {renderSummary()}
        </>
      )}
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
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 15,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  header: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  selectAllText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  clearButton: {
    padding: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  listContent: {
    paddingBottom: 20,
  },
  cartItem: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  checkboxContainer: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 1,
  },
  productInfo: {
    flexDirection: 'row',
    marginLeft: 30,
    marginBottom: 10,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  actionsContainer: {
    marginLeft: 30,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  quantityInput: {
    width: 50,
    textAlign: 'center',
    fontSize: 16,
    marginHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
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
  exploreButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 15,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  checkoutButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueShoppingButton: {
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  continueShoppingText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CartScreen;