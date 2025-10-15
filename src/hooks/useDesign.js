// src/hooks/useDesigns.js - HOOK PARA GESTIÓN DE DISEÑOS DE USUARIOS PÚBLICOS
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/authContext';
import DesignService from '../api/designService';

const useDesigns = () => {
  // ==================== ESTADOS ====================
  const { isAuthenticated, user } = useAuth();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ // ⚡ Pagination state
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // ==================== UTILIDADES ====================

  // Manejar errores de manera consistente
  const handleError = useCallback((error, defaultMessage = 'Error en operación de diseños') => {
    console.error('❌ [useDesigns] Error:', error);
    
    let errorMessage = defaultMessage;
    
    if (error?.message) {
      errorMessage = error.message;
    }
    
    // Mostrar error específico según el tipo
    if (error?.status === 401) {
      errorMessage = 'Debes iniciar sesión para realizar esta acción';
    } else if (error?.status === 404) {
      errorMessage = 'Diseño no encontrado';
    } else if (error?.status === 403) {
      errorMessage = 'No tienes permisos para realizar esta acción';
    } else if (error?.status === 400) {
      errorMessage = error.message || 'Datos inválidos';
    }
    
    setError(errorMessage);
    return errorMessage;
  }, []);

  // Formatear diseño
  const formatDesign = useCallback((design, minimal = false) => {
    return DesignService.formatDesign(design, minimal);
  }, []);

  // ==================== FUNCIONES PRINCIPALES ====================

  // Obtener diseños del usuario actual
  const fetchUserDesigns = useCallback(async (options = {}) => {
    if (!isAuthenticated) {
      console.log('❌ [useDesigns] Usuario no autenticado');
      setDesigns([]);
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🎨 [useDesigns] Obteniendo diseños del usuario:', options);
      
      const response = await DesignService.getUserDesigns(options);
      
      if (!response.success || !Array.isArray(response.data?.designs)) {
        throw new Error("Formato de respuesta inválido");
      }

      // ⚡ Use minimal formatting for list views (faster)
      const formattedDesigns = response.data.designs
        .map(design => formatDesign(design, true)) // ⚡ minimal = true
        .filter(design => design !== null);
      
      setDesigns(formattedDesigns);
      
      // ⚡ Update pagination state
      setPagination({
        page: response.data.page || 1,
        limit: response.data.limit || 10,
        total: response.data.total || 0,
        pages: response.data.pages || 0
      });
      
      console.log('✅ [useDesigns] Diseños cargados:', {
        count: formattedDesigns.length,
        total: response.data.total,
        page: response.data.page,
        pages: response.data.pages
      });
      
      return formattedDesigns;
    } catch (error) {
      handleError(error, 'Error al cargar tus diseños');
      setDesigns([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // Simplificar dependencias para evitar recreación constante

  // Crear nuevo diseño
  const createDesign = useCallback(async (designData) => {
    if (!isAuthenticated) {
      throw new Error('Debes iniciar sesión para crear diseños');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🆕 [useDesigns] Creando diseño:', designData);
      
      // Validar datos antes de enviar
      const validation = DesignService.validateDesignData(designData);
      if (!validation.isValid) {
        throw new Error(`Errores de validación:\n• ${validation.errors.join('\n• ')}`);
      }

      const response = await DesignService.create(designData);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al crear diseño');
      }
      
      // Refrescar lista
      await fetchUserDesigns();
      
      console.log('✅ [useDesigns] Diseño creado exitosamente');
      return response.data;
    } catch (error) {
      handleError(error, 'Error al crear diseño');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchUserDesigns, handleError]);

  // Actualizar diseño existente
  const updateDesign = useCallback(async (id, designData) => {
    if (!isAuthenticated) {
      throw new Error('Debes iniciar sesión para actualizar diseños');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('✏️ [useDesigns] Actualizando diseño:', { id, designData });
      
      if (!id) {
        throw new Error('ID de diseño requerido');
      }
      
      const response = await DesignService.update(id, designData);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al actualizar diseño');
      }
      
      // Refrescar lista
      await fetchUserDesigns();
      
      console.log('✅ [useDesigns] Diseño actualizado exitosamente');
      return response.data;
    } catch (error) {
      handleError(error, 'Error al actualizar diseño');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchUserDesigns, handleError]);

  // Actualizar color del producto
  const updateProductColor = useCallback(async (id, color) => {
    if (!isAuthenticated) {
      throw new Error('Debes iniciar sesión para actualizar diseños');
    }

    try {
      setError(null);
      
      console.log('🎨 [useDesigns] Actualizando color del producto:', { id, color });
      
      if (!id) {
        throw new Error('ID de diseño requerido');
      }

      const response = await DesignService.updateProductColor(id, color);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al actualizar color del producto');
      }
      
      console.log('✅ [useDesigns] Color del producto actualizado exitosamente');
      return response.data;
    } catch (error) {
      handleError(error, 'Error al actualizar color del producto');
      throw error;
    }
  }, [isAuthenticated, handleError]);

  // Obtener diseño por ID
  const getDesignById = useCallback(async (id) => {
    if (!isAuthenticated) {
      throw new Error('Debes iniciar sesión para ver diseños');
    }

    try {
      setError(null);
      
      console.log('🔍 [useDesigns] Obteniendo diseño por ID:', id);
      
      if (!id) {
        throw new Error('ID de diseño requerido');
      }

      const response = await DesignService.getById(id);
      
      if (!response.success || !response.data?.design) {
        throw new Error('Diseño no encontrado');
      }

      const formattedDesign = formatDesign(response.data.design);
      console.log('✅ [useDesigns] Diseño obtenido:', formattedDesign);
      
      return {
        design: formattedDesign,
        konvaConfig: response.data.konvaConfig || null,
        order: response.data.order || null
      };
    } catch (error) {
      handleError(error, 'Error al obtener diseño');
      return null;
    }
  }, [isAuthenticated, formatDesign, handleError]);

  // Clonar diseño
  const cloneDesign = useCallback(async (id, options = {}) => {
    if (!isAuthenticated) {
      throw new Error('Debes iniciar sesión para clonar diseños');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 [useDesigns] Clonando diseño:', { id, options });
      
      if (!id) {
        throw new Error('ID de diseño requerido');
      }

      const response = await DesignService.clone(id, options);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al clonar diseño');
      }
      
      // Refrescar lista
      await fetchUserDesigns();
      
      console.log('✅ [useDesigns] Diseño clonado exitosamente');
      return response.data;
    } catch (error) {
      handleError(error, 'Error al clonar diseño');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchUserDesigns, handleError]);

  // Guardar borrador
  const saveDraft = useCallback(async (designData) => {
    if (!isAuthenticated) {
      throw new Error('Debes iniciar sesión para guardar borradores');
    }

    try {
      setError(null);
      
      console.log('💾 [useDesigns] Guardando borrador:', designData);
      
      const response = await DesignService.saveDraft(designData);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al guardar borrador');
      }
      
      console.log('✅ [useDesigns] Borrador guardado exitosamente');
      return response.data;
    } catch (error) {
      handleError(error, 'Error al guardar borrador');
      throw error;
    }
  }, [isAuthenticated, handleError]);

  // Cancelar diseño
  const cancelDesign = useCallback(async (id, reason = '') => {
    if (!isAuthenticated) {
      throw new Error('Debes iniciar sesión para cancelar diseños');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('❌ [useDesigns] Cancelando diseño:', { id, reason });
      
      if (!id) {
        throw new Error('ID de diseño requerido');
      }
      
      const response = await DesignService.cancel(id, reason);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cancelar diseño');
      }
      
      // Refrescar lista
      await fetchUserDesigns();
      
      console.log('✅ [useDesigns] Diseño cancelado exitosamente');
      return response.data;
    } catch (error) {
      handleError(error, 'Error al cancelar diseño');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchUserDesigns, handleError]);

  // ==================== SISTEMA DE COTIZACIONES ====================

  // Responder a cotización
  const respondToQuote = useCallback(async (id, accept, clientNotes = '') => {
    if (!isAuthenticated) {
      throw new Error('Debes iniciar sesión para responder cotizaciones');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📝 [useDesigns] Respondiendo a cotización:', { id, accept, clientNotes });
      
      if (!id) {
        throw new Error('ID de diseño requerido');
      }

      const response = await DesignService.respondToQuote(id, accept, clientNotes);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al responder cotización');
      }
      
      // Refrescar lista
      await fetchUserDesigns();
      
      const actionText = accept ? 'aceptada' : 'rechazada';
      console.log(`✅ [useDesigns] Cotización ${actionText} exitosamente`);
      return response.data;
    } catch (error) {
      handleError(error, 'Error al responder cotización');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchUserDesigns, handleError]);

  // ==================== ESTADÍSTICAS Y ANÁLISIS ====================

  // Obtener estadísticas de los diseños del usuario
  const getDesignStats = useCallback(() => {
    const total = designs.filter(d => !['cancelled', 'archived'].includes(d.status)).length;
    const drafts = designs.filter(d => d.status === 'draft').length;
    const pending = designs.filter(d => d.status === 'pending').length;
    const quoted = designs.filter(d => d.status === 'quoted').length;
    const approved = designs.filter(d => d.status === 'approved').length;
    const rejected = designs.filter(d => d.status === 'rejected').length;
    const completed = designs.filter(d => d.status === 'completed').length;
    const cancelled = designs.filter(d => d.status === 'cancelled').length;
    
    const totalInvestment = designs
      .filter(d => d.status === 'approved' || d.status === 'completed')
      .reduce((sum, design) => sum + (design.price || 0), 0);
    
    // Diseños que necesitan respuesta
    const needsResponse = designs.filter(d => d.needsResponse).length;
    
    // Diseños más recientes
    const recentDesigns = [...designs]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Complejidad promedio
    const complexityDistribution = designs.reduce((acc, design) => {
      acc[design.complexity] = (acc[design.complexity] || 0) + 1;
      return acc;
    }, {});

    // Productos más personalizados
    const productCounts = designs.reduce((acc, design) => {
      if (design.product?.name) {
        acc[design.product.name] = (acc[design.product.name] || 0) + 1;
      }
      return acc;
    }, {});

    const topProducts = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return { 
      total, 
      drafts,
      pending, 
      quoted, 
      approved, 
      rejected, 
      completed,
      cancelled,
      totalInvestment,
      needsResponse,
      recentDesigns,
      complexityDistribution,
      topProducts
    };
  }, [designs]);

  // ==================== UTILIDADES KONVA ====================

  // Preparar diseño para editor Konva
  const prepareForKonvaEditor = useCallback((design) => {
    try {
      return DesignService.prepareForKonvaEditor(design);
    } catch (error) {
      console.error('❌ [useDesigns] Error preparando para Konva:', error);
      return null;
    }
  }, []);

  // Convertir datos de Konva a formato backend
  const prepareFromKonvaEditor = useCallback((elements, productColorFilter) => {
    try {
      return DesignService.prepareFromKonvaEditor(elements, productColorFilter);
    } catch (error) {
      console.error('❌ [useDesigns] Error convirtiendo desde Konva:', error);
      return null;
    }
  }, []);

  // ==================== EFECTOS ====================

  // Cargar diseños cuando el usuario se autentica
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserDesigns({ includeDetails: true, limit: 50 });
    } else {
      setDesigns([]);
      setError(null);
    }
  }, [isAuthenticated, user]); // Remover fetchUserDesigns de las dependencias para evitar bucle

  // Limpiar error después de un tiempo
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ==================== RETORNO ====================

  return {
    // Estados principales
    designs,
    loading,
    error,
    pagination, // ⚡ Pagination info

    // Funciones principales CRUD
    fetchUserDesigns,
    createDesign,
    updateDesign,
    updateProductColor,
    getDesignById,
    cloneDesign,
    saveDraft,
    cancelDesign,

    // Sistema de cotizaciones
    respondToQuote,

    // Estadísticas y análisis
    getDesignStats,

    // Utilidades Konva
    prepareForKonvaEditor,
    prepareFromKonvaEditor,

    // Utilidades
    refetch: fetchUserDesigns,
    
    // Estados calculados
    hasDesigns: designs.length > 0,
    isEmpty: !loading && designs.length === 0,
    hasError: !!error,
    isFirstLoad: !loading && designs.length === 0 && !error,
    hasMore: pagination.page < pagination.pages, // ⚡ Has more pages
    
    // Funciones auxiliares
    formatDesign,
    
    // Validación
    validateDesignData: DesignService.validateDesignData,
    
    // Configuración de estados
    getStatusText: DesignService.getStatusText,
    getStatusColor: DesignService.getStatusColor,

    // Filtros útiles
    pendingDesigns: designs.filter(d => d.status === 'pending'),
    quotedDesigns: designs.filter(d => d.status === 'quoted'),
    approvedDesigns: designs.filter(d => d.status === 'approved'),
    draftDesigns: designs.filter(d => d.status === 'draft'),
    completedDesigns: designs.filter(d => d.status === 'completed'),
    needsResponseDesigns: designs.filter(d => d.needsResponse)
  };
};

export default useDesigns;