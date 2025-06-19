// src/components/common/Navbar.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Agregar esta importación

const Navbar = ({ navigation, title = "InvVent" }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const insets = useSafeAreaInsets(); // Hook para obtener las áreas seguras

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  const navigateToProfile = () => {
    setShowUserMenu(false);
    if (isAdmin) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('Profile');
    }
  };

  const navigateToHome = () => {
    setShowNavMenu(false);
    if (isAdmin) {
      navigation.navigate('Dashboard');
    } else {
      navigation.navigate('Catalog');
    }
  };

  const getNavItems = () => {
    if (isAdmin) {
      return [
        { title: 'Dashboard', onPress: () => { setShowNavMenu(false); navigation.navigate('Dashboard'); }, icon: 'home-outline' },
        { title: 'Productos', onPress: () => { setShowNavMenu(false); navigation.navigate('Products'); }, icon: 'cube-outline' },
        { title: 'Categorías', onPress: () => { setShowNavMenu(false); navigation.navigate('Categories'); }, icon: 'list-outline' },
        { title: 'Clientes', onPress: () => { setShowNavMenu(false); navigation.navigate('Clientes'); }, icon: 'people-outline' },
      ];
    } else {
      return [
        { title: 'Productos', onPress: () => { setShowNavMenu(false); navigation.navigate('Catalog'); }, icon: 'storefront-outline' },
        { title: 'Mi Carrito', onPress: () => { setShowNavMenu(false); navigation.navigate('Cart'); }, icon: 'cart-outline' },
        { title: 'Mis Pedidos', onPress: () => { setShowNavMenu(false); navigation.navigate('Orders'); }, icon: 'receipt-outline' },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* StatusBar */}
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#2196F3" 
        translucent={false}
      />
      
      {/* Contenedor principal con padding superior dinámico */}
      <View style={[styles.navbarContainer, { paddingTop: insets.top }]}>
        <View style={styles.navbar}>
          {/* Logo/Título */}
          <TouchableOpacity style={styles.logoContainer} onPress={navigateToHome}>
            <Text style={styles.logo}>{title}</Text>
          </TouchableOpacity>

          {/* Botones de la derecha */}
          <View style={styles.rightContainer}>
            {isAuthenticated ? (
              <>
                {/* Menú hamburguesa */}
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setShowNavMenu(true)}
                >
                  <Ionicons name="menu" size={24} color="white" />
                </TouchableOpacity>

                {/* Avatar/Usuario */}
                <TouchableOpacity
                  style={styles.userButton}
                  onPress={() => setShowUserMenu(true)}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={20} color="white" />
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.authButtons}>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Modal de menú de navegación */}
      <Modal
        visible={showNavMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNavMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.navMenuContainer}>
            <View style={styles.navMenuHeader}>
              <Text style={styles.navMenuTitle}>Navegación</Text>
              <TouchableOpacity onPress={() => setShowNavMenu(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.navMenuItems}>
              {navItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.navMenuItem}
                  onPress={item.onPress}
                >
                  <Ionicons name={item.icon} size={20} color="#2196F3" />
                  <Text style={styles.navMenuItemText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de menú de usuario */}
      <Modal
        visible={showUserMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={[styles.userMenuContainer, { marginTop: insets.top + 60 }]}>
            <View style={styles.userMenuHeader}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={24} color="#2196F3" />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user?.nombre || 'Usuario'}</Text>
                  <Text style={styles.userEmail}>{user?.email}</Text>
                  <Text style={styles.userRole}>
                    {isAdmin ? 'Administrador' : 'Cliente'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.userMenuItems}>
              <TouchableOpacity style={styles.userMenuItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#f44336" />
                <Text style={[styles.userMenuItemText, styles.logoutText]}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Nuevo contenedor principal
  navbarContainer: {
    backgroundColor: '#2196F3',
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 56, // Altura mínima consistente
  },
  logoContainer: {
    flex: 1,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginRight: 10,
  },
  userButton: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtons: {
    flexDirection: 'row',
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'white',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  
  // Estilos de modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Menú de navegación
  navMenuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  navMenuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  navMenuItems: {
    padding: 10,
  },
  navMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 2,
  },
  navMenuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontWeight: '500',
  },
  
  // Menú de usuario
  userMenuContainer: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginRight: 15,
    position: 'absolute',
    right: 0,
    borderRadius: 12,
    minWidth: 280,
    maxWidth: 320,
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
    }),
  },
  userMenuHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  userMenuItems: {
    padding: 10,
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  userMenuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  logoutText: {
    color: '#f44336',
  },
});

export default Navbar;