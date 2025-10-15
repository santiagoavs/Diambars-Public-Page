import React, { useState, useEffect, useCallback } from 'react';
import { useAddresses } from '../../hooks/useAddresses';
import { useAddressValidation } from '../../hooks/useAddressValidation';
import { useGeolocation } from '../../hooks/useGeolocation';
import AddressMapPicker from './AddressMapPicker';
import AddressMapViewer from './AddressMapViewer';
import './shippingAddresses.css';
import Modal from '../UI/modal/modal';
import Swal from 'sweetalert2';
import { 
  MapPin, 
  ArrowClockwise, 
  Plus, 
  PencilSimple, 
  Trash,
  Eye,
  CheckCircle,
  XCircle
} from '@phosphor-icons/react';

const ShippingAddresses = () => {
  const {
    addresses,
    locationData,
    isLoading,
    error,
    loadAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getMunicipalitiesForDepartment,
    getDeliveryFeeForDepartment,
    statistics,
    getCalculatedStats
  } = useAddresses();

  const { 
    validateField, 
    validateCompleteAddress, 
    hasFieldError, 
    getFieldError, 
    clearErrors 
  } = useAddressValidation();

  const { 
    geocodeAddress, 
    reverseGeocode, 
    isWithinElSalvador,
    getElSalvadorCenter 
  } = useGeolocation();

  // Configuración de SweetAlert2 muy redondeada
  const showAlert = (type, title, text, showConfirmButton = true) => {
    const config = {
      title,
      text,
      showConfirmButton,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3F2724',
      background: 'rgba(255, 255, 255, 0.95)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      customClass: {
        popup: 'swal2-popup-rounded',
        confirmButton: 'swal2-confirm-button-rounded'
      },
      buttonsStyling: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      timer: type === 'success' ? 3000 : undefined,
      timerProgressBar: type === 'success',
      // Asegurar z-index muy alto para que aparezca sobre modales
      zIndex: 10000000
    };

    switch (type) {
      case 'success':
        return Swal.fire({
          ...config,
          icon: 'success',
          iconColor: '#28a745'
        });
      case 'error':
        return Swal.fire({
          ...config,
          icon: 'error',
          iconColor: '#dc3545'
        });
      case 'warning':
        return Swal.fire({
          ...config,
          icon: 'warning',
          iconColor: '#ffc107'
        });
      case 'info':
        return Swal.fire({
          ...config,
          icon: 'info',
          iconColor: '#17a2b8'
        });
      case 'loading':
        return Swal.fire({
          ...config,
          title: 'Procesando...',
          text: 'Por favor espera',
          icon: 'info',
          showConfirmButton: false,
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
      default:
        return Swal.fire(config);
    }
  };

  // Debug logs para verificar datos (simplificado)
  console.log('🏠 [ShippingAddresses] Direcciones cargadas:', addresses?.length || 0);

  // Estados para modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isMapViewerOpen, setIsMapViewerOpen] = useState(false);
  const [selectedAddressForMap, setSelectedAddressForMap] = useState(null);
  
  // Estados para formularios
  const [formData, setFormData] = useState({
    label: '',
    recipient: '',
    phoneNumber: '',
    department: '',
    municipality: '',
    address: '',
    additionalDetails: '',
    coordinates: null,
    isDefault: false
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Monitorear cambios en los estados del modal para debugging (solo en desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [useEffect] Estados del modal cambiaron:', {
        isAddModalOpen,
        editingAddress: editingAddress?._id || null,
        isSubmitting
      });
    }
  }, [isAddModalOpen, editingAddress, isSubmitting]);

  // Efecto para manejar redimensionamiento cuando se abre el mapa viewer
  useEffect(() => {
    if (isMapViewerOpen) {
      console.log('🗺️ [ShippingAddresses] Abriendo modal de mapa, forzando redimensionamiento...');
      
      // Múltiples eventos de redimensionamiento para asegurar renderizado correcto
      const timeouts = [
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
          console.log('🔄 [ShippingAddresses] Evento resize 1 enviado');
        }, 100),
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
          console.log('🔄 [ShippingAddresses] Evento resize 2 enviado');
        }, 300),
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
          console.log('🔄 [ShippingAddresses] Evento resize 3 enviado');
        }, 500)
      ];
      
      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    }
  }, [isMapViewerOpen]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerCoordinates, setMapPickerCoordinates] = useState(null);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [shouldReloadAddresses, setShouldReloadAddresses] = useState(false);

  // Función optimizada para recargar direcciones
  const reloadAddressesIfNeeded = useCallback(async () => {
    if (shouldReloadAddresses) {
      console.log('🔄 [reloadAddressesIfNeeded] Recargando direcciones...');
      await loadAddresses();
      setShouldReloadAddresses(false);
    }
  }, [shouldReloadAddresses, loadAddresses]);

  // Effect para recargar direcciones cuando sea necesario
  useEffect(() => {
    reloadAddressesIfNeeded();
  }, [reloadAddressesIfNeeded]);

  // Limpiar formulario
  const resetForm = () => {
    setFormData({
      label: '',
      recipient: '',
      phoneNumber: '',
      department: '',
      municipality: '',
      address: '',
      additionalDetails: '',
      coordinates: null,
      isDefault: false
    });
    setFormErrors({});
    setMapPickerCoordinates(null);
    setShowMapPicker(false);
    clearErrors();
  };

  // Manejar selección de ubicación del mapa
  const handleLocationFromMap = (coordinates) => {
    setMapPickerCoordinates(coordinates);
    setFormData(prev => ({
      ...prev,
      coordinates
    }));
    setShowMapPicker(false);
  };

  // Manejar cambio de datos de dirección desde el mapa
  const handleAddressDataChange = async (data) => {
    if (data.department && data.municipality) {
      setFormData(prev => ({
        ...prev,
        department: data.department,
        municipality: data.municipality
      }));
    }
  };

  // Limpiar campos de coordenadas
  const handleClearCoordinates = () => {
    setMapPickerCoordinates(null);
    setFormData(prev => ({
      ...prev,
      coordinates: null
    }));
  };

  // Validar y geocodificar dirección
  const handleValidateAndGeocode = async () => {
    console.log('🔍 [handleValidateAndGeocode] Iniciando validación...', {
      address: formData.address,
      department: formData.department,
      municipality: formData.municipality
    });

    if (!formData.address || !formData.department || !formData.municipality) {
      await showAlert('warning', 'Campos requeridos', 'Por favor completa la dirección, departamento y municipio antes de validar');
      return;
    }

    setIsValidatingAddress(true);
    
    // Mostrar alerta de carga
    const loadingAlert = showAlert('loading', 'Validando dirección...', 'Obteniendo coordenadas precisas');

    try {
      console.log('📋 [handleValidateAndGeocode] Validando en backend...');
      
      // Primero validar en el backend
      const validationResult = await validateCompleteAddress({
        department: formData.department,
        municipality: formData.municipality,
        address: formData.address
      });

      console.log('✅ [handleValidateAndGeocode] Resultado de validación:', validationResult);

      if (validationResult.isValid) {
        console.log('🗺️ [handleValidateAndGeocode] Intentando geocodificar...');
        
        // Si es válida, intentar geocodificar
        const geocodingResult = await geocodeAddress(
          formData.address,
          formData.department,
          formData.municipality
        );

        console.log('📍 [handleValidateAndGeocode] Resultado de geocodificación:', geocodingResult);

        if (geocodingResult.success) {
          setFormData(prev => ({
            ...prev,
            coordinates: geocodingResult.coordinates
          }));
          setMapPickerCoordinates(geocodingResult.coordinates);
          
          await Swal.close(); // Cerrar loading
          await showAlert('success', '¡Perfecto!', 'Dirección validada y coordenadas obtenidas correctamente');
        } else {
          await Swal.close(); // Cerrar loading
          await showAlert('warning', 'Coordenadas no disponibles', 'La dirección es válida pero no se pudieron obtener coordenadas precisas. Puedes seleccionar la ubicación manualmente en el mapa.');
        }
      } else {
        await Swal.close(); // Cerrar loading
        await showAlert('error', 'Dirección inválida', validationResult.message || 'La dirección no cumple con los requisitos de validación');
      }
    } catch (error) {
      console.error('❌ [handleValidateAndGeocode] Error:', error);
      await Swal.close(); // Cerrar loading
      await showAlert('error', 'Error de validación', `Error al validar la dirección: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsValidatingAddress(false);
    }
  };

  // Validar formulario
  const validateForm = () => {
    console.log('🔍 [validateForm] Iniciando validación...', formData);
    
    const errors = {};

    // Validar destinatario
    if (!formData.recipient || !formData.recipient.trim()) {
      errors.recipient = 'El nombre del destinatario es requerido';
    } else if (formData.recipient.trim().length < 2) {
      errors.recipient = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.recipient.trim().length > 50) {
      errors.recipient = 'El nombre no puede exceder 50 caracteres';
    }

    // Validar teléfono
    if (!formData.phoneNumber || !formData.phoneNumber.trim()) {
      errors.phoneNumber = 'El teléfono es requerido';
    } else {
      const cleanPhone = formData.phoneNumber.replace(/[\s\-\(\)]/g, '');
      if (!/^[267]\d{7}$/.test(cleanPhone)) {
        errors.phoneNumber = 'Formato de teléfono inválido. Debe empezar con 2, 6 o 7 y tener 8 dígitos (ej: 7123-4567)';
      }
    }

    // Validar departamento
    if (!formData.department || !formData.department.trim()) {
      errors.department = 'El departamento es requerido';
    }

    // Validar municipio
    if (!formData.municipality || !formData.municipality.trim()) {
      errors.municipality = 'El municipio es requerido';
    } else if (formData.department && formData.municipality) {
      // Validar que el municipio pertenezca al departamento seleccionado
      const municipalities = getMunicipalitiesForDepartment(formData.department);
      if (municipalities.length > 0 && !municipalities.includes(formData.municipality)) {
        errors.municipality = 'El municipio seleccionado no pertenece al departamento elegido';
      }
    }

    // Validar dirección
    if (!formData.address || !formData.address.trim()) {
      errors.address = 'La dirección es requerida';
    } else if (formData.address.trim().length < 10) {
      errors.address = 'La dirección debe ser más específica (mínimo 10 caracteres)';
    } else if (formData.address.trim().length > 200) {
      errors.address = 'La dirección no puede exceder 200 caracteres';
    }

    // Validar etiqueta (opcional pero si se proporciona debe ser válida)
    if (formData.label && formData.label.trim() && formData.label.trim().length > 30) {
      errors.label = 'La etiqueta no puede exceder 30 caracteres';
    }

    // Validar detalles adicionales (opcional pero si se proporciona debe ser válida)
    if (formData.additionalDetails && formData.additionalDetails.trim() && formData.additionalDetails.trim().length > 100) {
      errors.additionalDetails = 'Los detalles adicionales no pueden exceder 100 caracteres';
    }

    console.log('✅ [validateForm] Validación completada. Errores encontrados:', errors);
    
    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    
    console.log(`📋 [validateForm] Formulario ${isValid ? 'válido' : 'inválido'}`);
    
    return isValid;
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo si existe
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Si cambia el departamento, limpiar municipio
    if (field === 'department') {
      setFormData(prev => ({
        ...prev,
        municipality: ''
      }));
    }
  };

  // Abrir modal de edición
  const handleEditAddress = (address) => {
    console.log('✏️ [handleEditAddress] Abriendo modal de edición para:', address._id);
    
    setFormData({
      label: address.label || '',
      recipient: address.recipient || '',
      phoneNumber: address.phoneNumber || '',
      department: address.department || '',
      municipality: address.municipality || '',
      address: address.address || '',
      additionalDetails: address.additionalDetails || '',
      isDefault: address.isDefault || false
    });
    setEditingAddress(address);
    setFormErrors({});
  };

  // Cerrar modales
  const handleCloseModals = () => {
    console.log('🚪 [handleCloseModals] Cerrando modales y reseteando estado...');
    
    // Cerrar modales
    setIsAddModalOpen(false);
    setEditingAddress(null);
    
    // Resetear formulario
    resetForm();
    
    // Asegurar que el estado de envío se resetee
    setIsSubmitting(false);
    
    // Limpiar errores
    setFormErrors({});
    
    console.log('✅ [handleCloseModals] Modales cerrados y estado reseteado');
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevenir envío por defecto
    
    console.log('🚀 [handleSubmit] Iniciando envío del formulario...', {
      formData,
      isSubmitting,
      editingAddress: !!editingAddress
    });

    // Validar formulario
    if (!validateForm()) {
      console.log('❌ [handleSubmit] Validación fallida, errores:', formErrors);
      await showAlert('error', 'Formulario incompleto', 'Por favor corrige los errores marcados en rojo antes de continuar');
      return;
    }

    if (isSubmitting) {
      console.log('⚠️ [handleSubmit] Ya se está enviando, ignorando click');
      await showAlert('info', 'Procesando...', 'Ya se está procesando tu solicitud, por favor espera');
      return;
    }

    setIsSubmitting(true);
    
    // Mostrar alerta de carga
    const loadingAlert = showAlert('loading', 'Guardando dirección...', 'Procesando tu solicitud');

    try {
      // Preparar datos para envío
      const addressData = {
        ...formData,
        phoneNumber: formData.phoneNumber.replace(/[\s\-\(\)]/g, ''), // Limpiar formato
        label: formData.label.trim() || 'Mi dirección',
        location: formData.coordinates ? {
          type: 'Point',
          coordinates: [formData.coordinates.lng, formData.coordinates.lat]
        } : undefined
      };

      console.log('📦 [handleSubmit] Datos preparados para envío:', addressData);

      // Validar que los datos críticos estén presentes
      if (!addressData.recipient || !addressData.phoneNumber || !addressData.department || !addressData.municipality || !addressData.address) {
        throw new Error('Faltan campos requeridos en el formulario');
      }

      let result;
      if (editingAddress) {
        console.log('✏️ [handleSubmit] Actualizando dirección existente...', editingAddress._id);
        result = await updateAddress(editingAddress._id, addressData);
        console.log('✅ [handleSubmit] Dirección actualizada:', result);
      } else {
        console.log('➕ [handleSubmit] Creando nueva dirección...');
        result = await createAddress(addressData);
        console.log('✅ [handleSubmit] Dirección creada:', result);
      }

      // Cerrar alerta de carga
      await Swal.close();

      // Cerrar modal ANTES de mostrar la alerta de éxito
      handleCloseModals();
      
      // Pequeña pausa para asegurar que el modal se cierre completamente
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Recargar direcciones después de crear/actualizar
      console.log('🔄 [handleSubmit] Recargando lista de direcciones...');
      await loadAddresses();
      
      // Mostrar mensaje de éxito DESPUÉS de cerrar el modal
      const action = editingAddress ? 'actualizada' : 'creada';
      await showAlert('success', '¡Éxito!', `Tu dirección ha sido ${action} correctamente`);
      
    } catch (err) {
      console.error('❌ [handleSubmit] Error en formulario:', err);
      
      // Cerrar alerta de carga
      await Swal.close();
      
      // Mostrar error específico
      const errorMessage = err.message || 'Error desconocido al guardar la dirección';
      await showAlert('error', 'Error al guardar', errorMessage);
      
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar eliminación con confirmación
  const handleDeleteAddress = async (addressId) => {
    console.log('🗑️ [handleDeleteAddress] Iniciando eliminación...', addressId);

    const result = await Swal.fire({
      title: '¿Eliminar dirección?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      background: 'rgba(255, 255, 255, 0.95)',
      backdrop: 'rgba(0, 0, 0, 0.4)',
      customClass: {
        popup: 'swal2-popup-rounded',
        confirmButton: 'swal2-confirm-button-rounded',
        cancelButton: 'swal2-cancel-button-rounded'
      },
      buttonsStyling: false,
      zIndex: 10000000
    });

    if (result.isConfirmed) {
      try {
        console.log('✅ [handleDeleteAddress] Confirmado, eliminando...');
        await deleteAddress(addressId);
        setShouldReloadAddresses(true);
        await showAlert('success', 'Dirección eliminada', 'La dirección ha sido eliminada correctamente');
      } catch (err) {
        console.error('❌ [handleDeleteAddress] Error:', err);
        await showAlert('error', 'Error al eliminar', `Error al eliminar la dirección: ${err.message || 'Error desconocido'}`);
      }
    } else {
      console.log('❌ [handleDeleteAddress] Eliminación cancelada');
    }
  };

  // Manejar eliminación desde modal (sin confirmación duplicada)
  const handleDeleteFromModal = async (addressId) => {
    console.log('🗑️ [handleDeleteFromModal] Eliminando desde modal...', addressId);

    try {
      // Cerrar modal primero
      handleCloseModals();
      
      // Pequeña pausa para que el modal se cierre
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Eliminar dirección
      await deleteAddress(addressId);
      
      // Marcar para recargar
      setShouldReloadAddresses(true);
      
      // Mostrar éxito
      await showAlert('success', 'Dirección eliminada', 'La dirección ha sido eliminada correctamente');
      
    } catch (err) {
      console.error('❌ [handleDeleteFromModal] Error:', err);
      await showAlert('error', 'Error al eliminar', `Error al eliminar la dirección: ${err.message || 'Error desconocido'}`);
    }
  };

  // Manejar cambio de dirección predeterminada
  const handleToggleDefault = async (addressId, currentDefault) => {
    console.log('🔄 [handleToggleDefault] Cambiando estado...', { addressId, currentDefault });

    try {
      if (currentDefault) {
        await showAlert('info', 'Dirección activa', 'Esta dirección ya está activa como tu dirección predeterminada');
        return;
      }
      
      console.log('✅ [handleToggleDefault] Estableciendo como predeterminada...');
      await setDefaultAddress(addressId);
      setShouldReloadAddresses(true);
      await showAlert('success', 'Dirección activada', 'Esta dirección ahora es tu dirección predeterminada');
    } catch (err) {
      console.error('❌ [handleToggleDefault] Error:', err);
      await showAlert('error', 'Error al activar', `Error al establecer la dirección predeterminada: ${err.message || 'Error desconocido'}`);
    }
  };

  // Abrir visor de mapa para una dirección específica
  const handleViewAddressOnMap = (address) => {
    console.log('🗺️ [handleViewAddressOnMap] Abriendo mapa para dirección:', address);
    
    if (!address?.location?.coordinates || 
        !Array.isArray(address.location.coordinates) || 
        address.location.coordinates.length !== 2) {
      console.warn('🚨 [handleViewAddressOnMap] Dirección sin coordenadas válidas:', address);
      showAlert('warning', 'Dirección sin coordenadas', 'Esta dirección no tiene coordenadas válidas para mostrar en el mapa');
      return;
    }
    
    setSelectedAddressForMap(address);
    setTimeout(() => {
      setIsMapViewerOpen(true);
    }, 100);
  };

  // Abrir visor de mapa para todas las direcciones
  const handleViewAllAddressesOnMap = () => {
    setSelectedAddressForMap(null);
    setIsMapViewerOpen(true);
  };

  // Cerrar visor de mapa
  const handleCloseMapViewer = () => {
    setIsMapViewerOpen(false);
    setSelectedAddressForMap(null);
  };

  if (isLoading) {
    return (
      <div className="address-container">
        <div className="address-header">
          <h3 className="address-title">Tus direcciones</h3>
        </div>
        <div className="address-underline"></div>
        <div className="loading-state">
          Cargando direcciones...
        </div>
      </div>
    );
  }

  return (
    <div className="address-container">
      <div className="address-header">
        <h3 className="address-title">Tus direcciones</h3>
        <div className="header-buttons">
          {addresses.length > 0 && (
            <button 
              className="address-button map"
              onClick={handleViewAllAddressesOnMap}
              disabled={isSubmitting}
              title="Ver en mapa"
            >
              <MapPin size={16} />
              Mapa
            </button>
          )}
          <button 
            className="address-button edit"
            onClick={loadAddresses}
            disabled={isSubmitting}
            title="Recargar direcciones"
          >
            <ArrowClockwise size={16} />
            Recargar
          </button>
          <button 
            className="btn-add" 
            onClick={() => {
              console.log('➕ [btn-add] Abriendo modal para agregar nueva dirección');
              setIsAddModalOpen(true);
            }}
            disabled={isSubmitting}
            title="Agregar nueva dirección"
          >
            <Plus size={16} />
            Añadir
          </button>
        </div>
      </div>
      <div className="address-underline"></div>

      {error && (
        <div className="error-state">
          {error}
        </div>
      )}

      <div className="address-list">
        {addresses.length === 0 ? (
          <div className="empty-state">
            No tienes direcciones registradas.
            <br />
          </div>
        ) : (
          addresses.map((address) => (
            <div
              key={address._id}
              className={`address-item ${address.isDefault ? 'active' : 'inactive'}`}
            >
              <div className="address-info">
                <p>
                  <strong>
                    {address.isDefault ? 'Activa actualmente' : 'Registrada - Inactiva'}
                  </strong>
                  <br />
                    {address.label && address.label !== 'Mi dirección' && (
                    <span className="address-label">
                    {' '}{address.label}
                    </span>
                  )}
                </p>
              </div>
              
              <div className="address-buttons">
                <button
                  className={`address-button active-toggle ${address.isDefault ? 'active' : ''}`}
                  onClick={() => handleToggleDefault(address._id, address.isDefault)}
                  disabled={isSubmitting}
                  aria-label={address.isDefault ? 'Desactivar' : 'Activar'}
                  title={address.isDefault ? 'Desactivar dirección' : 'Activar dirección'}
                >
                  {address.isDefault ? 'Desactivar' : 'Activar'}
                </button>
                
                <button
                  className="address-button map"
                  onClick={() => handleViewAddressOnMap(address)}
                  disabled={isSubmitting}
                  aria-label="Ver en mapa"
                  title="Ver ubicación en mapa"
                >
                  <Eye size={16} />
                </button>
                
                <button
                  className="address-button edit"
                  onClick={() => handleEditAddress(address)}
                  disabled={isSubmitting}
                  aria-label="Editar"
                  title="Editar dirección"
                >
                  <PencilSimple size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para añadir/editar */}
      <Modal 
        isOpen={isAddModalOpen || !!editingAddress} 
        onClose={handleCloseModals}
        className="address-modal"
      >
        <h3 className="modal-title">
          {editingAddress ? 'Editar dirección' : 'Añadir dirección'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="address-modal-content">
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">
                Etiqueta (opcional)
              </label>
              <input
                type="text"
                placeholder="Casa, Trabajo, etc."
                value={formData.label}
                onChange={(e) => handleInputChange('label', e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Nombre del destinatario *
              </label>
              <input
                type="text"
                placeholder="Nombre completo"
                value={formData.recipient}
                onChange={(e) => handleInputChange('recipient', e.target.value)}
                className={`form-input ${formErrors.recipient ? 'input-error' : ''}`}
              />
              {formErrors.recipient && (
                <small className="error-message">{formErrors.recipient}</small>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Teléfono *
              </label>
              <input
                type="tel"
                placeholder="7123-4567"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className={`form-input ${formErrors.phoneNumber ? 'input-error' : ''}`}
              />
              {formErrors.phoneNumber && (
                <small className="error-message">{formErrors.phoneNumber}</small>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Departamento *
              </label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className={`form-select ${formErrors.department ? 'input-error' : ''}`}
              >
                <option value="">Selecciona un departamento</option>
                {locationData.departments?.map((dept) => (
                  <option key={dept.name} value={dept.name}>
                    {dept.name} (Envío: ${dept.deliveryFee?.toFixed(2) || '0.00'})
                  </option>
                ))}
              </select>
              {formErrors.department && (
                <small className="error-message">{formErrors.department}</small>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Municipio *
              </label>
              <select
                value={formData.municipality}
                onChange={(e) => handleInputChange('municipality', e.target.value)}
                disabled={!formData.department}
                className={`form-select ${formErrors.municipality ? 'input-error' : ''} ${!formData.department ? 'disabled-select' : ''}`}
              >
                <option value="">
                  {formData.department ? 'Selecciona un municipio' : 'Primero selecciona un departamento'}
                </option>
                {formData.department && getMunicipalitiesForDepartment(formData.department).map((municipality) => (
                  <option key={municipality} value={municipality}>
                    {municipality}
                  </option>
                ))}
              </select>
              {formErrors.municipality && (
                <small className="error-message">{formErrors.municipality}</small>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Dirección completa *
              </label>
              <input
                type="text"
                placeholder="Ej: Colonia Centro, Calle Principal #123"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`form-input ${formErrors.address ? 'input-error' : ''}`}
              />
              {formErrors.address && (
                <small className="error-message">{formErrors.address}</small>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Detalles adicionales (opcional)
              </label>
              <input
                type="text"
                placeholder="Referencias, número de casa, etc."
                value={formData.additionalDetails}
                onChange={(e) => handleInputChange('additionalDetails', e.target.value)}
                className={`form-input ${formErrors.additionalDetails ? 'input-error' : ''}`}
              />
              {formErrors.additionalDetails && (
                <small className="error-message">{formErrors.additionalDetails}</small>
              )}
            </div>
          </div>

          <div className="map-section">
            <h4>Ubicación en el mapa</h4>
            

            {/* Mapa siempre visible */}
            <div className="map-picker-container">
              <AddressMapPicker
                center={mapPickerCoordinates || getElSalvadorCenter()}
                zoom={13}
                onLocationSelect={handleLocationFromMap}
                selectedLocation={mapPickerCoordinates}
                height="450px"
                onAddressDataChange={handleAddressDataChange}
                enableAutoFormPopulation={true}
                onClearFields={handleClearCoordinates}
                alwaysVisible={true}
              />
            </div>
          </div>
        </div>

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input 
              type="checkbox"
              className="checkbox-input"
              checked={formData.isDefault}
              onChange={(e) => handleInputChange('isDefault', e.target.checked)}
            />
            Establecer como dirección predeterminada
          </label>
        </div>

          <div className="modal-buttons">
            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-button"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          
          {editingAddress && (
            <button
              type="button"
              onClick={() => handleDeleteFromModal(editingAddress._id)}
              disabled={isSubmitting}
              className="cancel-button"
            >
              Eliminar
            </button>
          )}
          
          {/* Solo mostrar el botón Cancelar cuando NO se esté editando */}
          {!editingAddress && (
            <button
              type="button"
              onClick={handleCloseModals}
              disabled={isSubmitting}
              className="cancel-button"
            >
              Cancelar
            </button>
          )}
          </div>
        </form>
      </Modal>

      {/* Modal para visor de mapa */}
      <Modal 
        isOpen={isMapViewerOpen} 
        onClose={handleCloseMapViewer}
        className="map-viewer-modal"
      >
        <div className="map-viewer-header">
          <h3 className="modal-title">
            {selectedAddressForMap ? 
              `Ubicación: ${selectedAddressForMap.label || 'Mi dirección'}` : 
              'Todas tus direcciones'
            }
          </h3>
          <button 
            className="close-button"
            onClick={handleCloseMapViewer}
          >
            <XCircle size={20} />
          </button>
        </div>
        
        <div className="map-viewer-content">
          <AddressMapViewer
            addresses={addresses || []}
            selectedAddress={selectedAddressForMap}
            onAddressSelect={setSelectedAddressForMap}
            height="500px"
            showControls={true}
            clusterMarkers={true}
            showSidebar={addresses.length > 1}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ShippingAddresses;