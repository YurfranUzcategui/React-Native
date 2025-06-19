// src/screens/admin/ClienteManagement.js
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { clientesService } from '../../api/clientes';

const ClienteManagement = ({ navigation }) => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Estado para el modal de cambio de rol
  const [roleModal, setRoleModal] = useState({
    visible: false,
    cliente: null,
    selectedRole: 1,
    loading: false,
  });

  // Definir roles disponibles
  const ROLES = [
    { id: 1, nombre: 'Cliente', color: 'clientChip', textColor: 'clientText' },
    { id: 2, nombre: 'Administrador', color: 'adminChip', textColor: 'adminText' },
    { id: 3, nombre: 'Cajero', color: 'cajeroChip', textColor: 'cajeroText' },
    { id: 4, nombre: 'Empleado', color: 'empleadoChip', textColor: 'empleadoText' },
  ];

  // Cargar clientes
  const fetchClientes = async () => {
    try {
      const response = await clientesService.getAll();
      setClientes(response.data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setError('Error al cargar los clientes');
    }
  };

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    await fetchClientes();

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

  // Mostrar mensajes de éxito temporalmente
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Obtener información del rol
  const getRoleInfo = (roleId) => {
    return ROLES.find(role => role.id === roleId) || ROLES[0];
  };

  // Obtener descripción del rol
  const getRoleDescription = (roleId) => {
    switch (roleId) {
      case 1:
        return 'Los clientes solo pueden ver y comprar productos';
      case 2:
        return 'Los administradores tienen acceso completo al sistema';
      case 3:
        return 'Los cajeros pueden gestionar ventas y cobros';
      case 4:
        return 'Los empleados pueden gestionar inventario y pedidos';
      default:
        return 'Sin descripción disponible';
    }
  };

  // Abrir modal para cambiar rol
  const handleOpenRoleModal = (cliente) => {
    setRoleModal({
      visible: true,
      cliente: cliente,
      selectedRole: cliente.rol_id || 1,
      loading: false,
    });
  };

  // Cerrar modal de rol
  const handleCloseRoleModal = () => {
    setRoleModal({
      visible: false,
      cliente: null,
      selectedRole: 1,
      loading: false,
    });
  };

  // Cambiar rol del cliente
  const handleChangeRole = async () => {
    const { cliente, selectedRole } = roleModal;

    if (cliente.rol_id === selectedRole) {
      handleCloseRoleModal();
      return;
    }

    setRoleModal(prev => ({ ...prev, loading: true }));

    try {
      // Enviar como objeto para coincidir con la versión web
      await clientesService.updateRole(cliente.id, { rol_id: parseInt(selectedRole) });
      await fetchClientes();
      handleCloseRoleModal();

      const roleInfo = getRoleInfo(selectedRole);
      setSuccessMessage(`Rol cambiado a ${roleInfo.nombre} exitosamente`);
      
    } catch (err) {
      console.error('Error al cambiar rol:', err);
      const errorMessage = err.response?.data?.error || 'No se pudo cambiar el rol del cliente';
      Alert.alert('Error', errorMessage);
    } finally {
      setRoleModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Cambiar estado activo del cliente
  const handleToggleActive = async (cliente) => {
    try {
      const newStatus = !cliente.activo;
      const statusText = newStatus ? 'activar' : 'desactivar';
      
      Alert.alert(
        'Cambiar Estado',
        `¿Desea ${statusText} a ${cliente.nombre}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              try {
                await clientesService.updateStatus(cliente.id, { activo: newStatus });
                await fetchClientes();
                setSuccessMessage(`Cliente ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
              } catch (err) {
                console.error('Error al cambiar estado:', err);
                Alert.alert('Error', 'Error al cambiar el estado del cliente');
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      Alert.alert('Error', 'Error al cambiar el estado del cliente');
    }
  };

  // Eliminar cliente
  const handleDeleteCliente = async (cliente) => {
    Alert.alert(
      'Confirmar Eliminación',
      `¿Está seguro de que desea eliminar a ${cliente.nombre}?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await clientesService.delete(cliente.id);
              await fetchClientes();
              setSuccessMessage('Cliente eliminado exitosamente');
            } catch (err) {
              console.error('Error al eliminar cliente:', err);
              Alert.alert(
                'Error', 
                'No se pudo eliminar el cliente. Es posible que tenga pedidos asociados.'
              );
            }
          },
        },
      ]
    );
  };

  // Componente de item de cliente
  const ClienteItem = ({ item }) => {
    const roleInfo = getRoleInfo(item.rol_id);
    
    return (
      <View style={styles.clienteCard}>
        <View style={styles.clienteHeader}>
          <View style={styles.clienteInfo}>
            <Text style={styles.clienteName}>{item.nombre}</Text>
            <Text style={styles.clienteEmail}>{item.email}</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleOpenRoleModal(item)}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#2196F3" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteCliente(item)}
            >
              <Ionicons name="trash-outline" size={20} color="#f44336" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.clienteDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.telefono || 'No especificado'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.direccion || 'No especificada'}
            </Text>
          </View>
        </View>

        <View style={styles.clienteStatus}>
          <View style={[styles.statusChip, styles[roleInfo.color]]}>
            <Text style={[styles.statusText, styles[roleInfo.textColor]]}>
              {roleInfo.nombre}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.statusChip,
              item.activo ? styles.activeChip : styles.inactiveChip
            ]}
            onPress={() => handleToggleActive(item)}
          >
            <Text style={[
              styles.statusText,
              item.activo ? styles.activeText : styles.inactiveText
            ]}>
              {item.activo ? 'Activo' : 'Inactivo'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando clientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Clientes</Text>
      </View>

      {/* Mensaje de éxito */}
      {successMessage && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      {/* Mensaje de error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Lista de clientes */}
      <FlatList
        data={clientes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ClienteItem item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay clientes disponibles</Text>
          </View>
        }
      />

      {/* Modal para cambiar rol */}
      <Modal
        visible={roleModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseRoleModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Rol</Text>
              <TouchableOpacity 
                onPress={handleCloseRoleModal}
                disabled={roleModal.loading}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {roleModal.cliente && (
                <>
                  <View style={styles.clienteInfoModal}>
                    <Text style={styles.modalLabel}>Cliente:</Text>
                    <Text style={styles.modalValue}>{roleModal.cliente.nombre}</Text>
                    <Text style={styles.modalEmail}>{roleModal.cliente.email}</Text>
                  </View>

                  <View style={styles.rolePickerContainer}>
                    <Text style={styles.modalLabel}>Rol:</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={roleModal.selectedRole}
                        onValueChange={(itemValue) => 
                          setRoleModal(prev => ({ ...prev, selectedRole: itemValue }))
                        }
                        enabled={!roleModal.loading}
                        style={styles.picker}
                      >
                        {ROLES.map((role) => (
                          <Picker.Item 
                            key={role.id} 
                            label={role.nombre} 
                            value={role.id} 
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.roleInfo}>
                    <Ionicons 
                      name="information-circle-outline" 
                      size={20} 
                      color="#666" 
                    />
                    <Text style={styles.roleInfoText}>
                      {getRoleDescription(roleModal.selectedRole)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleCloseRoleModal}
                disabled={roleModal.loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.saveButton, 
                  roleModal.loading && styles.buttonDisabled
                ]} 
                onPress={handleChangeRole}
                disabled={roleModal.loading}
              >
                {roleModal.loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
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
  successContainer: {
    backgroundColor: '#4CAF50',
    padding: 15,
    margin: 15,
    marginBottom: 0,
    borderRadius: 8,
  },
  successText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    margin: 15,
    marginBottom: 0,
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
  clienteCard: {
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
  clienteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  clienteInfo: {
    flex: 1,
  },
  clienteName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  clienteEmail: {
    fontSize: 14,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  deleteButton: {
    marginLeft: 10,
  },
  clienteDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  clienteStatus: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Estilos para roles
  adminChip: {
    backgroundColor: '#e3f2fd',
  },
  adminText: {
    color: '#1976d2',
  },
  clientChip: {
    backgroundColor: '#f5f5f5',
  },
  clientText: {
    color: '#666',
  },
  cajeroChip: {
    backgroundColor: '#f3e5f5',
  },
  cajeroText: {
    color: '#7b1fa2',
  },
  empleadoChip: {
    backgroundColor: '#e0f2f1',
  },
  empleadoText: {
    color: '#00796b',
  },
  // Estilos para estado activo/inactivo
  activeChip: {
    backgroundColor: '#e8f5e8',
  },
  activeText: {
    color: '#2e7d32',
  },
  inactiveChip: {
    backgroundColor: '#ffebee',
  },
  inactiveText: {
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
    textAlign: 'center',
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
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  modalBody: {
    padding: 20,
  },
  clienteInfoModal: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  modalValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  rolePickerContainer: {
    marginBottom: 20,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginTop: 8,
  },
  picker: {
    height: 50,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
  },
  roleInfoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default ClienteManagement;