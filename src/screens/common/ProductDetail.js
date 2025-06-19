// src/screens/common/ProductDetail.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productosService } from '../../api/productos';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

const { width } = Dimensions.get('window');

const ProductDetail = ({ navigation, route }) => {
  const { product: initialProduct, productId } = route.params || {};
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  // Determinar si el usuario es admin
  const isAdmin = user?.rol_id === 2;

  // Cargar detalles del producto si no se pasó como parámetro
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (product && !productId) return; // Ya tenemos los datos
      
      const id = productId || product?.id;
      if (!id) {
        setError('ID de producto no válido');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await productosService.getById(id);
        setProduct(response.data);
      } catch (err) {
        console.error('Error al cargar detalles del producto:', err);
        setError('Error al cargar los detalles del producto');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [productId, product]);

  // Manejar navegación de vuelta
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Manejar edición (solo para admin)
  const handleEdit = () => {
    navigation.navigate('AdminStack', {
      screen: 'ProductForm',
      params: { product }
    });
  };

  // Manejar cambio de cantidad
  const handleQuantityChange = (change) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (product.stock || 0)) {
      setQuantity(newQuantity);
    }
  };

  // Manejar agregar al carrito
  const handleAddToCart = async () => {
    if (!product.disponible || product.stock <= 0) {
      Alert.alert('Producto no disponible', 'Este producto no está disponible en este momento.');
      return;
    }

    if (quantity > product.stock) {
      Alert.alert('Stock insuficiente', `Solo hay ${product.stock} unidades disponibles.`);
      return;
    }
    
    setAddingToCart(true);
    
    try {
      const result = await addToCart(product, quantity);
      
      if (result.success) {
        Alert.alert(
          'Agregado al carrito', 
          `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'} de ${product.nombre} ${quantity === 1 ? 'ha' : 'han'} sido ${quantity === 1 ? 'agregada' : 'agregadas'} al carrito.`,
          [
            { text: 'Seguir comprando', onPress: handleGoBack },
            { 
              text: 'Ir al carrito', 
              onPress: () => navigation.navigate('Cart', { screen: 'CartMain' })
            }
          ]
        );
        setQuantity(1); // Reset quantity
      } else {
        Alert.alert(
          'Error', 
          result.error || 'No se pudo agregar el producto al carrito'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al agregar el producto al carrito');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando detalles del producto...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
          <Text style={styles.errorText}>{error || 'Producto no encontrado'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={20} color="#2196F3" />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Imagen por defecto si no hay una disponible
  const defaultImageUrl = 'https://via.placeholder.com/600x400?text=Producto';
  const isAvailable = product.disponible && product.stock > 0;

  // Formatear precio
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price || 0);
  };

  return (
    <View style={styles.container}>
      {/* Header con botón de volver */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
          <Text style={styles.headerBackText}>Volver al catálogo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.productContainer}>
          {/* Imagen del producto */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: product.imagen_url || product.imagenUrl || defaultImageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
            
            {/* Badge de agotado */}
            {!isAvailable && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Agotado</Text>
              </View>
            )}
          </View>

          {/* Detalles del producto */}
          <View style={styles.detailsContainer}>
            {/* Nombre */}
            <Text style={styles.productName}>{product.nombre}</Text>

            {/* Chips de información */}
            <View style={styles.chipsContainer}>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>
                  {product.categoria_nombre || product.categoriaNombre || 'Sin categoría'}
                </Text>
              </View>
              {!isAvailable && (
                <View style={styles.unavailableChip}>
                  <Text style={styles.unavailableChipText}>Agotado</Text>
                </View>
              )}
              {product.stock > 0 && product.stock <= 5 && (
                <View style={styles.lowStockChip}>
                  <Text style={styles.lowStockChipText}>
                    Solo quedan {product.stock}
                  </Text>
                </View>
              )}
            </View>

            {/* Precio */}
            <Text style={styles.price}>{formatPrice(product.precio)}</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Descripción */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Descripción:</Text>
              <Text style={styles.description}>
                {product.descripcion || 'Sin descripción disponible.'}
              </Text>
            </View>

            {/* Información adicional */}
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Código:</Text>
                <Text style={styles.infoValue}>
                  {product.codigo_barras || product.codigoBarras || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Unidad de medida:</Text>
                <Text style={styles.infoValue}>
                  {product.unidad_medida || product.unidadMedida || 'Unidad'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Stock disponible:</Text>
                <Text style={[
                  styles.infoValue,
                  product.stock <= 5 && styles.lowStockText
                ]}>
                  {product.stock > 0 ? `${product.stock} unidades` : 'Agotado'}
                </Text>
              </View>

              {/* Información adicional para admin */}
              {isAdmin && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Stock mínimo:</Text>
                    <Text style={styles.infoValue}>
                      {product.stock_minimo || product.stockMinimo || 'N/A'}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Precio de compra:</Text>
                    <Text style={styles.infoValue}>
                      {formatPrice(product.precio_compra || product.precioCompra)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Selector de cantidad y botones de acción */}
            {!isAdmin && isAvailable && (
              <View style={styles.quantityContainer}>
                <Text style={styles.quantityLabel}>Cantidad:</Text>
                <View style={styles.quantitySelector}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <Ionicons 
                      name="remove" 
                      size={20} 
                      color={quantity <= 1 ? '#ccc' : '#2196F3'} 
                    />
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{quantity}</Text>
                  
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                  >
                    <Ionicons 
                      name="add" 
                      size={20} 
                      color={quantity >= product.stock ? '#ccc' : '#2196F3'} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Botones de acción */}
            <View style={styles.actionContainer}>
              {isAdmin ? (
                <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                  <Ionicons name="pencil" size={20} color="white" />
                  <Text style={styles.editButtonText}>Editar Producto</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.addToCartButton,
                    (!isAvailable || addingToCart) && styles.disabledButton
                  ]}
                  onPress={handleAddToCart}
                  disabled={!isAvailable || addingToCart}
                >
                  {addingToCart ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons 
                        name="cart" 
                        size={20} 
                        color={isAvailable ? "white" : "#ccc"} 
                      />
                      <Text style={[
                        styles.addToCartButtonText,
                        !isAvailable && styles.disabledButtonText
                      ]}>
                        {isAvailable ? 'Agregar al Carrito' : 'No Disponible'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorContent: {
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    textAlign: 'center',
    marginVertical: 15,
  },
  header: {
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackText: {
    fontSize: 16,
    color: '#2196F3',
    marginLeft: 8,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  productContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: width * 0.75,
    backgroundColor: '#fafafa',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  outOfStockText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailsContainer: {
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    lineHeight: 30,
  },
  chipsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 5,
  },
  categoryChipText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
  unavailableChip: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 5,
  },
  unavailableChipText: {
    color: '#c62828',
    fontSize: 14,
    fontWeight: '600',
  },
  lowStockChip: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 5,
  },
  lowStockChipText: {
    color: '#f57c00',
    fontSize: 14,
    fontWeight: '600',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  lowStockText: {
    color: '#f57c00',
    fontWeight: 'bold',
  },
  quantityContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 5,
  },
  quantityButton: {
    padding: 10,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 30,
    color: '#333',
  },
  actionContainer: {
    marginTop: 20,
  },
  editButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  addToCartButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
  },
  disabledButtonText: {
    color: '#ccc',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProductDetail;