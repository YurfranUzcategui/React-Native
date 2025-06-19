// src/navigation/ClienteNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Importar pantallas de cliente
import Profile from '../screens/client/Profile';
import Cart from '../screens/client/CartScreen';
import ProductCatalog from '../screens/client/ProductCatalog';
import ProductDetail from '../screens/common/ProductDetail';
import CheckoutScreen from '../screens/client/CheckoutScreen';
import OrderSuccessScreen from '../screens/client/OrderSuccessScreen';
import Orders from '../screens/client/OrdersScreen';



import PaymentResultScreen from '../screens/client/PaymentResultScreen';
import PaymentSuccessScreen from '../screens/client/PaymentSuccessScreen';


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();


// Stack Navigator para Catálogo de Productos
const CatalogStack = () => {
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
        name="ProductCatalogMain" 
        component={ProductCatalog}
        options={{ title: 'Catálogo de Productos' }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetail}
        options={{ 
          title: 'Detalle del Producto',
          headerShown: false // ProductDetail tiene su propio header
        }}
      />
    </Stack.Navigator>
  );
};

// ✅ STACK MEJORADO: CartStack con pantallas de pago
const CartStack = () => {
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
        name="CartMain" 
        component={Cart}
        options={{ title: 'Mi Carrito' }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ title: 'Finalizar Compra' }}
      />
      <Stack.Screen 
        name="OrderSuccess" 
        component={OrderSuccessScreen}
        options={{ 
          title: 'Pedido Confirmado',
          headerLeft: null, // Prevenir volver atrás
          gestureEnabled: false // Desactivar gesto de volver en iOS
        }}
      />
      
      {/* ✅ NUEVAS PANTALLAS: Pagos con Transbank */}
      <Stack.Screen 
        name="PaymentResult" 
        component={PaymentResultScreen}
        options={{ 
          title: 'Verificando Pago',
          headerStyle: {
            backgroundColor: '#2196F3',
            shadowColor: 'transparent', // iOS
            elevation: 0, // Android
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerLeft: null, // Prevenir volver atrás durante verificación
          gestureEnabled: false, // Desactivar gestos
        }}
      />
      
      <Stack.Screen 
        name="PaymentSuccess" 
        component={PaymentSuccessScreen}
        options={{ 
          headerShown: false, // PaymentSuccess maneja su propio header
          headerLeft: null,
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator para Pedidos
const OrdersStack = () => {
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
        name="OrdersMain" 
        component={Orders}
        options={{ title: 'Mis Pedidos' }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator para Perfil
const ProfileStack = () => {
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
        name="ProfileMain" 
        component={Profile}
        options={{ title: 'Mi Perfil' }}
      />
    </Stack.Navigator>
  );
};

// ✅ TAB NAVIGATOR PRINCIPAL - SIN CAMBIOS
const ClienteNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Catalog':
              iconName = focused ? 'storefront' : 'storefront-outline';
              break;
            case 'Cart':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Orders':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
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
        name="Catalog" 
        component={CatalogStack}
        options={{
          tabBarLabel: 'Productos',
        }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartStack}
        options={{
          tabBarLabel: 'Carrito',
          tabBarBadge: undefined, // Aquí puedes mostrar número de items
        }}
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersStack}
        options={{
          tabBarLabel: 'Pedidos',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{
          tabBarLabel: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
};

export default ClienteNavigator;