// pages/orders/ordersHub.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/authContext';
import { useOrders } from '../../hooks/useOrders';
import useDesigns from '../../hooks/useDesign';
import { ordersAPI } from '../../api/ordersApi';
import Footer from '../../components/UI/footer/footer';
import OrderDetailModal from '../../components/orders/orderDetailModal';
import QuoteResponseModal from '../../components/designs/quoteResponseModal';
import QualityApprovalModal from '../../components/orders/qualityApprovalModal';
import CompleteOrderModal from '../../components/orders/completeOrderModal';
import Swal from 'sweetalert2';
import './ordersHub.css';

const OrdersHub = () => {
  const { user, isAuthenticated } = useAuth();
  const { 
    orders = [], 
    loading, 
    error, 
    refreshOrders 
  } = useOrders();
  
  // Add a retry function
  const handleRetry = () => {
    console.log('🔄 [OrdersHub] Retrying to fetch orders...');
    refreshOrders();
  };

  const { designs = [], refetch: refreshDesigns } = useDesigns();
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showCompleteOrderModal, setShowCompleteOrderModal] = useState(false);

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.isPending).length,
      inProduction: orders.filter(o => ['in_production', 'quality_check'].includes(o.status)).length,
      completed: orders.filter(o => o.status === 'completed').length,
      totalSpent: orders.reduce((sum, o) => sum + (o.total || 0), 0)
    };
  }, [orders]);

  // Filtrar órdenes
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Filtrar por tab
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter(o => o.isPending);
        break;
      case 'production':
        filtered = filtered.filter(o => ['in_production', 'quality_check'].includes(o.status));
        break;
      case 'completed':
        filtered = filtered.filter(o => o.status === 'completed');
        break;
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(term) ||
        order.items?.some(item => 
          item.product?.name.toLowerCase().includes(term)
        )
      );
    }

    return filtered;
  }, [orders, activeTab, searchTerm]);

  // Get approved designs that need order completion
  const approvedDesigns = useMemo(() => {
    // Get all design IDs that already have orders
    const designIdsWithOrders = new Set(
      orders.flatMap(order => 
        order.items?.map(item => {
          // Handle both populated and non-populated design references
          const designId = item.design?._id || item.design;
          return typeof designId === 'string' ? designId : designId?.toString();
        }).filter(Boolean) || []
      )
    );
    
    const approved = designs.filter(d => d.status === 'approved');
    
    // Filter out designs that:
    // 1. Already have an orderId field (new behavior)
    // 2. Have a corresponding order in the orders list (cross-reference)
    const filtered = approved.filter(d => {
      const hasOrderId = !!d.orderId;
      const designIdStr = String(d._id);
      const hasExistingOrder = designIdsWithOrders.has(designIdStr);
      return !hasOrderId && !hasExistingOrder;
    });
    
    console.log('📋 [OrdersHub] Approved designs pending order:', filtered.length);
    
    return filtered;
  }, [designs, orders]);

  // Handlers
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const handleRespondQuote = (order) => {
    setSelectedOrder(order);
    setShowQuoteModal(true);
  };

  const handleApproveQuality = (order) => {
    setSelectedOrder(order);
    setShowQualityModal(true);
  };

  const handleCompleteOrder = (design) => {
    setSelectedDesign(design);
    setShowCompleteOrderModal(true);
  };

  const handleOrderComplete = async (formData) => {
    console.log('📦 [OrdersHub] Completing order with data:', formData);
    console.log('📦 [OrdersHub] Selected design:', selectedDesign);
    
    try {
      // Validate that we have a selected design
      if (!selectedDesign) {
        throw new Error('No hay un diseño seleccionado');
      }

      // Get the design ID (try both _id and id)
      const designId = selectedDesign._id || selectedDesign.id;
      
      if (!designId) {
        console.error('❌ [OrdersHub] Design object:', selectedDesign);
        throw new Error('El diseño seleccionado no tiene un ID válido');
      }

      // Prepare order data for API
      const orderData = {
        designId: designId,
        deliveryType: formData.deliveryType,
        paymentMethod: formData.paymentMethod
      };

      // Only add deliveryAddress if it exists and deliveryType is 'delivery'
      if (formData.deliveryType === 'delivery' && formData.shippingAddress) {
        orderData.deliveryAddress = formData.shippingAddress;
      }

      // Only add notes if they exist and are not empty
      if (formData.notes && formData.notes.trim()) {
        orderData.notes = formData.notes.trim();
      }

      console.log('📤 [OrdersHub] Sending order data:', orderData);

      // Call API to create order from approved design
      const response = await ordersAPI.createOrderFromApprovedDesign(orderData);

      if (response.success) {
        // Close the modal first
        setShowCompleteOrderModal(false);
        setSelectedDesign(null);
        
        // Refresh data
        await refreshOrders();
        await refreshDesigns();
        
        // Show success message after refresh
        await Swal.fire({
          icon: 'success',
          title: '¡Pedido Creado!',
          text: `Tu pedido ${response.data.order.orderNumber} ha sido creado exitosamente.`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#10B981'
        });
      }
    } catch (error) {
      console.error('❌ [OrdersHub] Error completing order:', error);
      
      // Show error message
      await Swal.fire({
        icon: 'error',
        title: 'Error al Crear Pedido',
        text: error.message || 'Hubo un problema al crear tu pedido. Por favor intenta de nuevo.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#EF4444'
      });
      
      throw error;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="orders-hub">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando tus pedidos...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="orders-hub">
        <div className="error-container">
          <h2>Error al cargar los pedidos</h2>
          <p>{error}</p>
          <button 
            onClick={handleRetry}
            className="retry-button"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="orders-hub">
        <div className="auth-required">
          <div className="auth-required-content">
            <h2>Inicia sesión para ver tus pedidos</h2>
            <p>Gestiona y sigue el estado de todos tus pedidos personalizados</p>
            <button 
              onClick={() => window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`}
              className="create-order-btn"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="orders-hub">
      <div className="orders-hub-container">
        {/* Header */}
        <div className="orders-hub-header">
          <div className="hub-title">
            <h1>Mis Pedidos</h1>
            <p>Gestiona y sigue el estado de todos tus pedidos</p>
          </div>
          
          <div className="hub-actions">
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar pedidos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Alert for approved designs needing order completion */}
        {approvedDesigns.length > 0 && (
          <div className="approved-designs-alert">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
              <h4>Diseños Aprobados Pendientes</h4>
              <p>
                Tienes {approvedDesigns.length} diseño{approvedDesigns.length > 1 ? 's' : ''} aprobado{approvedDesigns.length > 1 ? 's' : ''} que necesita{approvedDesigns.length > 1 ? 'n' : ''} información adicional para crear el pedido.
              </p>
              <div className="approved-designs-list">
                {approvedDesigns.map(design => (
                  <div key={design._id} className="approved-design-item">
                    <span className="design-name">{design.name || 'Sin nombre'}</span>
                    <button 
                      onClick={() => handleCompleteOrder(design)}
                      className="btn-complete-info"
                    >
                      Completar Información
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <div className="stats-grid-orders">
          <StatsCard
            title="Total de Pedidos"
            value={stats.total}
            color="#1F64BF"
            onClick={() => setActiveTab('all')}
          />
          <StatsCard
            title="Pendientes"
            value={stats.pending}
            subtitle="Esperando aprobación"
            color="#F59E0B"
            onClick={() => setActiveTab('pending')}
          />
          <StatsCard
            title="En producción"
            value={stats.inProduction}
            subtitle="Elaborándose"
            color="#3B82F6"
            onClick={() => setActiveTab('production')}
          />
          <StatsCard
            title="Completados"
            value={stats.completed}
            color="#10B981"
            onClick={() => setActiveTab('completed')}
          />
        </div>

        {/* Tabs */}
        <div className="orders-tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Todos ({stats.total})
          </button>
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pendientes ({stats.pending})
          </button>
          <button 
            className={`tab ${activeTab === 'production' ? 'active' : ''}`}
            onClick={() => setActiveTab('production')}
          >
            En producción ({stats.inProduction})
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completados ({stats.completed})
          </button>
        </div>

        {/* Grid de órdenes */}
        <div className="orders-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando pedidos...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>No hay pedidos</h3>
              <p>Aún no tienes pedidos registrados</p>
            </div>
          ) : (
            <div className="orders-grid">
              {filteredOrders.map(order => (
                <OrderCard 
                  key={order._id} 
                  order={order}
                  onView={handleViewOrder}
                  onRespondQuote={handleRespondQuote}
                  onApproveQuality={handleApproveQuality}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <OrderDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        order={selectedOrder}
      />

      <QuoteResponseModal
        isOpen={showQuoteModal}
        onClose={() => {
          setShowQuoteModal(false);
          // Refresh designs to check for newly approved designs
          refreshDesigns();
        }}
        design={selectedOrder}
        onSubmit={async (designId, accepted, notes) => {
          // This will be handled by the useDesigns hook
          console.log('📋 [OrdersHub] Quote response:', { designId, accepted, notes });
          await refreshOrders();
          await refreshDesigns();
        }}
      />

      <QualityApprovalModal
        isOpen={showQualityModal}
        onClose={() => setShowQualityModal(false)}
        order={selectedOrder}
        onApproval={refreshOrders}
      />

      <CompleteOrderModal
        isOpen={showCompleteOrderModal}
        onClose={() => setShowCompleteOrderModal(false)}
        design={selectedDesign}
        onComplete={handleOrderComplete}
      />

      <Footer />
    </div>
  );
};

// Componente auxiliar para tarjetas de estadísticas
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

// Componente de tarjeta de orden
const OrderCard = ({ order, onView, onRespondQuote, onApproveQuality }) => (
  <div className="order-card">
    <div className="order-card-header">
      <div className="order-info">
        <h3 className="order-number">#{order.orderNumber}</h3>
        <p className="order-date">
          {new Date(order.createdAt).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </p>
        <div className="order-meta">
          <span 
            className="order-status"
            style={{ color: getStatusColor(order.status) }}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>
      </div>
    </div>

    <div className="order-card-content">
      <div className="order-price">
        <strong>${order.total?.toFixed(2)}</strong>
      </div>

      {order.needsResponse && (
        <div className="needs-response-alert">
          <span>⚠️ Requiere tu respuesta</span>
        </div>
      )}
    </div>

    <div className="order-card-actions">
      <button 
        onClick={() => onView(order)}
        className="btn btn-view"
      >
        Ver Detalles
      </button>

      {order.needsResponse && (
        <button 
          onClick={() => onRespondQuote(order)}
          className="btn btn-respond"
        >
          Responder
        </button>
      )}

      {order.hasQualityPending && (
        <button 
          onClick={() => onApproveQuality(order)}
          className="btn btn-quality"
        >
          Aprobar Calidad
        </button>
      )}
    </div>
  </div>
);

// Utilidades
const getStatusColor = (status) => {
  const colors = {
    pending_approval: '#F59E0B',
    quoted: '#3B82F6',
    in_production: '#6366F1',
    quality_check: '#F97316',
    completed: '#10B981',
    delivered: '#059669'
  };
  return colors[status] || '#6B7280';
};

const getStatusLabel = (status) => {
  const labels = {
    pending_approval: 'Pendiente',
    quoted: 'Cotizado',
    approved: 'Aprobado',
    in_production: 'En producción',
    quality_check: 'Control de calidad',
    ready_for_delivery: 'Listo',
    delivered: 'Entregado',
    completed: 'Completado'
  };
  return labels[status] || status;
};

export default OrdersHub;