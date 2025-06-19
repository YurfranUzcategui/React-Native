// src/screens/auth/ForgotPasswordScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../api/auth';

const ForgotPasswordScreen = ({ navigation }) => {
  // Estados principales
  const [paso, setPaso] = useState(1); // 1: teléfono, 2: código + nueva contraseña
  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);
  const [procesoCompleto, setProcesoCompleto] = useState(false);

  // ✅ Countdown timer para el código
  useEffect(() => {
    let interval;
    if (tiempoRestante > 0) {
      interval = setInterval(() => {
        setTiempoRestante(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [tiempoRestante]);

  // ✅ PASO 1: Solicitar código de recuperación
  const handleSolicitarCodigo = async () => {
    setLoading(true);
    setError('');
    
    // Validación básica
    if (!telefono.trim()) {
      setError('Por favor ingrese su número de teléfono');
      setLoading(false);
      return;
    }

    try {
      console.log('📱 Solicitando código para:', telefono);
      const response = await authService.solicitarRecuperacion(telefono);
      
      setSuccess('Código de recuperación enviado a tu teléfono');
      setPaso(2);
      
      // Iniciar countdown de 15 minutos (900 segundos)
      setTiempoRestante(15 * 60);
      
      // Mostrar token en desarrollo
      if (response.debug_token) {
        console.log('🔑 Código de desarrollo:', response.debug_token);
        Alert.alert(
          'Código de Desarrollo',
          `Tu código es: ${response.debug_token}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (err) {
      console.error('❌ Error al solicitar código:', err);
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          'Error al enviar código de recuperación';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ PASO 2: Verificar código y cambiar contraseña
  const handleCambiarPassword = async () => {
    setLoading(true);
    setError('');
    
    // Validaciones
    if (!codigo.trim()) {
      setError('Por favor ingrese el código de verificación');
      setLoading(false);
      return;
    }
    
    if (!nuevaPassword.trim()) {
      setError('Por favor ingrese una nueva contraseña');
      setLoading(false);
      return;
    }
    
    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }
    
    if (nuevaPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }
    
    try {
      console.log('🔄 Cambiando contraseña...');
      await authService.verificarYCambiarPassword(telefono, codigo, nuevaPassword);
      
      setSuccess('¡Contraseña actualizada exitosamente!');
      setProcesoCompleto(true);
      
      // Mostrar mensaje de éxito y redirigir
      setTimeout(() => {
        Alert.alert(
          '¡Éxito!',
          'Tu contraseña ha sido actualizada. Ahora puedes iniciar sesión con tu nueva contraseña.',
          [
            {
              text: 'Ir a Iniciar Sesión',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      }, 1500);
      
    } catch (err) {
      console.error('❌ Error al cambiar contraseña:', err);
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          'Error al cambiar contraseña';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Funciones auxiliares
  const formatTiempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const volverPaso1 = () => {
    setPaso(1);
    setCodigo('');
    setNuevaPassword('');
    setConfirmarPassword('');
    setError('');
    setSuccess('');
    setTiempoRestante(0);
    setProcesoCompleto(false);
  };

  const limpiarError = () => {
    if (error) setError('');
  };

  // ✅ Si el proceso fue completado exitosamente
  if (procesoCompleto) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          </View>
          
          <Text style={styles.successTitle}>¡Contraseña Actualizada!</Text>
          <Text style={styles.successMessage}>
            Tu contraseña ha sido cambiada exitosamente.
          </Text>
          <Text style={styles.successSubMessage}>
            Ahora puedes iniciar sesión con tu nueva contraseña.
          </Text>
          
          <TouchableOpacity 
            style={styles.successButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.successButtonText}>Ir a Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#2196F3" />
              </TouchableOpacity>
              
              <Text style={styles.title}>Recuperar Contraseña</Text>
              <Text style={styles.subtitle}>
                {paso === 1 ? 
                  'Ingresa el número registrado en tu cuenta para recibir un código de verificación' :
                  'Verifica tu identidad y crea una nueva contraseña'
                }
              </Text>
            </View>

            {/* Contenedor del formulario */}
            <View style={styles.formContainer}>
              {/* Error Alert */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#f44336" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Success Alert */}
              {success && (
                <View style={styles.successAlert}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.successText}>{success}</Text>
                </View>
              )}

              {/* Información del código enviado */}
              {paso === 2 && tiempoRestante > 0 && (
                <View style={styles.infoContainer}>
                  <Ionicons name="information-circle" size={20} color="#2196F3" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoText}>
                      <Text style={styles.infoTextBold}>Código enviado a:</Text> {telefono}
                    </Text>
                    <Text style={styles.infoText}>
                      <Text style={styles.infoTextBold}>Expira en:</Text> {formatTiempo(tiempoRestante)}
                    </Text>
                  </View>
                </View>
              )}

              {paso === 1 ? (
                // ✅ PASO 1: Solicitar código
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Número de teléfono *</Text>
                    <TextInput
                      style={styles.input}
                      value={telefono}
                      onChangeText={(value) => {
                        setTelefono(value);
                        limpiarError();
                      }}
                      placeholder="Ej: +56912345678"
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <Text style={styles.helperText}>Formato: +56912345678</Text>
                  </View>

                  <TouchableOpacity 
                    style={[
                      styles.primaryButton, 
                      (loading || !telefono.trim()) && styles.buttonDisabled
                    ]}
                    onPress={handleSolicitarCodigo}
                    disabled={loading || !telefono.trim()}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Enviar Código</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.linkContainer}>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                      <Text style={styles.linkText}>Volver al inicio de sesión</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // ✅ PASO 2: Verificar código y nueva contraseña
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Código de verificación *</Text>
                    <TextInput
                      style={[styles.input, styles.codeInput]}
                      value={codigo}
                      onChangeText={(value) => {
                        // Solo permitir números y máximo 6 dígitos
                        const numericValue = value.replace(/\D/g, '').slice(0, 6);
                        setCodigo(numericValue);
                        limpiarError();
                      }}
                      placeholder="123456"
                      keyboardType="numeric"
                      maxLength={6}
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nueva contraseña *</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={nuevaPassword}
                        onChangeText={(value) => {
                          setNuevaPassword(value);
                          limpiarError();
                        }}
                        placeholder="Ingrese su nueva contraseña"
                        secureTextEntry={!mostrarPassword}
                        autoCapitalize="none"
                        editable={!loading}
                      />
                      <TouchableOpacity 
                        style={styles.eyeButton}
                        onPress={() => setMostrarPassword(!mostrarPassword)}
                        disabled={loading}
                      >
                        <Ionicons 
                          name={mostrarPassword ? 'eye-off' : 'eye'} 
                          size={24} 
                          color="#666" 
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.helperText}>Mínimo 8 caracteres</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirmar contraseña *</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={confirmarPassword}
                        onChangeText={(value) => {
                          setConfirmarPassword(value);
                          limpiarError();
                        }}
                        placeholder="Confirme su nueva contraseña"
                        secureTextEntry={!mostrarConfirmarPassword}
                        autoCapitalize="none"
                        editable={!loading}
                      />
                      <TouchableOpacity 
                        style={styles.eyeButton}
                        onPress={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)}
                        disabled={loading}
                      >
                        <Ionicons 
                          name={mostrarConfirmarPassword ? 'eye-off' : 'eye'} 
                          size={24} 
                          color="#666" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={[styles.secondaryButton, loading && styles.buttonDisabled]}
                      onPress={volverPaso1}
                      disabled={loading}
                    >
                      <Text style={styles.secondaryButtonText}>Volver</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.primaryButton,
                        styles.buttonFlex,
                        (loading || !codigo || !nuevaPassword || !confirmarPassword) && styles.buttonDisabled
                      ]}
                      onPress={handleCambiarPassword}
                      disabled={loading || !codigo || !nuevaPassword || !confirmarPassword}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Cambiar Contraseña</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Enlaces adicionales */}
              <View style={styles.footerLinks}>
                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>¿No tienes una cuenta? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.registerLink}>Regístrate aquí</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    marginBottom: 20,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    marginBottom: 20,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    marginBottom: 20,
  },
  infoTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  infoText: {
    color: '#1976d2',
    fontSize: 14,
    marginBottom: 2,
  },
  infoTextBold: {
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
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
  codeInput: {
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 8,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonFlex: {
    flex: 2,
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  footerLinks: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: '#666',
  },
  registerLink: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  // Success screen styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  successSubMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
  },
  successButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  successButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;