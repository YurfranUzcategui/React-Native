// src/screens/admin/CategoryManagement.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoriasService } from '../../api/categorias';

const CategoryManagement = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para el formulario de categoría
  const [formModal, setFormModal] = useState({
    visible: false,
    isEdit: false,
    data: {
      id: null,
      nombre: '',
      descripcion: '',
    },
    errors: {},
    loading: false,
  });
  
  // Estado para el modal de eliminación
  const [deleteModal, setDeleteModal] = useState({
    visible: false,
    category: null,
  });

  // Cargar categorías
  const fetchCategories = async () => {
    try {
      const response = await categoriasService.getAll();
      setCategories(response.data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
      setError('Error al cargar las categorías');
    }
  };

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    await fetchCategories();

    if (showRefreshing) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    loadData(true);
  };

  // Validar formulario
  const validateForm = () => {
    const errors = {};
    
    if (!formModal.data.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio';
    } else if (formModal.data.nombre.length < 2) {
      errors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }
    
    setFormModal(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  // Abrir formulario para crear
  const handleCreateCategory = () => {
    setFormModal({
      visible: true,
      isEdit: false,
      data: {
        id: null,
        nombre: '',
        descripcion: '',
      },
      errors: {},
      loading: false,
    });
  };

  // Abrir formulario para editar
  const handleEditCategory = (category) => {
    setFormModal({
      visible: true,
      isEdit: true,
      data: {
        id: category.id,
        nombre: category.nombre,
        descripcion: category.descripcion || '',
      },
      errors: {},
      loading: false,
    });
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setFormModal(prev => ({ ...prev, visible: false }));
  };

  // Manejar cambios en el formulario
  const handleFormChange = (name, value) => {
    setFormModal(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [name]: value,
      },
      errors: {
        ...prev.errors,
        [name]: undefined, // Limpiar error al modificar campo
      },
    }));
  };

  // Enviar formulario
  const handleFormSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setFormModal(prev => ({ ...prev, loading: true }));
    
    try {
      const categoryData = {
        nombre: formModal.data.nombre,
        descripcion: formModal.data.descripcion,
      };

      if (formModal.isEdit) {
        await categoriasService.update(formModal.data.id, categoryData);
      } else {
        await categoriasService.create(categoryData);
      }
      
      await fetchCategories();
      handleCloseForm();
      Alert.alert('Éxito', `Categoría ${formModal.isEdit ? 'actualizada' : 'creada'} correctamente`);
    } catch (err) {
      console.error('Error al guardar categoría:', err);
      Alert.alert('Error', 'Error al guardar la categoría');
    } finally {
      setFormModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Manejar eliminación
  const handleDeletePress = (category) => {
    setDeleteModal({
      visible: true,
      category,
    });
  };

  const confirmDelete = async () => {
    try {
      await categoriasService.delete(deleteModal.category.id);
      await fetchCategories();
      setDeleteModal({ visible: false, category: null });
      Alert.alert('Éxito', 'Categoría eliminada correctamente');
    } catch (err) {
      console.error('Error al eliminar categoría:', err);
      Alert.alert('Error', 'Error al eliminar la categoría. Es posible que tenga productos asociados.');
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ visible: false, category: null });
  };

  // Componente de item de categoría
  const CategoryItem = ({ item }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryContent}>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.nombre}</Text>
          <Text style={styles.categoryDescription}>
            {item.descripcion || 'Sin descripción'}
          </Text>
        </View>
        
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditCategory(item)}
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
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando categorías...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Categorías</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateCategory}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Mensaje de error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Lista de categorías */}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <CategoryItem item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay categorías disponibles</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateCategory}>
              <Text style={styles.emptyButtonText}>Crear primera categoría</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal de formulario */}
      <Modal
        visible={formModal.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseForm}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {formModal.isEdit ? 'Editar Categoría' : 'Nueva Categoría'}
              </Text>
              <TouchableOpacity onPress={handleCloseForm}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Campo nombre */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre *</Text>
                <TextInput
                  style={[styles.input, formModal.errors.nombre && styles.inputError]}
                  value={formModal.data.nombre}
                  onChangeText={(value) => handleFormChange('nombre', value)}
                  placeholder="Nombre de la categoría"
                  editable={!formModal.loading}
                />
                {formModal.errors.nombre && (
                  <Text style={styles.errorText}>{formModal.errors.nombre}</Text>
                )}
              </View>

              {/* Campo descripción */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formModal.data.descripcion}
                  onChangeText={(value) => handleFormChange('descripcion', value)}
                  placeholder="Descripción (opcional)"
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!formModal.loading}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleCloseForm}
                disabled={formModal.loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, formModal.loading && styles.buttonDisabled]} 
                onPress={handleFormSubmit}
                disabled={formModal.loading}
              >
                {formModal.loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {formModal.isEdit ? 'Actualizar' : 'Crear'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        visible={deleteModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="warning" size={32} color="#f44336" />
              <Text style={styles.deleteModalTitle}>Confirmar eliminación</Text>
            </View>
            
            <Text style={styles.deleteModalText}>
              ¿Está seguro de que desea eliminar la categoría "{deleteModal.category?.nombre}"?
            </Text>
            <Text style={styles.deleteModalSubtext}>
              Esta acción no se puede deshacer. No podrá eliminar categorías que tengan productos asociados.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelDelete}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmButton} onPress={confirmDelete}>
                <Text style={styles.deleteConfirmButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
  categoryCard: {
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
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
  },
  categoryActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  deleteButton: {
    // Estilo específico para botón eliminar si es necesario
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
    textAlign: 'center',
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
  // Estilos del modal de formulario
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#f44336',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  saveButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  // Estilos del modal de eliminación
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  deleteModalSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#f44336',
    paddingVertical: 12,
    borderRadius: 8,
  },
  deleteConfirmButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default CategoryManagement;