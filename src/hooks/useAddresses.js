// src/hooks/useAddresses.js
import { useState, useEffect, useCallback } from 'react';
import { addressService } from '../api/addressService';

export const useAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [deliveryFees, setDeliveryFees] = useState({});
  const [locationData, setLocationData] = useState({ departments: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados adicionales para funcionalidades avanzadas
  const [selectedAddresses, setSelectedAddresses] = useState([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    default: 0
  });

  // Cargar direcciones del usuario
  const loadAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🏠 [useAddresses] Cargando direcciones del usuario...');
      
      const response = await addressService.getUserAddresses();
      
      console.log('🏠 [useAddresses] Respuesta completa del servidor:', response);
      
      if (response.success && response.data) {
        console.log('✅ [useAddresses] Direcciones encontradas:', {
          addresses: response.data.addresses,
          count: response.data.addresses?.length || 0
        });
        
        const addressesList = response.data.addresses || [];
        setAddresses(addressesList);
        setDeliveryFees(response.data.deliveryFees || {});
        
        // Calcular estadísticas
        updateStatistics(addressesList);
      } else if (response.addresses) {
        // Fallback si la estructura es diferente
        console.log('🔄 [useAddresses] Usando estructura alternativa:', response.addresses);
        const addressesList = response.addresses || [];
        setAddresses(addressesList);
        updateStatistics(addressesList);
      } else {
        console.warn('⚠️ [useAddresses] No se encontraron direcciones en la respuesta');
        setAddresses([]);
        updateStatistics([]);
      }
    } catch (err) {
      console.error('❌ [useAddresses] Error cargando direcciones:', err);
      setError(err.message);
      setAddresses([]); // Asegurar que sea array vacío en caso de error
      updateStatistics([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Actualizar estadísticas de direcciones
  const updateStatistics = useCallback((addressesList) => {
    const stats = {
      total: addressesList.length,
      active: addressesList.filter(addr => addr.isDefault).length,
      inactive: addressesList.filter(addr => !addr.isDefault).length,
      default: addressesList.filter(addr => addr.isDefault).length
    };
    setStatistics(stats);
  }, []);

  // Cargar datos de ubicaciones
  const loadLocationData = useCallback(async () => {
    try {
      console.log('🌍 [useAddresses] Cargando datos de ubicaciones...');
      
      const response = await addressService.getLocationData();
      
      console.log('🌍 [useAddresses] Respuesta de ubicaciones:', response);
      
      if (response.success && response.data) {
        console.log('✅ [useAddresses] Datos de ubicaciones cargados:', {
          departments: response.data.departments?.length || 0,
          estructura: response.data
        });
        setLocationData(response.data);
      } else {
        console.warn('⚠️ [useAddresses] Respuesta sin success o data:', response);
        // Fallback: intentar usar directamente la respuesta
        if (response.departments) {
          setLocationData(response);
        }
      }
    } catch (err) {
      console.error('❌ [useAddresses] Error cargando ubicaciones:', err);
      
      // Fallback: datos hardcodeados para testing
      console.log('🔄 [useAddresses] Usando datos de fallback...');
      const fallbackData = {
        departments: [
          {
            name: 'San Salvador',
            municipalities: ['San Salvador', 'Mejicanos', 'Soyapango', 'Ciudad Delgado'],
            deliveryFee: 3.50
          },
          {
            name: 'La Libertad',
            municipalities: ['Santa Tecla', 'Antiguo Cuscatlán', 'Nueva San Salvador'],
            deliveryFee: 4.00
          },
          {
            name: 'San Miguel',
            municipalities: ['San Miguel', 'Carolina', 'Chapeltique'],
            deliveryFee: 6.00
          }
        ]
      };
      setLocationData(fallbackData);
    }
  }, []);

  // Crear nueva dirección
  const createAddress = async (addressData) => {
    try {
      setError(null);
      const response = await addressService.createAddress(addressData);
      
      if (response.success) {
        // NO recargar aquí, dejar que el componente lo haga
        return response.data.address;
      }
    } catch (err) {
      console.error('❌ [useAddresses] Error creando dirección:', err);
      setError(err.message);
      throw err;
    }
  };

  // Actualizar dirección
  const updateAddress = async (addressId, addressData) => {
    try {
      setError(null);
      const response = await addressService.updateAddress(addressId, addressData);
      
      if (response.success) {
        // Actualizar la dirección en el estado local
        setAddresses(prev => 
          prev.map(addr => 
            addr._id === addressId 
              ? { ...addr, ...response.data.address }
              : addr
          )
        );
        return response.data.address;
      }
    } catch (err) {
      console.error('❌ [useAddresses] Error actualizando dirección:', err);
      setError(err.message);
      throw err;
    }
  };

  // Eliminar dirección
  const deleteAddress = async (addressId) => {
    try {
      setError(null);
      await addressService.deleteAddress(addressId);
      
      // Remover la dirección del estado local
      setAddresses(prev => prev.filter(addr => addr._id !== addressId));
    } catch (err) {
      console.error('❌ [useAddresses] Error eliminando dirección:', err);
      setError(err.message);
      throw err;
    }
  };

  // Establecer dirección como predeterminada
  const setDefaultAddress = async (addressId) => {
    try {
      setError(null);
      const response = await addressService.setDefaultAddress(addressId);
      
      if (response.success) {
        // Actualizar el estado: marcar como predeterminada y desmarcar las demás
        setAddresses(prev => 
          prev.map(addr => ({
            ...addr,
            isDefault: addr._id === addressId
          }))
        );
        return response.data.address;
      }
    } catch (err) {
      console.error('❌ [useAddresses] Error estableciendo dirección predeterminada:', err);
      setError(err.message);
      throw err;
    }
  };

  // Validar dirección
  const validateAddress = async (addressData) => {
    try {
      const response = await addressService.validateAddress(addressData);
      return response.data;
    } catch (err) {
      console.error('❌ [useAddresses] Error validando dirección:', err);
      throw err;
    }
  };

  // Obtener municipios de un departamento
  const getMunicipalitiesForDepartment = (departmentName) => {
    const department = locationData.departments?.find(dept => dept.name === departmentName);
    return department?.municipalities || [];
  };

  // Obtener tarifa de envío para un departamento
  const getDeliveryFeeForDepartment = (departmentName) => {
    const department = locationData.departments?.find(dept => dept.name === departmentName);
    return department?.deliveryFee || deliveryFees.defaultFee || 0;
  };

  // Funciones de selección
  const toggleAddressSelection = useCallback((addressId) => {
    setSelectedAddresses(prev => {
      if (prev.includes(addressId)) {
        return prev.filter(id => id !== addressId);
      } else {
        return [...prev, addressId];
      }
    });
  }, []);

  const selectAllAddresses = useCallback(() => {
    setSelectedAddresses(addresses.map(addr => addr._id));
  }, [addresses]);

  const clearSelection = useCallback(() => {
    setSelectedAddresses([]);
  }, []);

  // Funciones de estadísticas
  const getCalculatedStats = useCallback(() => {
    return {
      total: addresses.length,
      active: addresses.filter(addr => addr.isDefault).length,
      inactive: addresses.filter(addr => !addr.isDefault).length,
      default: addresses.filter(addr => addr.isDefault).length,
      selected: selectedAddresses.length
    };
  }, [addresses, selectedAddresses]);

  // Funciones de utilidad
  const hasAddresses = addresses.length > 0;
  const isEmpty = addresses.length === 0;
  const defaultAddress = addresses.find(addr => addr.isDefault);

  // Cargar datos iniciales
  useEffect(() => {
    loadAddresses();
    loadLocationData();
  }, [loadAddresses, loadLocationData]);

  return {
    // Estado
    addresses,
    deliveryFees,
    locationData,
    isLoading,
    error,
    selectedAddresses,
    statistics,
    
    // Acciones principales
    loadAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    validateAddress,
    
    // Acciones de selección
    toggleAddressSelection,
    selectAllAddresses,
    clearSelection,
    
    // Utilidades
    getMunicipalitiesForDepartment,
    getDeliveryFeeForDepartment,
    getCalculatedStats,
    
    // Estado derivado
    defaultAddress,
    hasAddresses,
    isEmpty
  };
};