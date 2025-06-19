// src/components/common/Footer.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const handleLinkPress = (linkType) => {
    // Aquí puedes manejar la navegación a diferentes secciones
    // o abrir URLs externas
    switch (linkType) {
      case 'terms':
        Alert.alert('Términos y Condiciones', 'Aquí irían los términos y condiciones de la aplicación.');
        break;
      case 'privacy':
        Alert.alert('Política de Privacidad', 'Aquí iría la política de privacidad de la aplicación.');
        break;
      case 'contact':
        // Ejemplo de abrir email
        Linking.openURL('mailto:contacto@invvent.com')
          .catch(() => Alert.alert('Error', 'No se pudo abrir la aplicación de email.'));
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.footer}>
      <View style={styles.divider} />
      
      <View style={styles.content}>
        {/* Copyright */}
        <Text style={styles.copyrightText}>
          © {currentYear} InvVent. Todos los derechos reservados.
        </Text>
        
        {/* Links */}
        <View style={styles.linksContainer}>
          <TouchableOpacity 
            style={styles.link}
            onPress={() => handleLinkPress('terms')}
          >
            <Text style={styles.linkText}>Términos y Condiciones</Text>
          </TouchableOpacity>
          
          <View style={styles.linkSeparator} />
          
          <TouchableOpacity 
            style={styles.link}
            onPress={() => handleLinkPress('privacy')}
          >
            <Text style={styles.linkText}>Privacidad</Text>
          </TouchableOpacity>
          
          <View style={styles.linkSeparator} />
          
          <TouchableOpacity 
            style={styles.link}
            onPress={() => handleLinkPress('contact')}
          >
            <Text style={styles.linkText}>Contacto</Text>
          </TouchableOpacity>
        </View>
        
        {/* Información adicional */}
        <Text style={styles.additionalInfo}>
          Sistema de gestión de inventario móvil
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#f5f5f5',
    marginTop: 'auto',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  content: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  link: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  linkSeparator: {
    width: 1,
    height: 12,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  additionalInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default Footer;