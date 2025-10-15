// src/components/profile/AddressMapPicker.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useGeolocation } from '../../hooks/useGeolocation';
import { addressService } from '../../api/addressService';
import './AddressMapPicker.css';
import { 
  House, 
  ArrowsOut, 
  ArrowsIn,
  CheckCircle,
  XCircle,
  Spinner,
  MapPin,
  MapPinLine,
  Plus
} from '@phosphor-icons/react';

// Icono personalizado para el marcador
const customIcon = new Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Componente para manejar eventos del mapa
const MapClickHandler = ({ onLocationSelect, disabled, isLocationLocked }) => {
  useMapEvents({
    click: (e) => {
      if (!disabled && !isLocationLocked) {
        const { lat, lng } = e.latlng;
        onLocationSelect({ lat, lng });
      }
    }
  });
  return null;
};

// Componente para detectar interacción manual del usuario (basado en app privada)
const MapInteractionHandler = ({ onUserInteraction }) => {
  useMapEvents({
    dragstart: () => {
      console.log('🗺️ [InteractionHandler] Usuario comenzó a arrastrar el mapa');
      onUserInteraction('drag');
    },
    drag: () => {
      // Reportar continuamente durante el drag para mantener la protección
      onUserInteraction('drag');
    },
    movestart: (e) => {
      // Solo reportar si el movimiento no es por código programático
      if (!e.target._animatingZoom && !e.target._moving && !e.target._mapPane?.classList?.contains('leaflet-zoom-anim')) {
        console.log('🗺️ [InteractionHandler] Usuario comenzó a mover el mapa manualmente');
        onUserInteraction('move');
      }
    },
    move: (e) => {
      // Detectar movimiento manual continuo
      if (!e.target._animatingZoom && !e.target._moving) {
        onUserInteraction('move');
      }
    },
    zoomstart: (e) => {
      console.log('🗺️ [InteractionHandler] Usuario comenzó a hacer zoom');
      onUserInteraction('zoom');
    },
    zoom: () => {
      // Reportar continuamente durante el zoom
      onUserInteraction('zoom');
    },
    click: () => {
      // Cualquier click indica interacción del usuario
      onUserInteraction('click');
    }
  });
  return null;
};

// Componente para centrar el mapa (basado en app privada)
const MapCenterController = ({ center, shouldCenter, zoom = 15 }) => {
  const map = useMap();
  
  useEffect(() => {
    if (shouldCenter && center && map) {
      console.log('🗺️ [MapCenterController] Centrando mapa en:', center, 'con zoom:', zoom);
      
      // Verificar que el mapa esté listo
      if (map.getContainer()) {
        map.flyTo([center.lat, center.lng], zoom, {
          animate: true,
          duration: 0.8,
          easeLinearity: 0.2
        });
        
        // Invalidación más conservadora del tamaño
        setTimeout(() => {
          if (map.getContainer()) {
            try {
              map.invalidateSize({ animate: false });
            } catch (error) {
              console.warn('⚠️ [MapCenterController] Error al invalidar tamaño:', error);
            }
          }
        }, 200);
      }
    }
  }, [map, center, shouldCenter, zoom]);
  
  return null;
};

