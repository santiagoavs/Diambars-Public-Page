import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Image, Info, SpinnerGap } from '@phosphor-icons/react';
import './orderModals.css';

const QualityApprovalModal = ({ isOpen, onClose, order, onSubmit, loading }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [decision, setDecision] = useState(null); // 'approve' or 'reject'
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  // Reset form when modal opens/closes or order changes
  useEffect(() => {
    if (isOpen && order?.productionPhotos?.length > 0) {
      setSelectedPhoto(order.productionPhotos[0]);
      setDecision(null);
      setFeedback('');
      setError('');
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const pendingPhotos = order.productionPhotos?.filter(photo => !photo.clientResponse) || [];
  
  if (pendingPhotos.length === 0) {
    return (
      <div className="order-modal-overlay" onClick={onClose}>
        <div className="order-modal-container" onClick={e => e.stopPropagation()}>
          <div className="order-modal-header">
            <h2>Control de Calidad</h2>
            <button className="order-close-button" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
          <div className="order-modal-content order-centered-message">
            <CheckCircle size={48} weight="fill" className="order-success-icon" />
            <h3>¡Todas las fotos han sido revisadas!</h3>
            <p>No hay más fotos pendientes de aprobación para esta orden.</p>
          </div>
          <div className="order-modal-footer">
            <button className="order-primary-button" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!decision) {
      setError('Por favor, selecciona una opción (Aprobar o Rechazar)');
      return;
    }
    
    if (decision === 'reject' && !feedback.trim()) {
      setError('Por favor, proporciona una razón para el rechazo');
      return;
    }
    
    onSubmit({
      orderId: order._id,
      photoId: selectedPhoto._id,
      approved: decision === 'approve',
      feedback: decision === 'approve' ? 'Aprobado por el cliente' : feedback
    });
  };

  return (
    <div className="order-modal-overlay" onClick={onClose}>
      <div className="order-modal-container order-quality-modal" onClick={e => e.stopPropagation()}>
        <div className="order-modal-header">
          <h2>Control de Calidad - Orden #{order.orderNumber}</h2>
          <button className="order-close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="order-quality-content">
          {/* Photo List */}
          <div className="order-photo-list">
            <h3>Fotos de Producción</h3>
            <div className="order-photo-thumbnails">
              {order.productionPhotos?.map((photo, index) => (
                <div 
                  key={photo._id || index}
                  className={`order-photo-thumbnail ${selectedPhoto?._id === photo._id ? 'selected' : ''}`}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <Image size={24} weight="fill" />
                  <span>Foto {index + 1}</span>
                  {photo.clientResponse && (
                    <span className={`order-photo-status-badge ${photo.clientResponse.approved ? 'approved' : 'rejected'}`}>
                      {photo.clientResponse.approved ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Main Content */}
          <div className="order-quality-main">
            {/* Photo Preview */}
            <div className="order-photo-preview">
              {selectedPhoto?.url ? (
                <img 
                  src={selectedPhoto.url} 
                  alt={`Foto de producción ${selectedPhoto._id}`} 
                  className="order-preview-image"
                />
              ) : (
                <div className="order-no-image">
                  <Image size={48} weight="light" />
                  <p>No hay imagen disponible</p>
                </div>
              )}
              
              <div className="order-photo-info">
                <p><strong>Subido el:</strong> {new Date(selectedPhoto?.uploadedAt).toLocaleDateString('es-ES')}</p>
                <p><strong>Notas del equipo:</strong> {selectedPhoto?.notes || 'Sin notas'}</p>
              </div>
            </div>
            
            {/* Approval Form */}
            <form onSubmit={handleSubmit} className="order-approval-form">
              <h3>¿Cómo calificas esta producción?</h3>
              
              <div className="order-decision-options">
                <label className={`order-decision-option ${decision === 'approve' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="decision" 
                    value="approve"
                    checked={decision === 'approve'}
                    onChange={() => setDecision('approve')}
                  />
                  <div className="order-option-content">
                    <CheckCircle size={24} weight="fill" className="order-approve-icon" />
                    <span>Aprobar</span>
                    <p>La producción cumple con mis expectativas.</p>
                  </div>
                </label>
                
                <label className={`order-decision-option ${decision === 'reject' ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="decision" 
                    value="reject"
                    checked={decision === 'reject'}
                    onChange={() => setDecision('reject')}
                  />
                  <div className="order-option-content">
                    <XCircle size={24} weight="fill" className="order-reject-icon" />
                    <span>Rechazar</span>
                    <p>Hay problemas que necesitan corrección.</p>
                  </div>
                </label>
              </div>
              
              {decision === 'reject' && (
                <div className="order-feedback-section">
                  <label htmlFor="feedback">Explica los problemas encontrados:</label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Describe los problemas que encontraste en la producción..."
                    rows={4}
                    required
                  />
                </div>
              )}
              
              {error && <div className="order-error-message">{error}</div>}
              
              <div className="order-form-actions">
                <button 
                  type="button" 
                  className="order-secondary-button"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="order-primary-button"
                  disabled={loading || !decision}
                >
                  {loading ? (
                    <>
                      <SpinnerGap size={20} className="order-spinner" />
                      Procesando...
                    </>
                  ) : 'Enviar Respuesta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityApprovalModal;
