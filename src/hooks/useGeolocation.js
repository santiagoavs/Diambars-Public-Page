// src/hooks/useGeolocation.js
import { useState, useCallback } from 'react';
import { geocodingService } from '../api/geocodingService';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Convertir dirección a coordenadas
  const geocodeAddress = useCallback(async (address, department = '', municipality = '') => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌍 [useGeolocation] Geocoding dirección:', { address, department, municipality });
      
      const result = await geocodingService.geocodeAddress(address, department, municipality);
      
      if (result.success) {
        console.log('✅ [useGeolocation] Geocoding exitoso:', result.coordinates);
        return result;
      } else {
        console.warn('⚠️ [useGeolocation] Geocoding falló:', result.message);
        setError(result.message);
        return result;
      }
    } catch (err) {
      console.error('❌ [useGeolocation] Error en geocoding:', err);
      setError('Error al obtener coordenadas de la dirección');
      return {
        success: false,
        message: 'Error al obtener coordenadas de la dirección'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Convertir coordenadas a dirección
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌍 [useGeolocation] Reverse geocoding coordenadas:', { lat, lng });
      
      const result = await geocodingService.reverseGeocode(lat, lng);
      
      if (result.success) {
        console.log('✅ [useGeolocation] Reverse geocoding exitoso:', result.address);
        return result;
      } else {
        console.warn('⚠️ [useGeolocation] Reverse geocoding falló:', result.message);
        setError(result.message);
        return result;
      }
    } catch (err) {
      console.error('❌ [useGeolocation] Error en reverse geocoding:', err);
      setError('Error al obtener dirección de las coordenadas');
      return {
        success: false,
        message: 'Error al obtener dirección de las coordenadas'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar si las coordenadas están dentro de El Salvador
  const isWithinElSalvador = useCallback((lat, lng) => {
    return geocodingService.isWithinElSalvador(lat, lng);
  }, []);

  // Obtener centro de El Salvador
  const getElSalvadorCenter = useCallback(() => {
    return geocodingService.getElSalvadorCenter();
  }, []);

  // Obtener límites de El Salvador
  const getElSalvadorBounds = useCallback(() => {
    return geocodingService.getElSalvadorBounds();
  }, []);

  // Obtener límites de navegación de El Salvador (más amplios para navegación)
  const getElSalvadorNavigationBounds = useCallback(() => {
    // Límites más amplios para navegación
    return [
      [12.8, -90.3], // Southwest (más amplio)
      [14.6, -87.5] // Northeast (más amplio)
    ];
  }, []);

  return {
    loading,
    error,
    geocodeAddress,
    reverseGeocode,
    isWithinElSalvador,
    getElSalvadorCenter,
    getElSalvadorBounds,
    getElSalvadorNavigationBounds
  };
};
