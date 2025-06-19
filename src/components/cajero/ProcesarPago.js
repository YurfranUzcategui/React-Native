// src/components/cajero/ProcesarPago.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import QRCode from 'react-native-qrcode-svg';
import { cajeroService } from '../../api/cajero';

const { width } = Dimensions.get('window');

const ProcesarPago = ({ onPagoProcessed, onShowMessage }) => {
  const [codigo, setCodigo] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [loading, setLoading] = useState(false);
  const [pedidoEncontrado, setPedidoEncontrado] = useState(null);
  const [dialogQR, setDialogQR] = useState({ open: false, pedido: null });
  const [dialogPago, setDialogPago] = useState({ open: false, pedido: null });
  const codigoInputRef = useRef(null);

  // Buscar pedido por código QR o número de atención
  const buscarPedido = async () => {
    if (!codigo.trim()) {
      onShowMessage('Ingrese un código QR o número de pedido', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await cajeroService.procesarPago({
        codigo: codigo,
        metodo_pago: metodoPago,
        solo_validar: true // Flag para solo validar sin procesar
      });

      if (response.data.valido) {
        setPedidoEncontrado(response.data.pedido);
        onShowMessage('Pedido encontrado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error al procesar código:', error);
      onShowMessage(error.response?.data?.error || 'Error al buscar pedido', 'error');
      setPedidoEncontrado(null);
    } finally {
      setLoading(false);
    }
  };

  // Procesar el pago
  const procesarPago = async () => {
    if (!pedidoEncontrado) {
      onShowMessage('No hay pedido seleccionado', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await cajeroService.procesarPago({
        codigo: codigo,
        metodo_pago: metodoPago
      });

      if (response.data.success) {
        onShowMessage(`Pago procesado exitosamente para pedido #${response.data.pedido.numero_atencion}`, 'success');
        
        // Limpiar formulario
        setCodigo('');
        setPedidoEncontrado(null);
        setMetodoPago('EFECTIVO');
        
        // Mostrar dialog de confirmación
        setDialogPago({ open: true, pedido: response.data.pedido });
        
        // Actualizar lista de pedidos
        if (onPagoProcessed) onPagoProcessed();
      }
    } catch (error) {
      console.error('Error al procesar pago:', error);
      onShowMessage(error.response?.data?.error || 'Error al procesar pago', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generar QR para un pedido
  const generarQR = async (pedidoId) => {
    try {
      setLoading(true);
      const response = await cajeroService.generarQR(pedidoId);

      setDialogQR({ 
        open: true, 
        pedido: { 
          ...pedidoEncontrado, 
          codigo_qr: response.data.codigo_qr 
        } 
      });
    } catch (error) {
      console.error('Error al generar QR:', error);
      onShowMessage('Error al generar código QR', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Enviar a preparación
  const enviarAPreparacion = async (pedidoId) => {
    try {
      setLoading(true);
      await cajeroService.enviarPreparacion(pedidoId);

      onShowMessage('Pedido enviado a preparación', 'success');
      if (onPagoProcessed) onPagoProcessed();
      setDialogPago({ open: false, pedido: null });
    } catch (error) {
      console.error('Error al enviar a preparación:', error);
      onShowMessage('Error al enviar a preparación', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return '#FF9800';
      case 'PAGADO': return '#4CAF50';
      case 'EN_PREPARACION': return '#2196F3';
      case 'LISTO': return '#9C27B0';
      default: return '#666';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Formulario principal */}
      <View style={styles.formCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="qr-code" size={24} color="#2196F3" />
          <Text style={styles.cardTitle}>Procesar Pago por QR</Text>
        </View>

        <View style={styles.formContent}>
          <TextInput
            ref={codigoInputRef}
            style={styles.textInput}
            placeholder="Código QR o Número de Pedido"
            value={codigo}
            onChangeText={setCodigo}
            placeholderTextColor="#999"
            onSubmitEditing={buscarPedido}
            returnKeyType="search"
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Método de Pago</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={metodoPago}
                onValueChange={setMetodoPago}
                style={styles.picker}
              >
                <Picker.Item label="Efectivo" value="EFECTIVO" />
                <Picker.Item label="Código QR" value="QR" />
                <Picker.Item label="Tarjeta" value="TARJETA" />
              </Picker>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.outlineButton, (!codigo.trim() || loading) && styles.disabledButton]}
              onPress={buscarPedido}
              disabled={loading || !codigo.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <>
                  <Ionicons name="search" size={16} color="#2196F3" />
                  <Text style={styles.outlineButtonText}>Buscar Pedido</Text>
                </>
              )}
            </TouchableOpacity>

            {pedidoEncontrado && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, loading && styles.disabledButton]}
                onPress={procesarPago}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="card" size={16} color="white" />
                    <Text style={styles.primaryButtonText}>Procesar Pago</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Información del pedido encontrado */}
      {pedidoEncontrado && (
        <View style={styles.pedidoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={[styles.cardTitle, { color: '#4CAF50' }]}>Pedido Encontrado</Text>
          </View>

          <View style={styles.pedidoContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Número de Atención:</Text>
              <View style={[styles.chip, styles.primaryChip]}>
                <Text style={styles.chipText}>{pedidoEncontrado.numero_atencion}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cliente:</Text>
              <Text style={styles.infoValue}>{pedidoEncontrado.cliente_nombre}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total a Pagar:</Text>
              <Text style={styles.totalAmount}>{formatPrice(pedidoEncontrado.total)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado Actual:</Text>
              <View style={[styles.chip, { backgroundColor: getStatusColor(pedidoEncontrado.estado) }]}>
                <Text style={styles.chipText}>{pedidoEncontrado.estado}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.outlineButton, { marginTop: 15 }]}
              onPress={() => generarQR(pedidoEncontrado.id)}
            >
              <MaterialIcons name="qr-code" size={16} color="#2196F3" />
              <Text style={styles.outlineButtonText}>Generar Código QR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal para mostrar QR generado */}
      <Modal
        visible={dialogQR.open}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDialogQR({ open: false, pedido: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Código QR Generado</Text>
              <TouchableOpacity onPress={() => setDialogQR({ open: false, pedido: null })}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContent}>
              {dialogQR.pedido && (
                <>
                  <Text style={styles.pedidoNumber}>
                    Pedido #{dialogQR.pedido.numero_atencion}
                  </Text>

                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={dialogQR.pedido.codigo_qr}
                      size={200}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>

                  <Text style={styles.clienteName}>
                    Cliente: {dialogQR.pedido.cliente_nombre}
                  </Text>
                  <Text style={styles.qrTotalAmount}>
                    {formatPrice(dialogQR.pedido.total)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación de pago */}
      <Modal
        visible={dialogPago.open}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDialogPago({ open: false, pedido: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.successHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={[styles.modalTitle, { color: '#4CAF50' }]}>
                  Pago Procesado Exitosamente
                </Text>
              </View>
            </View>

            <View style={styles.confirmationContent}>
              {dialogPago.pedido && (
                <>
                  <Text style={styles.confirmationPedido}>
                    Pedido #{dialogPago.pedido.numero_atencion}
                  </Text>

                  <Text style={styles.confirmationCliente}>
                    Cliente: {dialogPago.pedido.cliente_nombre}
                  </Text>

                  <Text style={styles.confirmationTotal}>
                    {formatPrice(dialogPago.pedido.total)}
                  </Text>

                  <View style={[styles.chip, styles.successChip, { alignSelf: 'center', marginTop: 10 }]}>
                    <Text style={styles.chipText}>Método: {dialogPago.pedido.metodo_pago}</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.outlineButton]}
                onPress={() => setDialogPago({ open: false, pedido: null })}
              >
                <Text style={styles.outlineButtonText}>Cerrar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => enviarAPreparacion(dialogPago.pedido?.id)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="white" />
                    <Text style={styles.primaryButtonText}>Enviar a Preparación</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formCard: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pedidoCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  formContent: {
    padding: 20,
    paddingTop: 0,
  },
  pedidoContent: {
    padding: 20,
    paddingTop: 0,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 15,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 5,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  outlineButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 14,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  primaryChip: {
    backgroundColor: '#2196F3',
  },
  successChip: {
    backgroundColor: '#4CAF50',
  },
  chipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 20,
    width: width * 0.9,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  qrContent: {
    alignItems: 'center',
    padding: 20,
  },
  pedidoNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 15,
  },
  clienteName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  qrTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  confirmationContent: {
    alignItems: 'center',
    padding: 20,
  },
  confirmationPedido: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  confirmationCliente: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  confirmationTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
});

export default ProcesarPago;