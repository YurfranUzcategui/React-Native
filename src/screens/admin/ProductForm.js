// src/screens/admin/ProductForm.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { productosService } from '../../api/productos';
import { categoriasService } from '../../api/categorias';
import BarcodeScanner from '../../components/common/BarcodeScanner';

const ProductForm = ({ navigation, route }) => {
  // CAMBIO IMPORTANTE: Detectar el modo basado en múltiples fuentes
  const { product, scannedProduct, scannedBarcode, isEdit } = route.params || {};
  
  // Determinar si estamos en modo edición
  const isEditMode = !!(product || scannedProduct || isEdit);
  
  // Obtener el ID del producto si estamos editando
  const productId = product?.id || scannedProduct?.id;
  
  const [showScanner, setShowScanner] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    precio_compra: '',
    codigo_barras: '',
    stock: '0',
    stock_minimo: '5',
    categoria_id: '',
    disponible: true,
    unidad_medida: '',
    imagen_url: '',
  });
  
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Actualizar el título de navegación según el modo
  useEffect(() => {
    navigation.setOptions({
      headerTitle: isEditMode ? 'Editar Producto' : 'Nuevo Producto'
    });
  }, [isEditMode, navigation]);

  // Cargar categorías
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await categoriasService.getAll();
        setCategorias(response.data);
      } catch (err) {
        console.error('Error al cargar categorías:', err);
        setError('Error al cargar las categorías');
      }
    };

    fetchCategorias();
  }, []);

  // Cargar datos del producto
  useEffect(() => {
    const loadProductData = async () => {
      // CASO 1: Producto escaneado que existe (desde ProductManagement)
      if (scannedProduct) {
        console.log('=== EDITANDO PRODUCTO ESCANEADO ===');
        console.log('Datos del producto:', scannedProduct);
        
        setFormData({
          nombre: scannedProduct.nombre || '',
          descripcion: scannedProduct.descripcion || '',
          precio: scannedProduct.precio?.toString() || '',
          precio_compra: scannedProduct.precioCompra?.toString() || scannedProduct.precio_compra?.toString() || '',
          codigo_barras: scannedProduct.codigoBarras || scannedProduct.codigo_barras || '',
          stock: scannedProduct.stock?.toString() || '0',
          stock_minimo: scannedProduct.stockMinimo?.toString() || scannedProduct.stock_minimo?.toString() || '5',
          categoria_id: scannedProduct.categoriaId?.toString() || scannedProduct.categoria_id?.toString() || '',
          disponible: scannedProduct.disponible !== undefined ? scannedProduct.disponible : true,
          unidad_medida: scannedProduct.unidadMedida || scannedProduct.unidad_medida || '',
          imagen_url: scannedProduct.imagenUrl || scannedProduct.imagen_url || '',
        });
        
        return;
      }
      
      // CASO 2: Solo código de barras escaneado (producto nuevo)
      if (scannedBarcode && !isEditMode) {
        console.log('=== NUEVO PRODUCTO CON CÓDIGO ESCANEADO ===');
        console.log('Código:', scannedBarcode);
        
        setFormData(prev => ({
          ...prev,
          codigo_barras: scannedBarcode,
        }));
        
        return;
      }
      
      // CASO 3: Edición normal de producto existente
      if (isEditMode && product) {
        console.log('=== EDITANDO PRODUCTO EXISTENTE ===');
        console.log('Datos del producto:', product);
        
        setFormData({
          nombre: product.nombre || '',
          descripcion: product.descripcion || '',
          precio: product.precio?.toString() || '',
          precio_compra: product.precioCompra?.toString() || product.precio_compra?.toString() || '',
          codigo_barras: product.codigoBarras || product.codigo_barras || '',
          stock: product.stock?.toString() || '0',
          stock_minimo: product.stockMinimo?.toString() || product.stock_minimo?.toString() || '5',
          categoria_id: product.categoriaId?.toString() || product.categoria_id?.toString() || '',
          disponible: product.disponible !== undefined ? product.disponible : true,
          unidad_medida: product.unidadMedida || product.unidad_medida || '',
          imagen_url: product.imagenUrl || product.imagen_url || '',
        });
      }
    };

    loadProductData();
  }, [product, scannedProduct, scannedBarcode, isEditMode]);

  // Manejar cambios en el formulario
  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Limpiar error al modificar el campo
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Validar formulario
  const validateForm = () => {
    const errors = {};
    
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio';
    }
    
    if (!formData.precio.trim()) {
      errors.precio = 'El precio es obligatorio';
    } else if (isNaN(Number(formData.precio)) || Number(formData.precio) <= 0) {
      errors.precio = 'El precio debe ser un número positivo';
    }
    
    if (formData.precio_compra && (isNaN(Number(formData.precio_compra)) || Number(formData.precio_compra) < 0)) {
      errors.precio_compra = 'El precio de compra debe ser un número positivo';
    }
    
    if (isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
      errors.stock = 'El stock debe ser un número no negativo';
    }
    
    if (isNaN(Number(formData.stock_minimo)) || Number(formData.stock_minimo) < 0) {
      errors.stock_minimo = 'El stock mínimo debe ser un número no negativo';
    }
    
    if (!formData.categoria_id) {
      errors.categoria_id = 'La categoría es obligatoria';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Preparar datos para enviar
      const productData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio: Number(formData.precio),
        stock: Number(formData.stock),
        stock_minimo: Number(formData.stock_minimo),
        categoria_id: Number(formData.categoria_id),
        disponible: formData.disponible,
      };
      
      // Añadir campos opcionales solo si tienen valor
      if (formData.codigo_barras) productData.codigo_barras = formData.codigo_barras;
      if (formData.precio_compra) productData.precio_compra = Number(formData.precio_compra);
      if (formData.unidad_medida) productData.unidad_medida = formData.unidad_medida;
      if (formData.imagen_url) productData.imagen_url = formData.imagen_url;
      
      if (isEditMode && productId) {
        // ACTUALIZAR producto existente
        console.log('Actualizando producto con ID:', productId);
        await productosService.update(productId, productData);
        
        Alert.alert(
          'Éxito', 
          'Producto actualizado correctamente',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // CREAR nuevo producto
        console.log('Creando nuevo producto');
        await productosService.create(productData);
        
        Alert.alert(
          'Éxito', 
          'Producto creado correctamente',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
      
    } catch (err) {
      console.error('Error al guardar producto:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Error al guardar el producto';
      setError(errorMessage);
      
      // Si es un error de código duplicado, mostrar mensaje específico
      if (err.response?.status === 409 || errorMessage.includes('duplicado') || errorMessage.includes('existe')) {
        Alert.alert(
          'Error',
          'El código de barras ya está en uso por otro producto. Por favor, verifica el código.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Manejar navegación de vuelta
  const handleGoBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando datos del producto...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditMode ? 'Editar Producto' : 'Crear Producto'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Mensaje de error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {/* Información básica */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Básica</Text>
            
            {/* Nombre */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre del producto *</Text>
              <TextInput
                style={[styles.input, formErrors.nombre && styles.inputError]}
                value={formData.nombre}
                onChangeText={(value) => handleChange('nombre', value)}
                placeholder="Ingrese el nombre del producto"
                editable={!submitting}
              />
              {formErrors.nombre && (
                <Text style={styles.errorText}>{formErrors.nombre}</Text>
              )}
            </View>

            {/* Código de barras */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Código de barras {isEditMode && '(no editable)'}
              </Text>
              <TextInput
                style={[styles.input, isEditMode && styles.inputDisabled]}
                value={formData.codigo_barras}
                onChangeText={(value) => handleChange('codigo_barras', value)}
                placeholder="Código de barras (opcional)"
                editable={!submitting && !isEditMode} // No editable en modo edición
              />
            </View>

            {/* Descripción */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.descripcion}
                onChangeText={(value) => handleChange('descripcion', value)}
                placeholder="Descripción del producto (opcional)"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>

            {/* Categoría */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Categoría *</Text>
              <View style={[styles.pickerContainer, formErrors.categoria_id && styles.inputError]}>
                <Picker
                  selectedValue={formData.categoria_id}
                  onValueChange={(value) => handleChange('categoria_id', value)}
                  enabled={!submitting}
                  style={styles.picker}
                >
                  <Picker.Item label="Seleccionar categoría" value="" />
                  {categorias.map((categoria) => (
                    <Picker.Item 
                      key={categoria.id} 
                      label={categoria.nombre} 
                      value={categoria.id.toString()} 
                    />
                  ))}
                </Picker>
              </View>
              {formErrors.categoria_id && (
                <Text style={styles.errorText}>{formErrors.categoria_id}</Text>
              )}
            </View>

            {/* URL de imagen */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>URL de imagen</Text>
              <TextInput
                style={styles.input}
                value={formData.imagen_url}
                onChangeText={(value) => handleChange('imagen_url', value)}
                placeholder="https://ejemplo.com/imagen.jpg"
                editable={!submitting}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          {/* Precios y stock */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Precios y Stock</Text>
            
            <View style={styles.row}>
              {/* Precio de venta */}
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>Precio de venta *</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceSymbol}>$</Text>
                  <TextInput
                    style={[styles.priceInput, formErrors.precio && styles.inputError]}
                    value={formData.precio}
                    onChangeText={(value) => handleChange('precio', value)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    editable={!submitting}
                  />
                </View>
                {formErrors.precio && (
                  <Text style={styles.errorText}>{formErrors.precio}</Text>
                )}
              </View>

              {/* Precio de compra */}
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.inputLabel}>Precio de compra</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceSymbol}>$</Text>
                  <TextInput
                    style={[styles.priceInput, formErrors.precio_compra && styles.inputError]}
                    value={formData.precio_compra}
                    onChangeText={(value) => handleChange('precio_compra', value)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    editable={!submitting}
                  />
                </View>
                {formErrors.precio_compra && (
                  <Text style={styles.errorText}>{formErrors.precio_compra}</Text>
                )}
              </View>
            </View>

            <View style={styles.row}>
              {/* Stock actual */}
              <View style={[styles.inputGroup, styles.thirdWidth]}>
                <Text style={styles.inputLabel}>Stock actual</Text>
                <TextInput
                  style={[styles.input, formErrors.stock && styles.inputError]}
                  value={formData.stock}
                  onChangeText={(value) => handleChange('stock', value)}
                  placeholder="0"
                  keyboardType="number-pad"
                  editable={!submitting}
                />
                {formErrors.stock && (
                  <Text style={styles.errorText}>{formErrors.stock}</Text>
                )}
              </View>

              {/* Stock mínimo */}
              <View style={[styles.inputGroup, styles.thirdWidth]}>
                <Text style={styles.inputLabel}>Stock mínimo</Text>
                <TextInput
                  style={[styles.input, formErrors.stock_minimo && styles.inputError]}
                  value={formData.stock_minimo}
                  onChangeText={(value) => handleChange('stock_minimo', value)}
                  placeholder="5"
                  keyboardType="number-pad"
                  editable={!submitting}
                />
                {formErrors.stock_minimo && (
                  <Text style={styles.errorText}>{formErrors.stock_minimo}</Text>
                )}
              </View>

              {/* Unidad de medida */}
              <View style={[styles.inputGroup, styles.thirdWidth]}>
                <Text style={styles.inputLabel}>Unidad</Text>
                <TextInput
                  style={styles.input}
                  value={formData.unidad_medida}
                  onChangeText={(value) => handleChange('unidad_medida', value)}
                  placeholder="Ej: Kg, L, Unidad"
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Disponible */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Producto disponible para la venta</Text>
              <Switch
                value={formData.disponible}
                onValueChange={(value) => handleChange('disponible', value)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={formData.disponible ? '#2196F3' : '#f4f3f4'}
                disabled={submitting}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botones de acción */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleGoBack}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.saveButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Actualizar Producto' : 'Crear Producto'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34, // Para balancear el botón de atrás
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
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
  inputDisabled: {
    backgroundColor: '#e0e0e0',
    color: '#666',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  thirdWidth: {
    width: '30%',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  priceSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    paddingLeft: 12,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 15,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default ProductForm;