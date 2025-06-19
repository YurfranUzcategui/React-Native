// src/screens/admin/Dashboard.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { productosService } from '../../api/productos';
import { categoriasService } from '../../api/categorias';
import { clientesService } from '../../api/clientes';

const Dashboard = ({ navigation }) => {
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    totalProductos: 0,
    totalCategorias: 0,
    totalClientes: 0,
    productosAgotados: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      // Cargar datos en paralelo
      const [productosResponse, categoriasResponse, clientesResponse] = await Promise.all([
        productosService.getAll(),
        categoriasService.getAll(),
        clientesService.getAll(),
      ]);
      
      const productos = productosResponse.data;
      const categorias = categoriasResponse.data;
      const clientes = clientesResponse.data;
      
      // Calcular estadísticas
      const productosAgotados = productos.filter(
        (producto) => producto.stock <= producto.stockMinimo
      ).length;
      
      setStats({
        totalProductos: productos.length,
        totalCategorias: categorias.length,
        totalClientes: clientes.length,
        productosAgotados,
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    }
  };

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    await fetchStats();
    
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

  // Componente de tarjeta estadística
  const StatCard = ({ title, value, subtitle, icon, color, onPress, alertColor }) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={32} color={color} />
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      
      <View style={styles.statContent}>
        <Text style={[styles.statValue, alertColor && { color: alertColor }]}>{value}</Text>
        {subtitle && (
          <Text style={[styles.statSubtitle, alertColor && { color: alertColor }]}>
            {subtitle}
          </Text>
        )}
      </View>
      
      <View style={styles.statFooter}>
        <Text style={[styles.manageText, { color }]}>Gestionar</Text>
        <Ionicons name="chevron-forward" size={16} color={color} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Administración</Text>
        <Text style={styles.welcome}>Bienvenido, {user?.nombre}</Text>
      </View>

      {/* Tarjetas de estadísticas */}
      <View style={styles.statsContainer}>
        {/* Productos */}
        <StatCard
          title="Productos"
          value={stats.totalProductos}
          subtitle={`${stats.productosAgotados} con stock bajo`}
          icon="cube-outline"
          color="#2196F3"
          alertColor={stats.productosAgotados > 0 ? "#f44336" : null}
          onPress={() => navigation.navigate('Products')}
        />

        {/* Categorías */}
        <StatCard
          title="Categorías"
          value={stats.totalCategorias}
          subtitle="Total de categorías"
          icon="list-outline"
          color="#4CAF50"
          onPress={() => navigation.navigate('Categories')}
        />

        {/* Clientes */}
        <StatCard
          title="Clientes"
          value={stats.totalClientes}
          subtitle="Total de clientes"
          icon="people-outline"
          color="#FF9800"
          onPress={() => navigation.navigate('Clientes')}
        />
      </View>

      {/* Alertas */}
      {stats.productosAgotados > 0 && (
        <View style={styles.alertContainer}>
          <View style={styles.alert}>
            <Ionicons name="warning" size={24} color="#ff9800" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Stock Bajo</Text>
              <Text style={styles.alertText}>
                {stats.productosAgotados} producto{stats.productosAgotados !== 1 ? 's' : ''} 
                {stats.productosAgotados === 1 ? ' tiene' : ' tienen'} stock bajo
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Products')}>
              <Text style={styles.alertAction}>Ver</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
  },
  welcome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statContent: {
    marginBottom: 15,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  manageText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  alertContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  alert: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  alertContent: {
    flex: 1,
    marginLeft: 15,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 14,
    color: '#856404',
  },
  alertAction: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff9800',
    paddingHorizontal: 10,
  },
});

export default Dashboard;