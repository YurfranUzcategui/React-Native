// src/screens/cliente/ProductCatalog.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoriasService } from '../../api/categorias';
import { productosService } from '../../api/productos';
import CategoryList from '../../components/cliente/CategoryList';
import ProductList from '../../components/cliente/ProductList';
import { useCart } from '../../contexts/CartContext';


const { width } = Dimensions.get('window');

const ProductCatalog = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCategories, setShowCategories] = useState(false);

  // Cargar categorías
  const fetchCategories = async () => {
    try {
      const response = await categoriasService.getAll();
      setCategories(response.data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
      setError('Error al cargar las categorías');
    }
  };

  // Cargar productos con filtros
  const fetchProducts = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = {
        limit: 12,
        offset: (page - 1) * 12,
        search: searchQuery || undefined,
        categoria_id: selectedCategoryId || undefined,
      };

      const response = await productosService.getAll(params);
      setProducts(response.data);
      
      // Calcular el total de páginas (idealmente la API debería retornar el total)
      setTotalPages(Math.ceil(response.data.length / 12) || 1);
      
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError('Error al cargar los productos');
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchCategories(), fetchProducts()]);
    };
    
    loadInitialData();
  }, []);

  // Recargar productos cuando cambien los filtros
  useEffect(() => {
    if (!loading) { // Evitar doble carga inicial
      fetchProducts();
    }
  }, [selectedCategoryId, searchQuery, page]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setPage(1); // Resetear la página al cambiar de categoría
    setShowCategories(false); // Ocultar categorías en móvil
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    setPage(1); // Resetear la página al buscar
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const { addToCart } = useCart();

  const handleAddToCart = async (product) => {
    const precio = Number(product.precio);

    if (isNaN(precio)) {
      Alert.alert('Error', 'Este producto no tiene un precio válido.');
      return;
    }

    const result = await addToCart(product, 1);
    
    if (result.success) {
      Alert.alert(
        'Producto agregado', 
        `${product.nombre} ha sido agregado al carrito`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Error', 
        result.error || 'No se pudo agregar el producto al carrito',
        [{ text: 'OK' }]
      );
    }
  };

  const onRefresh = () => {
    setPage(1);
    fetchProducts(true);
  };

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  // Determinar si mostrar en layout horizontal (tablet) o vertical (móvil)
  const isTablet = width > 768;

  if (isTablet) {
    // Layout para tablet/pantalla grande - categorías al lado
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Catálogo de Productos</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar productos..."
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
          </View>
        </View>

        <View style={styles.tabletContent}>
          <View style={styles.sidebar}>
            <CategoryList
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleCategorySelect}
            />
          </View>
          
          <View style={styles.mainContent}>
            <ProductList
              products={products}
              loading={loading}
              error={error}
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onProductPress={handleProductPress}
              onAddToCart={handleAddToCart}
              refreshControl={refreshControl}
              numColumns="auto"
            />
          </View>
        </View>
      </View>
    );
  }

  // Layout para móvil - categorías colapsables
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Catálogo de Productos</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
        </View>
        
        {/* Botón para mostrar/ocultar categorías en móvil */}
        <View style={styles.categoryToggle}>
          <Text style={styles.categoryToggleButton} onPress={() => setShowCategories(!showCategories)}>
            <Ionicons name={showCategories ? "chevron-up" : "chevron-down"} size={16} color="#2196F3" />
            {showCategories ? " Ocultar Categorías" : " Ver Categorías"}
          </Text>
        </View>
      </View>

      <View style={styles.mobileContent}>
        {/* Categorías colapsables */}
        {showCategories && (
          <View style={styles.categoriesSection}>
            <CategoryList
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleCategorySelect}
            />
          </View>
        )}

        {/* Lista de productos con scroll propio */}
        <ProductList
          products={products}
          loading={loading}
          error={error}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onProductPress={handleProductPress}
          onAddToCart={handleAddToCart}
          refreshControl={refreshControl}
          numColumns="auto"
          
        />
      </View>
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 15,
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
  categoryToggle: {
    alignItems: 'center',
  },
  categoryToggleButton: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  
  // Layout para tablet
  tabletContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 300,
    padding: 15,
  },
  mainContent: {
    flex: 1,
    padding: 15,
  },
  
  // Layout para móvil
  mobileContent: {
    flex: 1,
  },
  categoriesSection: {
    padding: 15,
  },
  productsSection: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
});

export default ProductCatalog;