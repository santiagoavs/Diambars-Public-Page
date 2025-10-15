// src/hooks/useAddressValidation.js
import { useState, useCallback } from 'react';
import { addressService } from '../api/addressService';

export const useAddressValidation = () => {
  const [validating, setValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Validar un campo específico
  const validateField = useCallback(async (field, value, allFormData = {}) => {
    try {
      setValidating(true);
      
      // Validaciones básicas del frontend
      const errors = {};
      
      switch (field) {
        case 'recipient':
          if (!value || value.trim().length < 2) {
            errors.recipient = 'El nombre del destinatario debe tener al menos 2 caracteres';
          } else if (value.trim().length > 100) {
            errors.recipient = 'El nombre no puede exceder 100 caracteres';
          }
          break;
          
        case 'phoneNumber':
          const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
          if (!cleanPhone) {
            errors.phoneNumber = 'El teléfono es requerido';
          } else if (!/^[267]\d{7}$/.test(cleanPhone)) {
            errors.phoneNumber = 'Formato de teléfono inválido (ej: 7123-4567)';
          }
          break;
          
        case 'department':
          if (!value) {
            errors.department = 'El departamento es requerido';
          }
          break;
          
        case 'municipality':
          if (!value) {
            errors.municipality = 'El municipio es requerido';
          }
          break;
          
        case 'address':
          if (!value || value.trim().length < 10) {
            errors.address = 'La dirección debe ser más específica (mínimo 10 caracteres)';
          } else if (value.trim().length > 200) {
            errors.address = 'La dirección no puede exceder 200 caracteres';
          }
          break;
          
        case 'label':
          if (value && value.length > 50) {
            errors.label = 'La etiqueta no puede exceder 50 caracteres';
          }
          break;
          
        case 'additionalDetails':
          if (value && value.length > 200) {
            errors.additionalDetails = 'Los detalles adicionales no pueden exceder 200 caracteres';
          }
          break;
      }
      
      // Actualizar errores del campo específico
      setValidationErrors(prev => ({
        ...prev,
        [field]: errors[field] || null
      }));
      
      return !errors[field]; // true si no hay error
      
    } catch (error) {
      console.error(`❌ [useAddressValidation] Error validando campo ${field}:`, error);
      return false;
    } finally {
      setValidating(false);
    }
  }, []);

  // Validar dirección completa en el backend
  const validateCompleteAddress = useCallback(async (addressData) => {
    try {
      setValidating(true);
      setValidationErrors({});
      
      console.log('🔍 [useAddressValidation] Validando dirección completa:', addressData);
      
      const response = await addressService.validateAddress(addressData);
      
      if (response.success) {
        console.log('✅ [useAddressValidation] Dirección validada correctamente');
        return {
          isValid: true,
          data: response.data
        };
      } else {
        console.warn('⚠️ [useAddressValidation] Validación falló:', response.message);
        return {
          isValid: false,
          message: response.message
        };
      }
    } catch (error) {
      console.error('❌ [useAddressValidation] Error en validación completa:', error);
      
      // Si es error de validación del backend, extraer errores específicos
      if (error.message.includes(',')) {
        const fieldErrors = {};
        const errorMessages = error.message.split(',');
        
        errorMessages.forEach(msg => {
          const trimmedMsg = msg.trim();
          // Intentar mapear mensajes a campos
          if (trimmedMsg.includes('destinatario')) {
            fieldErrors.recipient = trimmedMsg;
          } else if (trimmedMsg.includes('teléfono')) {
            fieldErrors.phoneNumber = trimmedMsg;
          } else if (trimmedMsg.includes('departamento')) {
            fieldErrors.department = trimmedMsg;
          } else if (trimmedMsg.includes('municipio')) {
            fieldErrors.municipality = trimmedMsg;
          } else if (trimmedMsg.includes('dirección')) {
            fieldErrors.address = trimmedMsg;
          }
        });
        
        setValidationErrors(fieldErrors);
      }
      
      return {
        isValid: false,
        message: error.message
      };
    } finally {
      setValidating(false);
    }
  }, []);

  // Verificar si un campo tiene error
  const hasFieldError = useCallback((field) => {
    return !!validationErrors[field];
  }, [validationErrors]);

  // Obtener error de un campo
  const getFieldError = useCallback((field) => {
    return validationErrors[field] || null;
  }, [validationErrors]);

  // Limpiar errores
  const clearErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  // Limpiar error de un campo específico
  const clearFieldError = useCallback((field) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    validating,
    validationErrors,
    validateField,
    validateCompleteAddress,
    hasFieldError,
    getFieldError,
    clearErrors,
    clearFieldError
  };
};
