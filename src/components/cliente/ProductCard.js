// src/components/cliente/ProductCard.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExchangeRate } from '../../contexts/ExchangeRateContext';

const ProductCard = ({ product, onProductPress, onAddToCart }) => {
  // Imagen por defecto si no hay una disponible
  const defaultImageUrl = 'https://via.placeholder.com/300x200?text=Producto';
  
  // Formatear precio
  const formatPrice = (price) => {
    const numericPrice = Number(price);
    return isNaN(numericPrice) ? "0.00" : numericPrice.toFixed(2);
  };

  const handleProductPress = () => {
    if (onProductPress) {
      onProductPress(product);
    }
  };

  const handleAddToCart = () => {
    if (!product.disponible || product.stock <= 0) {
      Alert.alert('Producto no disponible', 'Este producto no está disponible en este momento.');
      return;
    }
    
    if (onAddToCart) {
      onAddToCart(product);
    } else {
      Alert.alert('Agregado', `${product.nombre} agregado al carrito`);
    }
  };

  const isAvailable = product.disponible && product.stock > 0;
  const { 
    exchangeRate, 
    loading, 
    error, 
    refresh, 
    formatCurrency,
    convertUSDtoCLP 
  } = useExchangeRate();

  return (
    <TouchableOpacity style={styles.card} onPress={handleProductPress} activeOpacity={0.8}>
      {/* Imagen del producto */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.imagenUrl || defaultImageUrl }}
          style={styles.productImage}
          resizeMode="cover"
        />
        
        {/* Badge de agotado */}
        {!isAvailable && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Agotado</Text>
          </View>
        )}
      </View>

      {/* Contenido de la tarjeta */}
      <View style={styles.content}>
        {/* Nombre del producto */}
        <Text style={styles.productName} numberOfLines={2}>
          {product.nombre}
        </Text>

        {/* Categoría */}
        <View style={styles.categoryContainer}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{product.categoriaNombre}</Text>
          </View>
        </View>

        {/* Descripción */}
        <Text style={styles.description} numberOfLines={3}>
          {product.descripcion ? (
            product.descripcion.length > 100 
              ? `${product.descripcion.substring(0, 100)}...` 
              : product.descripcion
          ) : 'No hay descripción disponible.'}
        </Text>

        {/* Precio */}
        <Text style={styles.price}>
          ${formatPrice(product.precio)}
        </Text>

        {/* Botones de acción */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.detailsButton} 
            onPress={handleProductPress}
          >
            <Ionicons name="information-circle-outline" size={16} color="#2196F3" />
            <Text style={styles.detailsButtonText}>Detalles</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.addToCartButton,
              !isAvailable && styles.disabledButton
            ]}
            onPress={handleAddToCart}
            disabled={!isAvailable}
          >
            <Ionicons 
              name="cart-outline" 
              size={16} 
              color={isAvailable ? "white" : "#ccc"} 
            />
            <Text style={[
              styles.addToCartButtonText,
              !isAvailable && styles.disabledButtonText
            ]}>
              {isAvailable ? 'Comprar' : 'Agotado'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 15,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  outOfStockText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
    lineHeight: 22,
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#1976d2',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
    minHeight: 60, // Mantener altura consistente
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 15,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  detailsButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
  },
  disabledButtonText: {
    color: '#ccc',
  },
});

export default ProductCard;