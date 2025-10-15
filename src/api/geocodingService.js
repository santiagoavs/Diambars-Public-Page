// src/api/geocodingService.js
// Servicio para geocoding usando Nominatim (OpenStreetMap) con manejo de CORS

export const geocodingService = {
  // Convertir dirección a coordenadas (geocoding)
  geocodeAddress: async (address, department = '', municipality = '') => {
    try {
      console.log('🌍 [geocodingService] Geocoding dirección:', { address, department, municipality });
      
      // Construir query string para Nominatim
      const query = [
        address,
        municipality,
        department,
        'El Salvador'
      ].filter(Boolean).join(', ');
      
      // Usar proxy en desarrollo, URL directa en producción
      const isDevelopment = import.meta.env.DEV;
      const baseUrl = isDevelopment 
        ? '/nominatim' 
        : 'https://nominatim.openstreetmap.org';
      
      const url = `${baseUrl}/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=sv`;
      
      const response = await fetch(url, {
        mode: 'cors',
        headers: {
          'User-Agent': 'Diambars-Sublim-App/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error en geocoding: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const coordinates = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        
        console.log('✅ [geocodingService] Coordenadas encontradas:', coordinates);
        return {
          success: true,
          coordinates,
          address: result.display_name,
          confidence: result.importance || 0
        };
      } else {
        console.warn('⚠️ [geocodingService] No se encontraron coordenadas para:', query);
        return {
          success: false,
          message: 'No se pudo encontrar la ubicación'
        };
      }
    } catch (error) {
      console.error('❌ [geocodingService] Error en geocoding:', error);
      return {
        success: false,
        message: 'Error al obtener coordenadas de la dirección'
      };
    }
  },

  // Convertir coordenadas a dirección (reverse geocoding) - CON FALLBACK
  reverseGeocode: async (lat, lng) => {
    try {
      console.log('🌍 [geocodingService] Reverse geocoding coordenadas:', { lat, lng });
      
      // Usar proxy en desarrollo, URL directa en producción
      const isDevelopment = import.meta.env.DEV;
      const baseUrl = isDevelopment 
        ? '/nominatim' 
        : 'https://nominatim.openstreetmap.org';
      
      const url = `${baseUrl}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      
      const response = await fetch(url, {
        mode: 'cors',
        headers: {
          'User-Agent': 'Diambars-Sublim-App/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error en reverse geocoding: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        
        // Extraer información estructurada
        const addressInfo = {
          fullAddress: data.display_name,
          street: address.road || address.pedestrian || '',
          houseNumber: address.house_number || '',
          suburb: address.suburb || address.neighbourhood || '',
          city: address.city || address.town || address.village || '',
          state: address.state || '',
          country: address.country || '',
          postcode: address.postcode || ''
        };
        
        console.log('✅ [geocodingService] Dirección encontrada:', addressInfo);
        return {
          success: true,
          address: addressInfo,
          coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }
        };
      } else {
        console.warn('⚠️ [geocodingService] No se encontró dirección para:', { lat, lng });
        return {
          success: false,
          message: 'No se pudo encontrar la dirección'
        };
      }
    } catch (error) {
      console.error('❌ [geocodingService] Error en reverse geocoding:', error);
      
      // Fallback: generar información básica sin API
      console.log('🔄 [geocodingService] Usando fallback para coordenadas:', { lat, lng });
      
      // Determinar región aproximada basada en coordenadas
      const regionInfo = geocodingService.getRegionFromCoordinates(lat, lng);
      
      return {
        success: true,
        address: {
          fullAddress: `Ubicación en ${regionInfo.department}, El Salvador`,
          street: '',
          houseNumber: '',
          suburb: regionInfo.municipality || '',
          city: regionInfo.municipality || '',
          state: regionInfo.department,
          country: 'El Salvador',
          postcode: ''
        },
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
        isFallback: true
      };
    }
  },

  // Fallback: determinar región aproximada basada en coordenadas
  getRegionFromCoordinates: (lat, lng) => {
    // Regiones aproximadas de El Salvador basadas en coordenadas
    const regions = [
      { department: 'San Salvador', municipality: 'San Salvador', bounds: { north: 13.8, south: 13.6, east: -89.0, west: -89.3 } },
      { department: 'La Libertad', municipality: 'Santa Tecla', bounds: { north: 13.9, south: 13.4, east: -89.2, west: -89.8 } },
      { department: 'San Miguel', municipality: 'San Miguel', bounds: { north: 13.6, south: 13.3, east: -88.1, west: -88.3 } },
      { department: 'Santa Ana', municipality: 'Santa Ana', bounds: { north: 14.1, south: 13.9, east: -89.5, west: -89.7 } },
      { department: 'Sonsonate', municipality: 'Sonsonate', bounds: { north: 13.8, south: 13.6, east: -89.7, west: -90.0 } },
      { department: 'Ahuachapán', municipality: 'Ahuachapán', bounds: { north: 14.0, south: 13.8, east: -90.0, west: -90.2 } },
      { department: 'Chalatenango', municipality: 'Chalatenango', bounds: { north: 14.2, south: 14.0, east: -88.9, west: -89.2 } },
      { department: 'Cuscatlán', municipality: 'Cojutepeque', bounds: { north: 13.8, south: 13.6, east: -89.0, west: -89.3 } },
      { department: 'La Paz', municipality: 'Zacatecoluca', bounds: { north: 13.6, south: 13.3, east: -89.0, west: -89.3 } },
      { department: 'Cabañas', municipality: 'Sensuntepeque', bounds: { north: 14.0, south: 13.7, east: -88.6, west: -88.9 } },
      { department: 'San Vicente', municipality: 'San Vicente', bounds: { north: 13.7, south: 13.5, east: -88.7, west: -89.0 } },
      { department: 'Usulután', municipality: 'Usulután', bounds: { north: 13.4, south: 13.2, east: -88.3, west: -88.6 } },
      { department: 'Morazán', municipality: 'San Francisco Gotera', bounds: { north: 13.8, south: 13.6, east: -88.1, west: -88.4 } },
      { department: 'La Unión', municipality: 'La Unión', bounds: { north: 13.4, south: 13.1, east: -87.8, west: -88.1 } }
    ];

    // Buscar la región que contiene las coordenadas
    for (const region of regions) {
      const { bounds } = region;
      if (lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east) {
        return region;
      }
    }

    // Si no se encuentra, retornar información genérica
    return {
      department: 'El Salvador',
      municipality: 'Ubicación'
    };
  },

  // Verificar si las coordenadas están dentro de El Salvador
  isWithinElSalvador: (lat, lng) => {
    // Límites aproximados de El Salvador
    const EL_SALVADOR_BOUNDS = {
      north: 14.45,
      south: 13.1,
      east: -87.7,
      west: -90.1
    };
    
    return (
      lat >= EL_SALVADOR_BOUNDS.south &&
      lat <= EL_SALVADOR_BOUNDS.north &&
      lng >= EL_SALVADOR_BOUNDS.west &&
      lng <= EL_SALVADOR_BOUNDS.east
    );
  },

  // Obtener centro de El Salvador
  getElSalvadorCenter: () => ({
    lat: 13.7942,
    lng: -88.8965
  }),

  // Obtener límites de El Salvador para mapas
  getElSalvadorBounds: () => [
    [13.1, -90.1], // Southwest
    [14.45, -87.7] // Northeast
  ]
};

export default geocodingService;