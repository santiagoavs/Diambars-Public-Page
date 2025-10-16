// src/components/profile/AddressMapViewer.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Icon, Marker as LeafletMarker, MarkerClusterGroup as LeafletMarkerClusterGroup } from 'leaflet';
import './AddressMapViewer.css';
import { 
  MapPin, 
  ClipboardText, 
  MapPinSimple 
} from '@phosphor-icons/react';

// Iconos personalizados
const createCustomIcon = (color = '#667eea', isDefault = false) => {
  const size = isDefault ? 32 : 24;
  const iconColor = isDefault ? '#f093fb' : color;
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${iconColor}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `)}`,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  });
};

// Componente simple para centrar el mapa (basado en app privada)
const MapCenterController = ({ addresses, selectedAddress }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !addresses || addresses.length === 0) return;

    // Si hay una dirección seleccionada, enfocar en ella
    if (selectedAddress && selectedAddress.location?.coordinates) {
      const coordinates = selectedAddress.location.coordinates;
      if (coordinates.length === 2 && 
          typeof coordinates[0] === 'number' && 
          typeof coordinates[1] === 'number') {
        map.setView([coordinates[1], coordinates[0]], 15);
      }
    } else {
      // Mostrar todas las direcciones válidas
      const validAddresses = addresses.filter(addr => 
        addr?.location?.coordinates && 
        Array.isArray(addr.location.coordinates) && 
        addr.location.coordinates.length === 2 &&
        typeof addr.location.coordinates[0] === 'number' &&
        typeof addr.location.coordinates[1] === 'number'
      );
      
      if (validAddresses.length > 0) {
        const bounds = validAddresses.map(addr => [
          addr.location.coordinates[1], 
          addr.location.coordinates[0]
        ]);
        
        if (bounds.length === 1) {
          map.setView(bounds[0], 13);
        } else {
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      }
    }
  }, [map, addresses, selectedAddress]);
  
  return null;
};


