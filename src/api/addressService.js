// src/api/addressService.js
import apiClient from './apiClient';

export const addressService = {
  // Obtener todas las direcciones del usuario
  getUserAddresses: async () => {
    try {
      console.log('🏠 [addressService] Obteniendo direcciones del usuario');
      const response = await apiClient.get('/addresses');
      
      console.log('✅ [addressService] Respuesta completa:', response);
      
      // El backend devuelve { success: true, data: { addresses, deliveryFees } }
      if (response.success && response.data) {
        console.log('📍 [addressService] Direcciones encontradas:', {
          addresses: response.data.addresses,
          count: response.data.addresses?.length || 0,
          deliveryFees: response.data.deliveryFees
        });
        return response;
      } else {
        console.warn('⚠️ [addressService] Respuesta sin success o data:', response);
        return {
          success: false,
          data: { addresses: [], deliveryFees: {} },
          message: 'Error en la respuesta del servidor'
        };
      }
    } catch (error) {
      console.error('❌ [addressService] Error obteniendo direcciones:', error);
      throw new Error(
        error.response?.data?.message || 'Error al obtener direcciones'
      );
    }
  },

  // Crear nueva dirección
  createAddress: async (addressData) => {
    try {
      console.log('🏠 [addressService] Creando nueva dirección:', addressData);
      
      // Validar datos requeridos antes de enviar
      if (!addressData.recipient || !addressData.phoneNumber || !addressData.department || !addressData.municipality || !addressData.address) {
        throw new Error('Faltan campos requeridos para crear la dirección');
      }
      
      const response = await apiClient.post('/addresses', addressData);
      
      console.log('✅ [addressService] Dirección creada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [addressService] Error creando dirección:', error);
      
      // Manejar errores de validación específicos
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          // Errores de validación de campos
          throw new Error(errorData.errors.map(e => e.message).join(', '));
        }
        throw new Error(errorData.message || 'Datos de dirección inválidos');
      }
      
      throw new Error(
        error.response?.data?.message || 'Error al crear dirección'
      );
    }
  },

  // Actualizar dirección existente
  updateAddress: async (addressId, addressData) => {
    try {
      console.log('🏠 [addressService] Actualizando dirección:', { addressId, addressData });
      const response = await apiClient.put(`/addresses/${addressId}`, addressData);
      
      console.log('✅ [addressService] Dirección actualizada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [addressService] Error actualizando dirección:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Dirección no encontrada');
      }
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          throw new Error(errorData.errors.map(e => e.message).join(', '));
        }
        throw new Error(errorData.message || 'Datos de dirección inválidos');
      }
      
      throw new Error(
        error.response?.data?.message || 'Error al actualizar dirección'
      );
    }
  },

  // Eliminar dirección
  deleteAddress: async (addressId) => {
    try {
      console.log('🏠 [addressService] Eliminando dirección:', addressId);
      const response = await apiClient.delete(`/addresses/${addressId}`);
      
      console.log('✅ [addressService] Dirección eliminada');
      return response.data;
    } catch (error) {
      console.error('❌ [addressService] Error eliminando dirección:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Dirección no encontrada');
      }
      
      throw new Error(
        error.response?.data?.message || 'Error al eliminar dirección'
      );
    }
  },

  // Establecer dirección como predeterminada
  setDefaultAddress: async (addressId) => {
    try {
      console.log('🏠 [addressService] Estableciendo dirección predeterminada:', addressId);
      const response = await apiClient.patch(`/addresses/${addressId}/set-default`);
      
      console.log('✅ [addressService] Dirección predeterminada establecida');
      return response.data;
    } catch (error) {
      console.error('❌ [addressService] Error estableciendo dirección predeterminada:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Dirección no encontrada');
      }
      
      throw new Error(
        error.response?.data?.message || 'Error al establecer dirección predeterminada'
      );
    }
  },

  // Validar dirección
  validateAddress: async (addressData) => {
    try {
      console.log('🏠 [addressService] Validando dirección:', addressData);
      const response = await apiClient.post('/addresses/validate', addressData);
      
      console.log('✅ [addressService] Dirección validada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [addressService] Error validando dirección:', error);
      throw new Error(
        error.response?.data?.message || 'Error al validar dirección'
      );
    }
  },

  // Obtener tarifas de envío
  getDeliveryFees: async () => {
    try {
      console.log('🏠 [addressService] Obteniendo tarifas de envío');
      const response = await apiClient.get('/addresses/delivery/fees');
      
      console.log('✅ [addressService] Tarifas obtenidas:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [addressService] Error obteniendo tarifas:', error);
      throw new Error(
        error.response?.data?.message || 'Error al obtener tarifas de envío'
      );
    }
  },

  // Obtener datos de ubicaciones (departamentos y municipios)
  getLocationData: async () => {
    try {
      console.log('🌍 [addressService] Obteniendo datos de ubicaciones');
      const response = await apiClient.get('/config/locations');
      
      console.log('✅ [addressService] Datos de ubicaciones obtenidos:', response);
      return response;
    } catch (error) {
      console.error('❌ [addressService] Error obteniendo ubicaciones:', error);
      
      // Si el endpoint no existe, intentar con el endpoint alternativo
      try {
        console.log('🔄 [addressService] Intentando endpoint alternativo...');
        const fallbackResponse = await apiClient.get('/addresses/delivery/fees');
        console.log('📍 [addressService] Respuesta de endpoint alternativo:', fallbackResponse);
        
        // Transformar la respuesta para que tenga la estructura esperada
        if (fallbackResponse.success) {
          return fallbackResponse;
        }
      } catch (fallbackError) {
        console.error('❌ [addressService] Error en endpoint alternativo:', fallbackError);
      }
      
      throw new Error(
        error.response?.data?.message || 'Error al obtener datos de ubicaciones'
      );
    }
  },

  // Establecer ubicación predeterminada desde coordenadas (para AddressMapPicker)
  setDefaultLocationFromCoordinates: async (coordinatesData) => {
    try {
      console.log('🗺️ [addressService] Estableciendo ubicación predeterminada:', coordinatesData);
      const response = await apiClient.post('/addresses/set-default-location', coordinatesData);
      
      console.log('✅ [addressService] Ubicación predeterminada establecida');
      return response.data;
    } catch (error) {
      console.error('❌ [addressService] Error estableciendo ubicación predeterminada:', error);
      throw new Error(
        error.response?.data?.message || 'Error al establecer ubicación predeterminada'
      );
    }
  },

  // Detectar direcciones duplicadas
  detectDuplicates: async (addressData) => {
    try {
      console.log('🔍 [addressService] Detectando direcciones duplicadas:', addressData);
      const response = await apiClient.post('/addresses/detect-duplicates', addressData);
      
      console.log('✅ [addressService] Detección de duplicados completada');
      return response.data;
    } catch (error) {
      console.error('❌ [addressService] Error detectando duplicados:', error);
      throw new Error(
        error.response?.data?.message || 'Error al detectar direcciones duplicadas'
      );
    }
  }
};

export default addressService;