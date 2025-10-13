import React, { useState, useEffect } from 'react';
import { FaTimes, FaBox, FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaTruck, FaCreditCard, FaTag, FaUser, FaMapMarkerAlt, FaPhone, FaEnvelope, FaExternalLinkAlt } from 'react-icons/fa';
import './orderModals.css';

const OrderDetailModal = ({ isOpen, onClose, order, onQuoteResponse, onQualityApprove }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  if (!isOpen || !order) return null;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  // Get status icon and color
  const getStatusInfo = (status) => {
    const iconStyle = { fontSize: '20px' };
    switch (status) {
      case 'completed':
        return { icon: <FaCheckCircle style={iconStyle} />, color: '#10B981' };
      case 'cancelled':
        return { icon: <FaTimesCircle style={iconStyle} />, color: '#EF4444' };
      case 'in_production':
        return { icon: <FaBox style={iconStyle} />, color: '#3B82F6' };
      case 'quality_check':
        return { icon: <FaCheckCircle style={iconStyle} />, color: '#F59E0B' };
      case 'pending_approval':
      case 'quoted':
        return { icon: <FaClock style={iconStyle} />, color: '#F59E0B' };
      default:
        return { icon: <FaInfoCircle style={iconStyle} />, color: '#6B7280' };
    }
  };

  const statusInfo = getStatusInfo(order.status);

  return (
    <div className="order-modal-overlay" onClick={onClose}>
      <div className="order-modal-container" onClick={e => e.stopPropagation()}>
        <div className="order-modal-header">
          <div className="order-modal-title">
            <FaBox style={{ fontSize: '24px' }} />
            <h2>Orden #{order.orderNumber}</h2>
          </div>
          <button className="order-close-button" onClick={onClose}>
            <FaTimes style={{ fontSize: '24px' }} />
          </button>
        </div>

        <div className="order-modal-content">
          {/* Order Status */}
          <div className="order-status-section">
            <div className="order-status-badge" style={{ backgroundColor: `${statusInfo.color}15`, borderColor: statusInfo.color }}>
              {statusInfo.icon}
              <span style={{ color: statusInfo.color }}>{getStatusLabel(order.status)}</span>
            </div>
            
            <div className="order-status-timeline">
              <div className={`order-timeline-step ${order.status === 'pending_approval' ? 'active' : ''} ${['quoted', 'in_production', 'quality_check', 'completed'].includes(order.status) ? 'completed' : ''}`}>
                <div className="order-timeline-icon">1</div>
                <span>{getStatusLabel('pending_approval')}</span>
              </div>
              <div className={`order-timeline-step ${order.status === 'quoted' ? 'active' : ''} ${['in_production', 'quality_check', 'completed'].includes(order.status) ? 'completed' : ''}`}>
                <div className="order-timeline-icon">2</div>
                <span>{getStatusLabel('quoted')}</span>
              </div>
              <div className={`order-timeline-step ${order.status === 'in_production' ? 'active' : ''} ${['quality_check', 'completed'].includes(order.status) ? 'completed' : ''}`}>
                <div className="order-timeline-icon">3</div>
                <span>{getStatusLabel('in_production')}</span>
              </div>
              <div className={`order-timeline-step ${order.status === 'quality_check' ? 'active' : ''} ${['completed'].includes(order.status) ? 'completed' : ''}`}>
                <div className="order-timeline-icon">4</div>
                <span>{getStatusLabel('quality_check')}</span>
              </div>
              <div className={`order-timeline-step ${order.status === 'completed' ? 'active' : ''}`}>
                <div className="order-timeline-icon">5</div>
                <span>{getStatusLabel('completed')}</span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="order-detail-summary">
            <h3>Resumen del Orden</h3>
            <div className="order-summary-grid">
              <div className="order-summary-item">
                <FaCalendarAlt style={{ fontSize: '20px' }} />
                <div>
                  <span className="order-label">Fecha del Orden</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
              </div>
              <div className="order-summary-item">
                <FaClock style={{ fontSize: '20px' }} />
                <div>
                  <span className="order-label">Última Actualización</span>
                  <span>{formatDate(order.updatedAt)}</span>
                </div>
              </div>
              <div className="order-summary-item">
                <FaCreditCard style={{ fontSize: '20px' }} />
                <div>
                  <span className="order-label">Método de Pago</span>
                  <span>{order.paymentMethod || 'No especificado'}</span>
                </div>
              </div>
              <div className="order-summary-item">
                <FaTag style={{ fontSize: '20px' }} />
                <div>
                  <span className="order-label">Total</span>
                  <span>${order.total?.toLocaleString('es-ES') || '0'}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Shipping Information */}
          <div className="order-shipping-section">
            <h3>Información de Envío</h3>
            <div className="order-shipping-info">
              <div className="order-shipping-address">
                <FaMapMarkerAlt style={{ fontSize: '20px' }} />
                <div>
                  <span className="order-label">Dirección de Envío</span>
                  <span>{order.shippingAddress?.street || 'No especificada'}</span>
                  <span>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}</span>
                  <span>{order.shippingAddress?.country}</span>
                </div>
              </div>
              <div className="order-shipping-contact">
                <FaUser style={{ fontSize: '20px' }} />
                <div>
                  <span className="order-label">Contacto</span>
                  <span>{order.shippingAddress?.name || 'No especificado'}</span>
                  <span><FaPhone style={{ fontSize: '16px' }} /> {order.shippingAddress?.phone || 'No especificado'}</span>
                  <span><FaEnvelope style={{ fontSize: '16px' }} /> {order.shippingAddress?.email || 'No especificado'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="order-detail-items">
            <h3>Productos ({order.items?.length || 0})</h3>
            {order.items?.map((item, index) => (
              <div key={index} className="order-detail-item">
                <div className="order-item-image">
                  {item.product?.images?.[0] ? (
                    <img src={item.product.images[0]} alt={item.product.name} />
                  ) : (
                    <div className="order-image-placeholder">
                      <FaBox style={{ fontSize: '24px' }} />
                    </div>
                  )}
                </div>
                <div className="order-item-details">
                  <h4>{item.product?.name || 'Producto sin nombre'}</h4>
                  <div className="order-item-attributes">
                    <span>Tamaño: {item.size || 'Único'}</span>
                    <span>Cantidad: {item.quantity || 1}</span>
                    {item.color && <span>Color: {item.color}</span>}
                  </div>
                  {item.designId && (
                    <button 
                      className="order-view-design-button"
                      onClick={() => window.open(`/designs/${item.designId}`, '_blank')}
                    >
                      <FaExternalLinkAlt style={{ fontSize: '16px' }} /> Ver diseño
                    </button>
                  )}
                </div>
                <div className="order-item-price">
                  ${(item.price * item.quantity).toLocaleString('es-ES')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="order-modal-footer">
          <button className="order-secondary-button" onClick={onClose}>
            Cerrar
          </button>
          
          {order.status === 'quoted' && (
            <button 
              className="order-primary-button"
              onClick={() => onQuoteResponse(order)}
              disabled={isLoading}
            >
              {isLoading ? 'Cargando...' : 'Responder Cotización'}
            </button>
          )}
          
          {order.status === 'quality_check' && order.productionPhotos?.some(p => !p.clientResponse) && (
            <button 
              className="order-primary-button"
              onClick={() => onQualityApprove(order)}
              disabled={isLoading}
            >
              {isLoading ? 'Cargando...' : 'Revisar Calidad'}
            </button>
          )}
          
          {order.status === 'in_production' && (
            <a 
              href={`/tracking/${order.trackingNumber}`} 
              className="order-primary-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTruck style={{ fontSize: '18px' }} /> Seguimiento
            </a>
          )}
        </div>
        
        {error && <div className="order-error-message">{error}</div>}
      </div>
    </div>
  );
};

// Helper function to get status label
const getStatusLabel = (status) => {
  const statusMap = {
    'pending_approval': 'Pendiente de Aprobación',
    'quoted': 'Cotizado',
    'in_production': 'En Producción',
    'quality_check': 'En Revisión de Calidad',
    'completed': 'Completado',
    'cancelled': 'Cancelado'
  };
  return statusMap[status] || status;
};

export default OrderDetailModal;
