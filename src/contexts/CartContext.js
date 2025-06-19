// src/contexts/CartContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { carritoService } from '../api/carrito';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cartSummary, setCartSummary] = useState({
    totalItems: 0,
    totalPrice: 0,
  });

  // Calcular resumen del carrito cuando cambien los items
  useEffect(() => {
    const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0);
    const totalPrice = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    
    setCartSummary({
      totalItems,
      totalPrice,
    });
  }, [items]);

  // Obtener carrito desde la API
  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await carritoService.getCarrito();
      
      if (response.data) {
        setItems(response.data.items || []);
      }
    } catch (err) {
      console.error('Error al cargar el carrito:', err);
      setError('Error al cargar el carrito');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar carrito al iniciar o cuando cambie el usuario
  useEffect(() => {
    fetchCart();
  }, [user, fetchCart]);

  // Agregar producto al carrito
  const addToCart = async (product, cantidad = 1) => {
    try {
      setLoading(true);
      setError(null);

      // Validar precio
      if (!product.precio || isNaN(product.precio)) {
        throw new Error('El producto no tiene un precio válido');
      }

      // Llamar a la API para agregar el producto
      const response = await carritoService.agregarProducto(product.id, cantidad);
      
      if (response.data) {
        // Recargar el carrito completo para mantener sincronización
        await fetchCart();
        return { success: true };
      }
    } catch (err) {
      console.error('Error al agregar al carrito:', err);
      setError(err.message || 'Error al agregar el producto');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Actualizar cantidad de un producto
  const updateQuantity = async (carritoId, nuevaCantidad) => {
    try {
      setLoading(true);
      setError(null);

      if (nuevaCantidad < 1) {
        throw new Error('La cantidad debe ser mayor a 0');
      }

      // Actualizar localmente primero para UI responsiva
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === carritoId
            ? { ...item, cantidad: nuevaCantidad, subtotal: item.producto.precio * nuevaCantidad }
            : item
        )
      );

      // Llamar a la API
      const response = await carritoService.actualizarCantidad(carritoId, nuevaCantidad);
      
      if (response.data) {
        // Recargar para asegurar sincronización
        await fetchCart();
        return { success: true };
      }
    } catch (err) {
      console.error('Error al actualizar cantidad:', err);
      setError(err.message || 'Error al actualizar la cantidad');
      // Revertir cambio local si falla
      await fetchCart();
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Eliminar producto del carrito
  const removeFromCart = async (carritoId) => {
    try {
      setLoading(true);
      setError(null);

      // Eliminar localmente primero para UI responsiva
      setItems(prevItems => prevItems.filter(item => item.id !== carritoId));

      // Llamar a la API
      const response = await carritoService.eliminarProducto(carritoId);
      
      if (response.data) {
        // Recargar para asegurar sincronización
        await fetchCart();
        return { success: true };
      }
    } catch (err) {
      console.error('Error al eliminar del carrito:', err);
      setError(err.message || 'Error al eliminar el producto');
      // Revertir cambio local si falla
      await fetchCart();
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Limpiar todo el carrito
  const clearCart = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await carritoService.limpiarCarrito();
      
      if (response.data) {
        setItems([]);
        return { success: true };
      }
    } catch (err) {
      console.error('Error al limpiar el carrito:', err);
      setError(err.message || 'Error al limpiar el carrito');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Finalizar compra
  const finalizarCompra = async (notas = '', metodoPago = 'EFECTIVO') => {
    try {
      setLoading(true);
      setError(null);

      // Validar que haya items en el carrito
      if (items.length === 0) {
        throw new Error('El carrito está vacío');
      }

      // Llamar a la API para finalizar la compra
      const response = await carritoService.finalizarCompra(notas, metodoPago);
      
      if (response.data && response.data.pedido) {
        // Limpiar el carrito local después de una compra exitosa
        setItems([]);
        
        // Limpiar el sessionId para comenzar un nuevo carrito
        await carritoService.clearSessionId();
        
        return { 
          success: true, 
          pedido: response.data.pedido 
        };
      }
    } catch (err) {
      console.error('Error al finalizar compra:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Error al procesar la compra';
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  // Actualizar items del carrito (útil para el checkout)
  const updateCartItems = (newItems) => {
    setItems(newItems);
  };

  // Obtener cantidad total de items (para el badge)
  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.cantidad, 0);
  };

  // Obtener precio total
  const getTotalPrice = () => {
    return items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  const value = {
    // Estado
    items,
    loading,
    error,
    cartSummary,
    
    // Métodos
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    finalizarCompra,
    updateCartItems,
    
    // Helpers
    getTotalItems,
    getTotalPrice,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};