// Componente para el mapa en pantalla completa
const FullscreenMap = ({ 
  currentLocation, 
  mapRef, 
  mapReady, 
  setMapReady, 
  handleLocationSelect, 
  disabled, 
  shouldCenter, 
  isFullscreen, 
  currentZoom, 
  userInteracting, 
  handleUserInteraction, 
  addressInfo,
  onExitFullscreen,
  handleConfirmLocation,
  onLocationSelect,
  showSetDefaultButton,
  userId,
  handleSetAsDefault,
  settingAsDefault,
  isLocationLocked,
  handleNewLocation
}) => (
  <div className="fullscreen-map-container">
    <div className="fullscreen-map-overlay">
      <div className="fullscreen-map-header">
        <div className="fullscreen-map-header-content">
          <h3 className="fullscreen-map-title">Seleccionar Ubicación - Pantalla Completa</h3>
          <button 
            type="button"
            className="fullscreen-exit-button"
            onClick={onExitFullscreen}
            title="Salir de pantalla completa (ESC)"
          >
            <XCircle size={20} />
            Salir
          </button>
        </div>
      </div>

      <div className="fullscreen-map-body">
        <MapContainer
          ref={mapRef}
          center={currentLocation}
          zoom={currentZoom}
          style={{ height: '100%', width: '100%' }}
          whenReady={(mapInstance) => {
            setMapReady(true);
            console.log('🗺️ [FullscreenMap] Mapa listo, invalidando tamaño...');
            // Delay más largo para asegurar renderizado completo
            setTimeout(() => {
              if (mapInstance && mapInstance.invalidateSize) {
                try {
                  mapInstance.invalidateSize();
                  console.log('✅ [FullscreenMap] Tamaño invalidado correctamente');
                } catch (error) {
                  console.warn('⚠️ [FullscreenMap] Error al invalidar tamaño:', error);
                }
              }
            }, 300);
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler 
            onLocationSelect={handleLocationSelect}
            disabled={disabled}
            isLocationLocked={isLocationLocked}
          />
          
          <MapCenterController 
            center={currentLocation}
            shouldCenter={shouldCenter}
            zoom={isFullscreen ? 12 : 15}
          />
          
          <MapInteractionHandler 
            onUserInteraction={handleUserInteraction}
          />
          
          {currentLocation && (
            <Marker 
              position={[currentLocation.lat, currentLocation.lng]}
              icon={customIcon}
            >
              <Popup>
                <div className="marker-popup">
                  <h4>Ubicación Seleccionada</h4>
                  <p>Lat: {currentLocation.lat.toFixed(6)}</p>
                  <p>Lng: {currentLocation.lng.toFixed(6)}</p>
                  {addressInfo && (
                    <p>{addressInfo.fullAddress}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="fullscreen-map-footer">
        <div className="fullscreen-coordinates-info">
          <div className="fullscreen-coordinates-text">
            <strong>Coordenadas:</strong> {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
          </div>
        </div>
        
        <div className="fullscreen-map-actions">
          {!isLocationLocked && (
            <button 
              className="fullscreen-confirm-button"
              onClick={handleConfirmLocation}
              disabled={!currentLocation || disabled}
            >
              Confirmar Ubicación
            </button>
          )}
          
          {isLocationLocked && (
            <button 
              className="fullscreen-new-location-button"
              onClick={handleNewLocation}
            >
              <MapPinLine size={16} />
              Seleccionar Nueva Ubicación
            </button>
          )}
          
          {showSetDefaultButton && userId && (
            <button 
              className="fullscreen-set-default-button"
              onClick={handleSetAsDefault}
              disabled={!currentLocation || settingAsDefault || disabled}
            >
              {settingAsDefault ? 'Guardando...' : 'Establecer como Predeterminada'}
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

const AddressMapPicker = ({ 
  center = { lat: 13.7942, lng: -88.8965 }, // Centro de El Salvador
  zoom = 10,
  onLocationSelect,
  selectedLocation,
  disabled = false,
  height = '400px',
  onSetAsDefault,
  isDefaultLocation = false,
  showSetDefaultButton = true,
  userId,
  selectedDepartment,
  selectedMunicipality,
  autoCenterOnLocationChange = true,
  onAddressDataChange,
  enableAutoFormPopulation = true,
  onClearFields,
  onClearAllFormFields
}) => {
  const [currentLocation, setCurrentLocation] = useState(center);
  const [crosshairMode, setCrosshairMode] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);
  const [shouldCenter, setShouldCenter] = useState(false);
  const [addressInfo, setAddressInfo] = useState(null);
  const [deliveryTimeInfo, setDeliveryTimeInfo] = useState(null);
  const [settingAsDefault, setSettingAsDefault] = useState(false);
  const [showLocationPanel, setShowLocationPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [showConfirmationToast, setShowConfirmationToast] = useState(false);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [lastAutoCenter, setLastAutoCenter] = useState(null);
  const [lastProcessedLocation, setLastProcessedLocation] = useState(null);
  const [userInteracting, setUserInteracting] = useState(false);
  const [isLocationLocked, setIsLocationLocked] = useState(false);

  const mapRef = useRef(null);
  const reverseGeocodingTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);

  const { 
    reverseGeocode, 
    isWithinElSalvador, 
    getElSalvadorCenter,
    getElSalvadorBounds,
    loading: geocodingLoading 
  } = useGeolocation();

  // Manejar selección de ubicación
  const handleLocationSelect = useCallback(async (coordinates) => {
    if (disabled || isProcessingRef.current || isLocationLocked) return;
    
    isProcessingRef.current = true;
    setCurrentLocation(coordinates);
    setError(null);
    setShowLocationPanel(true);
    setIsLocationLocked(false); // Resetear el lock al seleccionar nueva ubicación
    
    console.log('🗺️ [AddressMapPicker] Ubicación seleccionada:', coordinates);
    
    // Verificar si está dentro de El Salvador
    if (!isWithinElSalvador(coordinates.lat, coordinates.lng)) {
      setError('La ubicación seleccionada está fuera de El Salvador');
      isProcessingRef.current = false;
      return;
    }
    
    try {
      // Reverse geocoding para obtener información de la dirección
      const geocodingResult = await reverseGeocode(coordinates.lat, coordinates.lng);
      
      if (geocodingResult.success) {
        setAddressInfo(geocodingResult.address);
        
        // Calcular tiempo de entrega estimado
        const deliveryTime = calculateDeliveryTime(coordinates);
        setDeliveryTimeInfo(deliveryTime);
        
        // Auto-poblar formulario si está habilitado
        if (enableAutoFormPopulation && onAddressDataChange) {
          setIsAutoPopulating(true);
          
          // Extraer departamento y municipio de la información de geocoding
          const department = extractDepartmentFromAddress(geocodingResult.address);
          const municipality = extractMunicipalityFromAddress(geocodingResult.address);
          
          if (department && municipality) {
            await onAddressDataChange({
              coordinates,
              department,
              municipality,
              estimatedDeliveryTime: deliveryTime.estimatedTime
            });
          }
          
          setIsAutoPopulating(false);
        }
        
        // Llamar callback del componente padre
        if (onLocationSelect) {
          onLocationSelect(coordinates);
        }
      } else {
        setError('No se pudo obtener información de la dirección');
      }
    } catch (err) {
      console.error('❌ [AddressMapPicker] Error en reverse geocoding:', err);
      setError('Error al obtener información de la ubicación');
    } finally {
      isProcessingRef.current = false;
      setLastProcessedLocation(coordinates);
    }
  }, [disabled, isWithinElSalvador, reverseGeocode, enableAutoFormPopulation, onAddressDataChange, onLocationSelect, isLocationLocked]);

  // Confirmar ubicación seleccionada - SOLO BLOQUEAR, NO HACER POST
  const handleConfirmLocation = useCallback(() => {
    if (currentLocation) {
      setIsLocationLocked(true);
      setShowConfirmationToast(true);
      
      console.log('🔒 [AddressMapPicker] Ubicación confirmada y bloqueada:', currentLocation);
      
      // Ocultar toast después de 3 segundos
      setTimeout(() => {
        setShowConfirmationToast(false);
      }, 3000);
    }
  }, [currentLocation]);

  // Seleccionar nueva ubicación - DESBLOQUEAR Y LIMPIAR
  const handleNewLocation = useCallback(() => {
    setIsLocationLocked(false);
    setCurrentLocation(center);
    setAddressInfo(null);
    setDeliveryTimeInfo(null);
    setError(null);
    setShowLocationPanel(false);
    
    console.log('🔓 [AddressMapPicker] Permitir nueva selección de ubicación');
    
    if (onClearFields) {
      onClearFields();
    }
  }, [center, onClearFields]);

  // Establecer como ubicación predeterminada
  const handleSetAsDefault = useCallback(async () => {
    if (!currentLocation || !userId) return;
    
    setSettingAsDefault(true);
    try {
      const coordinatesData = {
        coordinates: currentLocation,
        department: selectedDepartment || addressInfo?.state,
        municipality: selectedMunicipality || addressInfo?.city,
        userId
      };
      
      await addressService.setDefaultLocationFromCoordinates(coordinatesData);
      
      if (onSetAsDefault) {
        onSetAsDefault(currentLocation);
      }
      
      setShowConfirmationToast(true);
    } catch (err) {
      console.error('❌ [AddressMapPicker] Error estableciendo ubicación predeterminada:', err);
      setError('Error al establecer ubicación predeterminada');
    } finally {
      setSettingAsDefault(false);
    }
  }, [currentLocation, userId, selectedDepartment, selectedMunicipality, addressInfo, onSetAsDefault]);

  // Calcular tiempo de entrega estimado
  const calculateDeliveryTime = useCallback((coordinates) => {
    const center = getElSalvadorCenter();
    const distance = calculateDistance(coordinates.lat, coordinates.lng, center.lat, center.lng);
    
    // Tiempo estimado basado en distancia (en horas)
    let estimatedTime;
    if (distance < 10) {
      estimatedTime = '1-2 horas';
    } else if (distance < 30) {
      estimatedTime = '2-4 horas';
    } else if (distance < 50) {
      estimatedTime = '4-6 horas';
    } else {
      estimatedTime = '6-8 horas';
    }
    
    return {
      distance: Math.round(distance),
      estimatedTime,
      unit: 'km'
    };
  }, [getElSalvadorCenter]);

  // Calcular distancia entre dos puntos
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Extraer departamento de la información de geocoding
  const extractDepartmentFromAddress = (address) => {
    if (!address) return null;
    
    // Mapear estados a departamentos de El Salvador
    const stateToDepartment = {
      'San Salvador': 'San Salvador',
      'La Libertad': 'La Libertad',
      'San Miguel': 'San Miguel',
      'Santa Ana': 'Santa Ana',
      'Sonsonate': 'Sonsonate',
      'Ahuachapán': 'Ahuachapán',
      'Chalatenango': 'Chalatenango',
      'Cuscatlán': 'Cuscatlán',
      'La Paz': 'La Paz',
      'Cabañas': 'Cabañas',
      'San Vicente': 'San Vicente',
      'Usulután': 'Usulután',
      'Morazán': 'Morazán',
      'La Unión': 'La Unión'
    };
    
    return stateToDepartment[address.state] || address.state;
  };

  // Extraer municipio de la información de geocoding
  const extractMunicipalityFromAddress = (address) => {
    if (!address) return null;
    return address.city || address.town || address.village || address.suburb;
  };

  // Manejar interacción manual del usuario con el mapa (basado en app privada)
  const handleUserInteraction = (interactionType) => {
    console.log(`🗺️ [UserInteraction] Detectada interacción: ${interactionType}`);
    setUserInteracting(true);
    
    // Tiempo más largo para evitar auto-centrado no deseado durante navegación
    const resetTimeout = interactionType === 'drag' ? 10000 : 7000; // 10s para drag, 7s para otros
    
    // Limpiar timeout anterior si existe
    if (window.userInteractionTimeout) {
      clearTimeout(window.userInteractionTimeout);
    }
    
    // Resetear el flag después de un tiempo
    window.userInteractionTimeout = setTimeout(() => {
      setUserInteracting(false);
      console.log('🗺️ [UserInteraction] Permitiendo auto-centrado nuevamente');
    }, resetTimeout);
  };

  // Centrar mapa en El Salvador
  const handleCenterToElSalvador = useCallback(() => {
    const center = getElSalvadorCenter();
    setCurrentLocation(center);
    setShouldCenter(true);
  }, [getElSalvadorCenter]);

  // Alternar pantalla completa REAL del navegador - VERDADERAMENTE pantalla completa
  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!isFullscreen) {
        setIsFullscreen(true);
        
        // Auto-centrar después de entrar en pantalla completa
        setTimeout(() => {
          if (mapRef.current) {
            try {
              mapRef.current.invalidateSize();
              if (currentLocation) {
                mapRef.current.setView([currentLocation.lat, currentLocation.lng], 15);
              }
            } catch (error) {
              console.warn('⚠️ [AddressMapPicker] Error al auto-centrar en pantalla completa:', error);
            }
          }
        }, 300);
      } else {
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('❌ [AddressMapPicker] Error en pantalla completa:', error);
      setIsFullscreen(false);
    }
  }, [isFullscreen, currentLocation]);

  // Salir de pantalla completa
  const handleExitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  // Limpiar ubicación
  const handleClearLocation = useCallback(() => {
    setCurrentLocation(center);
    setAddressInfo(null);
    setDeliveryTimeInfo(null);
    setError(null);
    setShowLocationPanel(false);
    setIsLocationLocked(false);
    
    if (onClearFields) {
      onClearFields();
    }
  }, [center, onClearFields]);

  // Efecto para manejar tecla ESC en pantalla completa
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        handleExitFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevenir scroll del body cuando está en pantalla completa
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, handleExitFullscreen]);

  // Efectos
  useEffect(() => {
    if (selectedLocation && !userInteracting) {
      setCurrentLocation(selectedLocation);
      setShouldCenter(true);
    }
  }, [selectedLocation, userInteracting]);

  useEffect(() => {
    if (shouldCenter && mapReady) {
      setShouldCenter(false);
    }
  }, [shouldCenter, mapReady]);

  // Efecto para centrar automáticamente cuando cambie currentLocation (OPTIMIZADO)
  useEffect(() => {
    if (currentLocation && !crosshairMode && mapReady && !userInteracting) {
      console.log('🗺️ [AddressMapPicker] Evaluando auto-centrado:', {
        currentLocation: !!currentLocation,
        crosshairMode,
        mapReady,
        userInteracting
      });
      
      // Solo auto-centrar si la ubicación cambió significativamente (más de 100m)
      if (selectedLocation && currentLocation) {
        const distance = calculateDistance(
          selectedLocation.lat, selectedLocation.lng,
          currentLocation.lat, currentLocation.lng
        );
        
        // Solo centrar si el cambio es significativo y el usuario no está interactuando
        if (distance > 0.1) { // 100 metros
          console.log('🗺️ [AddressMapPicker] Auto-centrando por cambio significativo de ubicación');
          setShouldCenter(true);
          setTimeout(() => setShouldCenter(false), 300);
        }
      } else {
        // Primera vez o no hay ubicación previa
        console.log('🗺️ [AddressMapPicker] Auto-centrando por nueva ubicación inicial');
        setShouldCenter(true);
        setTimeout(() => setShouldCenter(false), 300);
      }
    } else if (userInteracting) {
      console.log('🗺️ [AddressMapPicker] Auto-centrado OMITIDO - usuario interactuando con el mapa');
    }
  }, [currentLocation, crosshairMode, mapReady, selectedLocation, userInteracting]);

  // Renderizar el mapa en pantalla completa como portal
  const fullscreenMapPortal = isFullscreen && createPortal(
    <FullscreenMap
      currentLocation={currentLocation}
      mapRef={mapRef}
      mapReady={mapReady}
      setMapReady={setMapReady}
      handleLocationSelect={handleLocationSelect}
      disabled={disabled}
      shouldCenter={shouldCenter}
      isFullscreen={isFullscreen}
      currentZoom={currentZoom}
      userInteracting={userInteracting}
      handleUserInteraction={handleUserInteraction}
      addressInfo={addressInfo}
      onExitFullscreen={handleExitFullscreen}
      handleConfirmLocation={handleConfirmLocation}
      onLocationSelect={onLocationSelect}
      showSetDefaultButton={showSetDefaultButton}
      userId={userId}
      handleSetAsDefault={handleSetAsDefault}
      settingAsDefault={settingAsDefault}
      isLocationLocked={isLocationLocked}
      handleNewLocation={handleNewLocation}
    />,
    document.body
  );

  return (
    <>
      <div className={`address-map-picker ${isFullscreen ? 'fullscreen' : ''} ${isLocationLocked ? 'location-locked' : ''}`}>
        <div className="map-overlay">
          <div className="map-header">
            <div className="map-header-content">
              <h3 className="map-title">Seleccionar Ubicación</h3>
              <div className="map-controls">
                <button 
                  type="button"
                  className="map-control-button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCenterToElSalvador();
                  }}
                  title="Centrar en El Salvador"
                >
                  <House size={16} />
                </button>
                
                {isLocationLocked && (
                  <button 
                    type="button"
                    className="map-control-button new-location-button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNewLocation();
                    }}
                    title="Seleccionar Nueva Ubicación"
                  >
                    <MapPinLine size={16} />
                  </button>
                )}
                
                <button 
                  type="button"
                  className="map-control-button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleFullscreen();
                  }}
                  title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                >
                  {isFullscreen ? <ArrowsIn size={16} /> : <ArrowsOut size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="map-body" style={{ height }}>
            {error && (
              <div className="error-alert">
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)}>
                  <XCircle size={16} />
                </button>
              </div>
            )}
            
            {!isFullscreen && (
              <MapContainer
                ref={mapRef}
                center={currentLocation}
                zoom={currentZoom}
                style={{ height: '100%', width: '100%' }}
                whenReady={(mapInstance) => {
                  setMapReady(true);
                  console.log('🗺️ [AddressMapPicker] Mapa listo, invalidando tamaño...');
                  // Delay más largo para asegurar renderizado completo
                  setTimeout(() => {
                    if (mapInstance && mapInstance.invalidateSize) {
                      try {
                        mapInstance.invalidateSize();
                        console.log('✅ [AddressMapPicker] Tamaño invalidado correctamente');
                      } catch (error) {
                        console.warn('⚠️ [AddressMapPicker] Error al invalidar tamaño:', error);
                      }
                    }
                  }, 300);
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapClickHandler 
                  onLocationSelect={handleLocationSelect}
                  disabled={disabled}
                  isLocationLocked={isLocationLocked}
                />
                
                <MapCenterController 
                  center={currentLocation}
                  shouldCenter={shouldCenter}
                  zoom={isFullscreen ? 12 : 15}
                />
                
                <MapInteractionHandler 
                  onUserInteraction={handleUserInteraction}
                />
                
                {currentLocation && (
                  <Marker 
                    position={[currentLocation.lat, currentLocation.lng]}
                    icon={customIcon}
                  >
                    <Popup>
                      <div className="marker-popup">
                        <h4>Ubicación Seleccionada</h4>
                        <p>Lat: {currentLocation.lat.toFixed(6)}</p>
                        <p>Lng: {currentLocation.lng.toFixed(6)}</p>
                        {addressInfo && (
                          <p>{addressInfo.fullAddress}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            )}
          </div>

          <div className="map-footer">
            <div className="coordinates-info">
              <div className="coordinates-text">
                <strong>Coordenadas:</strong> {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </div>
            </div>
            
            <div className="map-actions">
              {!isLocationLocked && currentLocation && (
                <button 
                  className="confirm-button"
                  onClick={handleConfirmLocation}
                  disabled={disabled}
                >
                  <CheckCircle size={16} />
                  Confirmar Ubicación
                </button>
              )}
              
              {isLocationLocked && (
                <div className="location-locked-status">
                  <CheckCircle size={16} className="locked-icon" />
                  <span>Ubicación Confirmada</span>
                </div>
              )}
              
              {showSetDefaultButton && userId && (
                <button 
                  className="set-default-button"
                  onClick={handleSetAsDefault}
                  disabled={!currentLocation || settingAsDefault || disabled}
                >
                  {settingAsDefault ? 'Guardando...' : 'Establecer como Predeterminada'}
                </button>
              )}
            </div>
          </div>

          {showConfirmationToast && (
            <div className="confirmation-toast">
              <CheckCircle size={20} />
              Ubicación confirmada
            </div>
          )}

          {geocodingLoading && (
            <div className="loading-overlay">
              <Spinner size={40} className="animate-spin" />
              <p>Obteniendo información de la ubicación...</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel de información de ubicación - FUERA del mapa, debajo */}
      <div className="location-info-panel-container">
        <div className={`location-info-panel ${addressInfo ? 'visible' : 'hidden'}`}>
          <div className="location-info-header">
            <h4>Información de la Ubicación</h4>
            <button 
              type="button"
              className="close-location-info"
              onClick={() => setShowLocationPanel(false)}
              title="Cerrar información"
            >
              <XCircle size={16} />
            </button>
          </div>
          
          {addressInfo && (
            <div className="location-info-content">
              <div className="location-detail">
                <span className="detail-label">Dirección:</span>
                <span className="detail-value">{addressInfo.fullAddress}</span>
              </div>
              
              {deliveryTimeInfo && (
                <div className="location-detail">
                  <span className="detail-label">Tiempo de entrega estimado:</span>
                  <span className="detail-value delivery-time">{deliveryTimeInfo.estimatedTime}</span>
                </div>
              )}
              
              <div className="location-detail">
                <span className="detail-label">Coordenadas:</span>
                <span className="detail-value coordinates">
                  {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Portal para pantalla completa */}
      {fullscreenMapPortal}
    </>
  );
};

export default AddressMapPicker;
