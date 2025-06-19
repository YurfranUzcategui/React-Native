// src/components/cliente/CategoryList.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CategoryList = ({ categories, selectedCategoryId, onSelectCategory }) => {
  if (!categories || categories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Categorías</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay categorías disponibles</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Categorías</Text>
      </View>
      
      <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
        {/* Opción "Todas las categorías" */}
        <TouchableOpacity
          style={[
            styles.categoryItem,
            !selectedCategoryId && styles.selectedCategory
          ]}
          onPress={() => onSelectCategory(null)}
        >
          <Ionicons 
            name="folder-outline" 
            size={20} 
            color={!selectedCategoryId ? "#fff" : "#2196F3"} 
            style={styles.categoryIcon}
          />
          <Text style={[
            styles.categoryText,
            !selectedCategoryId && styles.selectedCategoryText
          ]}>
            Todas las categorías
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Lista de categorías */}
        {categories.map((category, index) => (
          <React.Fragment key={category.id}>
            <TouchableOpacity
              style={[
                styles.categoryItem,
                selectedCategoryId === category.id && styles.selectedCategory
              ]}
              onPress={() => onSelectCategory(category.id)}
            >
              <Ionicons 
                name="folder-outline" 
                size={20} 
                color={selectedCategoryId === category.id ? "#fff" : "#2196F3"} 
                style={styles.categoryIcon}
              />
              <View style={styles.categoryTextContainer}>
                <Text style={[
                  styles.categoryText,
                  selectedCategoryId === category.id && styles.selectedCategoryText
                ]}>
                  {category.nombre}
                </Text>
                {category.descripcion && (
                  <Text style={[
                    styles.categoryDescription,
                    selectedCategoryId === category.id && styles.selectedCategoryDescription
                  ]}>
                    {category.descripcion}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            
            {index < categories.length - 1 && (
              <View style={styles.divider} />
            )}
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  categoryList: {
    maxHeight: 300, // Limitar altura para scroll
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  selectedCategory: {
    backgroundColor: '#2196F3',
  },
  categoryIcon: {
    marginRight: 12,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedCategoryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  selectedCategoryDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default CategoryList;