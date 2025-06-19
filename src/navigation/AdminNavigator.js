// src/navigation/AdminNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Importar pantallas de administrador
import Dashboard from '../screens/admin/Dashboard';
import ProductManagement from '../screens/admin/ProductManagement';
import CategoryManagement from '../screens/admin/CategoryManagement';
import ClienteManagement from '../screens/admin/ClienteManagement';
import ProductForm from '../screens/admin/ProductForm';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigator para Productos (incluye formulario)
const ProductStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="ProductList" 
        component={ProductManagement}
        options={{ title: 'Gestión de Productos' }}
      />
      <Stack.Screen 
        name="ProductForm" 
        component={ProductForm}
        options={({ route }) => ({
          title: route.params?.product ? 'Editar Producto' : 'Nuevo Producto'
        })}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator para Categorías
const CategoryStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="CategoryList" 
        component={CategoryManagement}
        options={{ title: 'Gestión de Categorías' }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator para Clientes
const ClienteStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="ClienteList" 
        component={ClienteManagement}
        options={{ title: 'Gestión de Clientes' }}
      />
    </Stack.Navigator>
  );
};

// Tab Navigator principal para Admin
const AdminNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Products':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'Categories':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Clientes':
              iconName = focused ? 'people' : 'people-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false, // Ocultamos el header del Tab Navigator
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={Dashboard}
        options={{
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductStack}
        options={{
          tabBarLabel: 'Productos',
        }}
      />
      <Tab.Screen 
        name="Categories" 
        component={CategoryStack}
        options={{
          tabBarLabel: 'Categorías',
        }}
      />
      <Tab.Screen 
        name="Clientes" 
        component={ClienteStack}
        options={{
          tabBarLabel: 'Clientes',
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminNavigator;