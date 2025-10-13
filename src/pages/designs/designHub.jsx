// src/pages/designs/DesignHub.jsx - CENTRO DE DISEÑOS CON MODALES
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/authContext';
import useDesigns from '../../hooks/useDesign';
import useProducts from '../../hooks/useProducts';
import Footer from '../../components/UI/footer/footer';
import CreateDesignModal from '../../components/designs/createDesignModal';
import EnhancedDesignEditorModal from '../../components/designs/EnhancedDesignEditorModal';
import DesignViewerModal from '../../components/designs/designViewerModal';
import QuoteResponseModal from '../../components/designs/quoteResponseModal';
import { Palette, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import './designHub.css';

const DesignHub = ({ initialProductId = null }) => {
  const { user, isAuthenticated } = useAuth();
  const { 
    designs, 
    loading, 
    error, 
    createDesign, 
    updateDesign, 
    cloneDesign, 
    cancelDesign, 
    getDesignById,
    getDesignStats,
    needsResponseDesigns,
    hasDesigns,
    respondToQuote,
    fetchUserDesigns
  } = useDesigns();
  
  const { 
    getProductById,
    searchProducts 
  } = useProducts();

  // ==================== ESTADOS DE MODALES ====================
  const [modals, setModals] = useState({
    create: false,
    viewer: false
  });

  // Enhanced editor modal state
  const [editorModal, setEditorModal] = useState({
    isOpen: false,
    design: null
  });

  // ==================== ESTADOS DE DATOS ====================
  const [activeTab, setActiveTab] = useState('all'); // all, drafts, pending, quoted, approved, completed
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDesigns, setFilteredDesigns] = useState([]);

  // ==================== EFECTOS ====================

  // Abrir modal de creación si viene con producto inicial
  useEffect(() => {
    if (initialProductId && isAuthenticated) {
      handleCreateDesign(initialProductId);
    }
  }, [initialProductId, isAuthenticated]);

  // Filtrar diseños según tab activo y búsqueda
  useEffect(() => {
    let filtered = [...designs];

    // Filtrar por tab
    switch (activeTab) {
      case 'drafts':
        filtered = designs.filter(d => d.status === 'draft');
        break;
      case 'pending':
        filtered = designs.filter(d => d.status === 'pending');
        break;
      case 'quoted':
        filtered = designs.filter(d => d.status === 'quoted');
        break;
      case 'approved':
        filtered = designs.filter(d => d.status === 'approved');
        break;
      case 'completed':
        filtered = designs.filter(d => d.status === 'completed');
        break;
      case 'all':
      default:
        // Mostrar todos menos cancelados y archivados
        filtered = designs.filter(d => !['cancelled', 'archived'].includes(d.status));
        break;
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(design => 
        design.name.toLowerCase().includes(term) ||
        design.product?.name.toLowerCase().includes(term) ||
        design.clientNotes.toLowerCase().includes(term)
      );
    }

    setFilteredDesigns(filtered);
  }, [designs, activeTab, searchTerm]);

  // ==================== MANEJADORES DE MODALES ====================

  const openModal = useCallback((modalName, data = null) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
    if (data) {
      if (modalName === 'create') setSelectedProduct(data);
      else setSelectedDesign(data);
    }
  }, []);

  const closeModal = useCallback((modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    setSelectedDesign(null);
    setSelectedProduct(null);
  }, []);

  // ==================== ESTADOS DE COTIZACIÓN ====================
  const [quoteResponse, setQuoteResponse] = useState({
    isOpen: false,
    design: null,
    loading: false,
    error: null
  });

  // ==================== MANEJADORES DE ACCIONES ====================

  const handleCreateDesign = useCallback(async (productId) => {
    try {
      const product = await getProductById(productId);
      if (product && product.canCustomize) {
        setSelectedProduct(product);
        openModal('create');
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Producto no personalizable',
          text: 'Este producto no se puede personalizar',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#3F2724'
        });
      }
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar el producto',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3F2724'
      });
    }
  }, [getProductById, openModal]);

  const handleViewDesign = useCallback(async (designId) => {
    try {
      const designData = await getDesignById(designId);
      if (designData) {
        setSelectedDesign(designData);
        openModal('viewer');
      }
    } catch (error) {
      console.error('Error obteniendo diseño:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar el diseño',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3F2724'
      });
    }
  }, [getDesignById, openModal]);

  const handleEditDesign = useCallback(async (designId) => {
    try {
      const designData = await getDesignById(designId);
      if (designData && designData.design.canEdit) {
        setEditorModal({ isOpen: true, design: designData });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Diseño no editable',
          text: 'Este diseño no se puede editar',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#3F2724'
        });
      }
    } catch (error) {
      console.error('Error obteniendo diseño:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar el diseño',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3F2724'
      });
    }
  }, [getDesignById]);

  const handleQuoteResponse = useCallback((design) => {
    setQuoteResponse({
      isOpen: true,
      design,
      loading: false,
      error: null
    });
  }, []);

  const handleSubmitQuoteResponse = useCallback(async (designId, accept, clientNotes = '') => {
    try {
      // Find the design in your state
      const design = designs.find(d => d._id === designId || d.id === designId);
      
      // Check if design exists and is in 'quoted' state
      if (!design) {
        throw new Error('Diseño no encontrado');
      }
      
      if (design.status !== 'quoted') {
        throw new Error('No puedes responder a una cotización que no esté en estado "cotizada"');
      }
      
      setQuoteResponse(prev => ({ ...prev, loading: true, error: null }));
      
      // Call the respondToQuote function from useDesigns hook
      await respondToQuote(designId, accept, clientNotes);
      
      // Close the modal
      setQuoteResponse(prev => ({ ...prev, isOpen: false }));
      
      // Show success message
      const action = accept ? 'aceptada' : 'rechazada';
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: `Cotización ${action} exitosamente`,
        timer: 3000,
        timerProgressBar: true,
        confirmButtonColor: '#3F2724'
      });
      
      // Refresh the designs list
      await fetchUserDesigns();
      
    } catch (error) {
      console.error('Error al responder a la cotización:', error);
      setQuoteResponse(prev => ({
        ...prev, 
        loading: false, 
        error: error.message || 'Error al procesar la respuesta. Por favor, inténtalo de nuevo.'
      }));
    }
  }, [designs, respondToQuote, fetchUserDesigns]);
  
  const closeQuoteResponseModal = useCallback(() => {
    setQuoteResponse(prev => ({
      ...prev,
      isOpen: false,
      error: null
    }));
  }, []);

  const handleCloneDesign = useCallback(async (designId, designName) => {
    try {
      const result = await Swal.fire({
        icon: 'question',
        title: 'Clonar diseño',
        text: `¿Deseas clonar el diseño "${designName}"?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, clonar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3F2724',
        cancelButtonColor: '#6c757d'
      });
      
      if (result.isConfirmed) {
        // Show loading
        Swal.fire({
          title: 'Clonando diseño...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        await cloneDesign(designId, { name: `Copia de ${designName}` });
        
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Diseño clonado exitosamente',
          timer: 3000,
          timerProgressBar: true,
          confirmButtonColor: '#3F2724'
        });
      }
    } catch (error) {
      console.error('Error clonando diseño:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al clonar el diseño',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3F2724'
      });
    }
  }, [cloneDesign]);

  const handleCancelDesign = useCallback(async (designId, designName) => {
    try {
      const { value: reason } = await Swal.fire({
        icon: 'warning',
        title: 'Cancelar diseño',
        text: `¿Por qué deseas cancelar "${designName}"?`,
        input: 'textarea',
        inputPlaceholder: 'Motivo de cancelación (opcional)...',
        showCancelButton: true,
        confirmButtonText: 'Cancelar diseño',
        cancelButtonText: 'No cancelar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        inputValidator: () => {
          // No validation needed since reason is optional
          return null;
        }
      });
      
      if (reason !== undefined) { // undefined means user clicked cancel
        // Show loading
        Swal.fire({
          title: 'Cancelando diseño...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        await cancelDesign(designId, reason || '');
        
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Diseño cancelado exitosamente',
          timer: 3000,
          timerProgressBar: true,
          confirmButtonColor: '#3F2724'
        });
      }
    } catch (error) {
      console.error('Error cancelando diseño:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cancelar el diseño',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3F2724'
      });
    }
  }, [cancelDesign]);

  // ==================== MANEJADORES DE FORMULARIOS ====================

  const handleCreateSubmit = useCallback(async (designData) => {
    try {
      await createDesign(designData);
      closeModal('create');
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'Diseño creado y enviado para cotización',
        timer: 3000,
        timerProgressBar: true,
        confirmButtonColor: '#3F2724'
      });
    } catch (error) {
      console.error('Error creando diseño:', error);
      throw error; // Re-lanzar para que el modal maneje el error
    }
  }, [createDesign, closeModal]);

  // Removed deprecated handleUpdateSubmit - using handleSaveDesign instead

  // Enhanced save handler for the new editor
  const handleSaveDesign = useCallback(async (designData) => {
    try {
      // ✅ DEBUGGING: Check what design data we have
      console.log('🔍 [designHub] handleSaveDesign - Design ID debugging:', {
        'editorModal.design': editorModal.design,
        'editorModal.design?.design?._id': editorModal.design?.design?._id,
        'editorModal.design?._id': editorModal.design?._id,
        'designData._id': designData._id,
        'designData.id': designData.id,
        'designData': designData
      });
      
      // ✅ ENHANCED: Check multiple possible ID locations
      const designId = editorModal.design?.design?._id || editorModal.design?._id || designData._id || designData.id;
      
      if (designId) {
        // Update existing design
        console.log('✏️ [designHub] Updating existing design with ID:', designId);
        await updateDesign(designId, designData);
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Diseño actualizado exitosamente',
          timer: 3000,
          timerProgressBar: true,
          confirmButtonColor: '#3F2724'
        });
      } else {
        // Create new design
        console.log('➕ [designHub] Creating new design');
        await createDesign(designData);
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Diseño creado exitosamente',
          timer: 3000,
          timerProgressBar: true,
          confirmButtonColor: '#3F2724'
        });
      }
      setEditorModal({ isOpen: false, design: null });
    } catch (error) {
      console.error('Error guardando diseño:', error);
      throw error;
    }
  }, [editorModal.design, updateDesign, createDesign]);

  // Handle design update callback
  const handleDesignUpdate = useCallback((updatedDesign) => {
    // Refresh designs list or update local state as needed
    console.log('Design updated:', updatedDesign);
  }, []);

  // Removed deprecated handleQuoteResponseSubmit

  // ==================== COMPONENTES DE UI ====================

  // Renderizar tarjeta de estadísticas
  const StatsCard = ({ title, value, subtitle, color, onClick }) => (
    <div 
      className={`stats-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ '--accent-color': color }}
    >
      <div className="stats-value">{value}</div>
      <div className="stats-title">{title}</div>
      {subtitle && <div className="stats-subtitle">{subtitle}</div>}
    </div>
  );

  // Renderizar tarjeta de diseño
  const DesignCard = ({ design }) => (
    <div className="design-card">
      <div className="design-card-header">
        <div className="design-info">
          <h3 className="design-name">{design.name}</h3>
          <p className="design-product">{design.product?.name}</p>
          <div className="design-meta">
            <span className="design-date">
              {new Date(design.createdAt).toLocaleDateString()}
            </span>
            <span 
              className="design-status"
              style={{ color: design.status === 'quoted' ? '#3B82F6' : 
                            design.status === 'approved' ? '#10B981' : 
                            design.status === 'completed' ? '#059669' :
                            design.status === 'rejected' ? '#EF4444' : '#F59E0B' }}
            >
              {design.status === 'draft' ? 'Borrador' :
               design.status === 'pending' ? 'Pendiente' :
               design.status === 'quoted' ? 'Cotizado' :
               design.status === 'approved' ? 'Aprobado' :
               design.status === 'completed' ? 'Completado' :
               design.status === 'rejected' ? 'Rechazado' : 'Desconocido'}
            </span>
          </div>
        </div>
        
        {design.previewImage && (
          <div className="design-preview">
            <img src={design.previewImage} alt={design.name} />
          </div>
        )}
      </div>

      <div className="design-card-content">
        {(design.price > 0 || design.clientNotes || design.productionDays > 0) && (
          <div className="design-price">
            {design.price > 0 && <strong>{design.formattedPrice}</strong>}
            
            {design.clientNotes && (
              <div className="design-notes-inline">
                <p>"{design.clientNotes}"</p>
              </div>
            )}
            
            {design.productionDays > 0 && (
              <span className="production-time">
                {design.productionDays} días
              </span>
            )}
          </div>
        )}

        {design.needsResponse && (
          <div className="needs-response-alert">
            <AlertTriangle size={16} strokeWidth={2} />
            <span>Requiere tu respuesta</span>
          </div>
        )}
      </div>

      <div className="design-card-actions">
        <button 
          onClick={() => handleViewDesign(design.id)}
          className="btn btn-view"
        >
          Ver
        </button>

        {design.canEdit && (
          <button 
            onClick={() => handleEditDesign(design.id)}
            className="btn btn-edit-hub"
          >
            Editar
          </button>
        )}

        {design.needsResponse && (
          <button 
            onClick={() => handleQuoteResponse(design)}
            className="btn btn-respond"
          >
            Responder
          </button>
        )}

        <div className="design-menu">
          <button className="btn btn-menu">⋮</button>
          <div className="design-menu-dropdown">
            <button onClick={() => handleCloneDesign(design.id, design.name)}>
              Clonar
            </button>
            {design.canCancel && (
              <button onClick={() => handleCancelDesign(design.id, design.name)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ==================== RENDERIZADO PRINCIPAL ====================

  if (!isAuthenticated) {
    return (
      <div className="design-hub">
        <div className="auth-required">
          <div className="auth-required-content">
            <h2>Inicia sesión para acceder a tus diseños</h2>
            <p>Crea y gestiona diseños personalizados para tus productos favoritos</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="create-design-btn"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const stats = getDesignStats();

  return (
    <div className="design-hub">
      <div className="design-hub-container">
        {/* Header */}
        <div className="design-hub-header">
          <div className="hub-title">
            <h1>Mis diseños</h1>
            <p>Gestiona y personaliza todos tus diseños en un solo lugar</p>
          </div>
          
          <div className="hub-actions">
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar diseños..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <button 
              onClick={() => openModal('create')}
              className="create-design-btn"
            >
              + Nuevo diseño
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="stats-grid">
          <StatsCard
            title="Total"
            value={stats.total}
            color="#1F64BF"
            onClick={() => setActiveTab('all')}
          />
          <StatsCard
            title="Pendientes"
            value={stats.pending}
            subtitle="Esperando cotización"
            color="#F59E0B"
            onClick={() => setActiveTab('pending')}
          />
          <StatsCard
            title="Cotizados"
            value={stats.quoted}
            subtitle="Requieren respuesta"
            color="#3B82F6"
            onClick={() => setActiveTab('quoted')}
          />
          <StatsCard
            title="Aprobados"
            value={stats.approved}
            subtitle="En producción"
            color="#10B981"
            onClick={() => setActiveTab('approved')}
          />
          <StatsCard
            title="Inversión Total"
            value={`$${stats.totalInvestment.toFixed(2)}`}
            color="#059669"
          />
        </div>

        {/* Alertas */}
        {needsResponseDesigns.length > 0 && (
          <div className="alert alert-info">
            <span className="alert-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" fill="currentColor">
                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/>
              </svg>
            </span>
            <div className="alert-content">
              <strong>Tienes {needsResponseDesigns.length} cotización(es) esperando tu respuesta</strong>
              <p>Revisa las cotizaciones y decide si deseas continuar con la producción.</p>
            </div>
            <button 
              onClick={() => setActiveTab('quoted')}
              className="alert-action"
            >
              Ver cotizaciones
            </button>
          </div>
        )}

        {/* Tabs de navegación */}
        <div className="design-tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Todos ({stats.total})
          </button>
          <button 
            className={`tab ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafts')}
          >
            Borradores ({stats.drafts})
          </button>
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pendientes ({stats.pending})
          </button>
          <button 
            className={`tab ${activeTab === 'quoted' ? 'active' : ''}`}
            onClick={() => setActiveTab('quoted')}
          >
            Cotizados ({stats.quoted})
          </button>
          <button 
            className={`tab ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            Aprobados ({stats.approved})
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completados ({stats.completed})
          </button>
        </div>

        {/* Grid de diseños */}
        <div className="designs-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando diseños...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <div className="error-icon">
                <AlertTriangle size={64} strokeWidth={1.5} />
              </div>
              <h3>Error al cargar diseños</h3>
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="create-design-btn">
                Reintentar
              </button>
            </div>
          ) : filteredDesigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Palette size={64} strokeWidth={1.5} />
              </div>
              <h3>
                {searchTerm ? 'No se encontraron diseños' : 
                 activeTab === 'all' ? 'No tienes diseños aún' :
                 activeTab === 'drafts' ? 'No tienes borradores' :
                 activeTab === 'pending' ? 'No hay diseños pendientes' :
                 activeTab === 'quoted' ? 'No hay cotizaciones' :
                 activeTab === 'approved' ? 'No hay diseños aprobados' :
                 'No hay diseños en esta categoría'}
              </h3>
              <p>
                {searchTerm ? 'Intenta con otro término de búsqueda' :
                 activeTab === 'all' ? 'Crea tu primer diseño personalizado' :
                 'Los diseños aparecerán aquí cuando cambien de estado'}
              </p>
              {(!searchTerm && activeTab === 'all') && (
                <button 
                  onClick={() => openModal('create')}
                  className="create-design-btn"
                >
                  Crear Primer Diseño
                </button>
              )}
            </div>
          ) : (
            <div className="designs-grid">
              {filteredDesigns.map(design => (
                <DesignCard key={design.id} design={design} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <CreateDesignModal
        isOpen={modals.create}
        onClose={() => closeModal('create')}
        onSubmit={handleCreateSubmit}
        initialProduct={selectedProduct}
        searchProducts={searchProducts}
      />

      <DesignViewerModal
        isOpen={modals.viewer}
        onClose={() => closeModal('viewer')}
        designData={selectedDesign}
        onEdit={handleEditDesign}
        onQuoteResponse={handleQuoteResponse}
      />
      <EnhancedDesignEditorModal
        isOpen={editorModal.isOpen}
        onClose={() => setEditorModal({ isOpen: false, design: null })}
        design={editorModal.design}
        onSave={handleSaveDesign}
        product={editorModal.design?.design?.product || editorModal.design?.product}
        onDesignUpdate={handleDesignUpdate}
      />

      <QuoteResponseModal
        isOpen={quoteResponse.isOpen}
        onClose={closeQuoteResponseModal}
        design={quoteResponse.design}
        onSubmit={handleSubmitQuoteResponse}
        loading={quoteResponse.loading}
        error={quoteResponse.error}
      />

      <Footer />
    </div>
  );
};

export default DesignHub;