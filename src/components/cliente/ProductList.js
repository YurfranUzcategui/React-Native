// src/components/cliente/ProductList.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import ProductCard from './ProductCard';

const { width } = Dimensions.get('window');

const ProductList = ({ 
  products, 
  loading, 
  error,
  page,
  totalPages,
  onPageChange,
  onProductPress,
  onAddToCart,
  refreshControl,
  numColumns = 1,
}) => {
  // Calcular el número de columnas basado en el ancho de pantalla
  const getNumColumns = () => {
    if (numColumns !== 'auto') return numColumns;
    
    if (width > 768) return 3;
    if (width > 480) return 2;
    return 1;
  };

  const columns = getNumColumns();

  // Componente de paginación
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    const renderPageButton = (pageNum, isCurrentPage = false) => (
      <TouchableOpacity
        key={pageNum}
        style={[
          styles.pageButton,
          isCurrentPage && styles.currentPageButton
        ]}
        onPress={() => onPageChange(pageNum)}
        disabled={isCurrentPage}
      >
        <Text style={[
          styles.pageButtonText,
          isCurrentPage && styles.currentPageButtonText
        ]}>
          {pageNum}
        </Text>
      </TouchableOpacity>
    );

    const renderPaginationButtons = () => {
      const buttons = [];
      const maxVisiblePages = 5;
      
      // Calcular rango de páginas a mostrar
      let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // Ajustar si estamos cerca del final
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      // Botón "Anterior"
      if (page > 1) {
        buttons.push(
          <TouchableOpacity
            key="prev"
            style={styles.navButton}
            onPress={() => onPageChange(page - 1)}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
        );
      }

      // Primera página si no está en el rango visible
      if (startPage > 1) {
        buttons.push(renderPageButton(1));
        if (startPage > 2) {
          buttons.push(
            <Text key="ellipsis1" style={styles.ellipsis}>...</Text>
          );
        }
      }

      // Páginas visibles
      for (let i = startPage; i <= endPage; i++) {
        buttons.push(renderPageButton(i, i === page));
      }

      // Última página si no está en el rango visible
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          buttons.push(
            <Text key="ellipsis2" style={styles.ellipsis}>...</Text>
          );
        }
        buttons.push(renderPageButton(totalPages));
      }

      // Botón "Siguiente"
      if (page < totalPages) {
        buttons.push(
          <TouchableOpacity
            key="next"
            style={styles.navButton}
            onPress={() => onPageChange(page + 1)}
          >
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        );
      }

      return buttons;
    };

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationControls}>
          {renderPaginationButtons()}
        </View>
        <Text style={styles.paginationInfo}>
          Página {page} de {totalPages}
        </Text>
      </View>
    );
  };

  // Renderizar item de producto
  const renderProductItem = ({ item, index }) => {
    const isLastInRow = columns > 1 && (index + 1) % columns === 0;
    const isOdd = columns > 1 && (index + 1) % columns === 1;
    
    return (
      <View style={[
        styles.productItem,
        columns > 1 && styles.gridItem,
        columns > 1 && { width: (width - 30 - (columns - 1) * 10) / columns },
        columns > 1 && !isLastInRow && { marginRight: 10 },
        columns > 1 && isOdd && { marginLeft: 0 },
      ]}>
        <ProductCard
          product={item}
          onProductPress={onProductPress}
          onAddToCart={onAddToCart}
        />
      </View>
    );
  };

  // Estado de carga
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

  // Estado de error
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Lista vacía
  if (!products || products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No se encontraron productos</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={columns}
        key={`${columns}-${width}`} // Force re-render cuando cambie el número de columnas
        contentContainerStyle={styles.listContent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={columns === 1 ? () => <View style={{ height: 0 }} /> : null}
      />
      
      <PaginationControls />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 15,
  },
  productItem: {
    marginBottom: 15,
  },
  gridItem: {
    // Estilos específicos para vista en grid
  },
  
  // Estilos de paginación
  paginationContainer: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  pageButton: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  currentPageButton: {
    backgroundColor: '#2196F3',
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  currentPageButtonText: {
    color: 'white',
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  ellipsis: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 5,
    lineHeight: 40,
  },
  paginationInfo: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
});

export default ProductList;