const AddressMapViewer = ({ 
  addresses = [],
  selectedAddress = null,
  onAddressSelect = null,
  height = '500px',
  showControls = true,
  clusterMarkers = true,
  showSidebar = false
}) => {
  const [mapReady, setMapReady] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(selectedAddress?._id || null);
  const [showInactiveAddresses, setShowInactiveAddresses] = useState(true);
  const [showDefaultOnly, setShowDefaultOnly] = useState(false);
  const mapRef = useRef(null);

  // Debug: Log all addresses and their coordinates
  useEffect(() => {
    console.log('🗺️ [AddressMapViewer] Received addresses:', addresses.length);
    addresses.forEach((addr, index) => {
      console.log(`  ${index + 1}. ${addr.label || 'Sin etiqueta'}:`, {
        id: addr._id,
        coordinates: addr.location?.coordinates,
        isDefault: addr.isDefault,
        fullAddress: addr.fullAddress
      });
    });
  }, [addresses]);

  // Validar que las direcciones sean un array válido
  const validAddresses = Array.isArray(addresses) ? addresses : [];

  // Filtrar direcciones según los controles y validar coordenadas
  const filteredAddresses = validAddresses.filter(addr => {
    // Verificar que la dirección tenga coordenadas válidas
    const hasValidCoordinates = addr?.location?.coordinates && 
      Array.isArray(addr.location.coordinates) && 
      addr.location.coordinates.length === 2 &&
      typeof addr.location.coordinates[0] === 'number' &&
      typeof addr.location.coordinates[1] === 'number' &&
      !isNaN(addr.location.coordinates[0]) &&
      !isNaN(addr.location.coordinates[1]) &&
      isFinite(addr.location.coordinates[0]) &&
      isFinite(addr.location.coordinates[1]);

    if (!hasValidCoordinates) {
      console.warn('🚨 [AddressMapViewer] Dirección sin coordenadas válidas:', addr);
      return false;
    }

    // Aplicar filtros de controles
    if (!showInactiveAddresses && !addr.isDefault) return false;
    if (showDefaultOnly && !addr.isDefault) return false;
    return true;
  });

  // Manejar clic en marcador
  const handleMarkerClick = useCallback((address) => {
    setSelectedAddressId(address._id);
    if (onAddressSelect) {
      onAddressSelect(address);
    }
  }, [onAddressSelect]);

  // El Salvador bounds y center (basado en app privada)
  const elSalvadorBounds = [
    [13.148, -90.128], // Southwest
    [14.445, -87.692]  // Northeast
  ];
  const elSalvadorCenter = [13.6929, -89.2182];

  // Efectos
  useEffect(() => {
    if (selectedAddress) {
      setSelectedAddressId(selectedAddress._id);
    }
  }, [selectedAddress]);

  // Efecto para manejar redimensionamiento
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current && mapRef.current.invalidateSize) {
        setTimeout(() => {
          try {
            mapRef.current.invalidateSize();
          } catch (error) {
            console.warn('⚠️ [AddressMapViewer] Error al invalidar tamaño:', error);
          }
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Centro por defecto (El Salvador)
  const defaultCenter = [13.7942, -88.8965];
  const defaultZoom = 8;

  return (
    <div className="address-map-viewer">
      {showControls && (
        <div className="map-controls-viewer">
          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={showInactiveAddresses}
                onChange={(e) => setShowInactiveAddresses(e.target.checked)}
              />
              Mostrar direcciones inactivas
            </label>
          </div>
          
          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={showDefaultOnly}
                onChange={(e) => setShowDefaultOnly(e.target.checked)}
              />
              Solo direcciones predeterminadas
            </label>
          </div>
          
          <div className="control-info">
            <span className="address-count">
              {filteredAddresses.length} dirección{filteredAddresses.length !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
      )}

      <div className="map-container" style={{ height }}>
        {addresses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <MapPinSimple size={48} />
            </div>
            <h3>No hay direcciones para mostrar</h3>
            <p>Agrega direcciones para verlas en el mapa</p>
          </div>
        ) : (
          <MapContainer
            ref={mapRef}
            center={elSalvadorCenter}
            zoom={9}
            style={{ height: '100%', width: '100%' }}
            bounds={elSalvadorBounds}
            maxBounds={elSalvadorBounds}
            maxBoundsViscosity={1.0}
            minZoom={8}
            maxZoom={18}
            zoomControl={true}
            attributionControl={true}
            zoomSnap={0.5}
            zoomDelta={0.5}
            bounceAtZoomLimits={false}
            whenReady={(mapInstance) => {
              setMapReady(true);
              console.log('🗺️ [AddressMapViewer] Mapa listo, invalidando tamaño...');
              // Delay más largo para asegurar renderizado completo
              setTimeout(() => {
                if (mapInstance && mapInstance.invalidateSize) {
                  try {
                    mapInstance.invalidateSize();
                    console.log('✅ [AddressMapViewer] Tamaño invalidado correctamente');
                  } catch (error) {
                    console.warn('⚠️ [AddressMapViewer] Error al invalidar tamaño:', error);
                  }
                }
              }, 300);
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            
            {/* Controlador de centrado */}
            <MapCenterController
              addresses={filteredAddresses}
              selectedAddress={selectedAddress}
            />

            {/* Marcadores simples */}
            {filteredAddresses.map((address) => {
              const coordinates = address?.location?.coordinates;
              if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
                return null;
              }
              
              // MongoDB stores as [longitude, latitude] (GeoJSON format)
              // Leaflet expects [latitude, longitude]
              const [lng, lat] = coordinates;
              if (typeof lng !== 'number' || typeof lat !== 'number' || 
                  isNaN(lng) || isNaN(lat) || !isFinite(lng) || !isFinite(lat)) {
                return null;
              }
              
              const isDefault = address.isDefault;
              const isSelected = selectedAddressId === address._id;
              
              console.log(`📍 [AddressMapViewer] Rendering marker for ${address.label}:`, {
                stored: coordinates,
                leafletPosition: [lat, lng]
              });
              
              return (
                <Marker
                  key={address._id}
                  position={[lat, lng]}  // Correct: [latitude, longitude] for Leaflet
                  icon={createCustomIcon(isSelected ? '#f093fb' : (isDefault ? '#667eea' : '#94a3b8'), isDefault)}
                  eventHandlers={{
                    click: () => handleMarkerClick(address)
                  }}
                >
                  <Popup>
                    <div className="address-popup">
                      <div className="popup-header">
                        <h4>{address.label || 'Mi dirección'}</h4>
                        {isDefault && <span className="default-badge">Predeterminada</span>}
                      </div>
                      
                      <div className="popup-content">
                        <div className="popup-info">
                          <p><strong>Destinatario:</strong> {address.recipient}</p>
                          <p><strong>Teléfono:</strong> {address.phoneNumber}</p>
                          <p><strong>Departamento:</strong> {address.department}</p>
                          <p><strong>Municipio:</strong> {address.municipality}</p>
                        </div>
                        
                        <div className="popup-address">
                          <p><strong>Dirección:</strong></p>
                          <p>{address.address}</p>
                          {address.additionalDetails && (
                            <p><em>{address.additionalDetails}</em></p>
                          )}
                        </div>
                        
                        <div className="popup-coordinates">
                          <p><strong>Coordenadas:</strong></p>
                          <p className="coordinates-text">
                            {lat.toFixed(6)}, {lng.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="popup-actions">
                        <button 
                          className="popup-action-button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                          }}
                        >
                          <ClipboardText size={16} />
                          Copiar Coordenadas
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {showSidebar && (
        <div className="map-sidebar">
          <div className="sidebar-header">
            <h4>Direcciones</h4>
          </div>
          
          <div className="sidebar-content">
            {filteredAddresses.map((address) => (
              <div
                key={address._id}
                className={`sidebar-address-item ${selectedAddressId === address._id ? 'selected' : ''}`}
                onClick={() => handleMarkerClick(address)}
              >
                <div className="address-item-header">
                  <h5>{address.label || 'Mi dirección'}</h5>
                  {address.isDefault && <span className="default-badge">Predeterminada</span>}
                </div>
                
                <div className="address-item-content">
                  <p><strong>{address.recipient}</strong></p>
                  <p>{address.department}, {address.municipality}</p>
                  <p className="address-text">{address.address}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressMapViewer;
