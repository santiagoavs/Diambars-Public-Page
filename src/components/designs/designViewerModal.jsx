import React, { useState, useCallback, useEffect } from 'react';
import { X, Download, Edit, DollarSign } from 'lucide-react';
import KonvaDesignViewer from './KonvaDesignViewer';
import './designViewerModal.css';

const DesignViewerModal = ({
  isOpen,
  onClose,
  designData,
  onEdit,
  onQuoteResponse
}) => {
  const [imageError, setImageError] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleEdit = useCallback(() => {
    if (designData?.design && onEdit) {
      onEdit(designData.design.id);
    }
  }, [designData, onEdit]);

  const handleQuoteResponse = useCallback(() => {
    if (designData?.design && onQuoteResponse) {
      onQuoteResponse(designData.design);
    }
  }, [designData, onQuoteResponse]);

  // Bloquear el body scroll cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      // Guardar el estado de overflow actual
      const originalOverflow = document.body.style.overflow;
      // Bloquear el scroll
      document.body.style.overflow = 'hidden';
      
      // Cleanup: restaurar el scroll cuando el modal se cierra
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !designData?.design) return null;

  const design = designData.design;
  const order = designData.order;

  const getStateColor = (status) => {
    switch (status) {
      case 'quoted':
        return 'status-quoted';
      case 'approved':
        return 'status-approved';
      case 'completed':
        return 'status-completed';
      case 'rejected':
        return 'status-rejected';
      case 'pending':
        return 'status-pending';
      case 'draft':
      default:
        return 'status-draft';
    }
  };

  const getComplexityColor = (complexity) => {
    switch (complexity) {
      case 'low':
        return 'complexity-low';
      case 'medium':
        return 'complexity-medium';
      case 'high':
        return 'complexity-high';
      default:
        return '';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Borrador',
      pending: 'Pendiente de cotización',
      quoted: 'Cotizado',
      approved: 'Aprobado',
      completed: 'Completado',
      rejected: 'Rechazado'
    };
    return labels[status] || 'Estado desconocido';
  };

  const getComplexityLabel = (complexity) => {
    const labels = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta'
    };
    return labels[complexity] || complexity;
  };

  const groupedElements = design.elements?.reduce(
    (acc, element) => {
      const type = element.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(element);
      return acc;
    },
    {}
  ) || {};

  return (
    <div className="dialog-overlay-viewer" onClick={handleClose}>
      <div className="dialog-content-viewer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header-viewer">
          <div className="dialog-header-content-viewer">
            <h2 className="dialog-title-viewer">Información del diseño</h2>
            <button className="dialog-close-btn-viewer" onClick={handleClose}>
              <X className="icon-sm-viewer" />
              <span className="sr-only-viewer">Cerrar</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="dialog-body-viewer">
          {/* Canvas Preview */}
          <div className="section-viewer">
            <h3 className="section-title-viewer">Vista previa</h3>
            <div className="preview-container-viewer">
              <KonvaDesignViewer 
                design={design}
                product={design.product}
                enableDownload={true}
                onDownload={(dataURL) => {
                  console.log('Design downloaded:', dataURL);
                }}
              />
            </div>
          </div>

          {/* Design Information */}
          <div className="section-viewer">
            <h3 className="section-title-viewer">Detalles del diseño</h3>
            <div className="info-grid-viewer">
              <div className="info-item-viewer">
                <p className="info-label-viewer">Estado</p>
                <span className={`badge-viewer ${getStateColor(design.status)}`}>
                  {getStatusLabel(design.status)}
                </span>
              </div>
              <div className="info-item-viewer">
                <p className="info-label-viewer">Creado</p>
                <p className="info-value-viewer">{formatDate(design.createdAt)}</p>
              </div>
              <div className="info-item-viewer">
                <p className="info-label-viewer">Elementos</p>
                <p className="info-value-viewer">
                  {design.elements?.length || 0} {design.elements?.length === 1 ? 'item' : 'items'}
                </p>
              </div>
              {design.complexity && (
                <div className="info-item-viewer">
                  <p className="info-label-viewer">Complejidad</p>
                  <span className={`badge-viewer ${getComplexityColor(design.complexity)}`}>
                    {getComplexityLabel(design.complexity)}
                  </span>
                </div>
              )}
              {design.quotedAt && (
                <div className="info-item-viewer">
                  <p className="info-label-viewer">Cotizado</p>
                  <p className="info-value-viewer">{formatDate(design.quotedAt)}</p>
                </div>
              )}
              {design.price > 0 && (
                <div className="info-item-viewer">
                  <p className="info-label-viewer">Precio establecido</p>
                  <p className="info-value-viewer price-highlight-viewer">{design.formattedPrice}</p>
                </div>
              )}
              {design.productionDays > 0 && (
                <div className="info-item-viewer">
                  <p className="info-label-viewer">Tiempo de producción</p>
                  <p className="info-value-viewer">
                    {design.productionDays} día{design.productionDays !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Two Column Layout - Product Information and Design Elements */}
          <div className="product-elements-columns-viewer">
            {/* Left Column - Product Information */}
            {design.product && (
              <div className="section-viewer">
                <h3 className="section-title-viewer">Información del producto</h3>
                <div className="product-info-viewer">
                  <div className="product-details-viewer">
                    <div className="product-header-viewer">
                      <p className="info-label-viewer">Producto base</p>
                      <h4 className="product-name-viewer">{design.product.name}</h4>
                    </div>
                    <div className="product-color-section-viewer">
                      <p className="info-label-viewer">Color del producto</p>
                      <div className="color-display-viewer">
                        <div 
                          className="color-swatch-viewer"
                          style={{ backgroundColor: design.productColorFilter || '#1a1a1a' }}
                        />
                        <span className="color-value-viewer">{design.productColorFilter || '#1a1a1a'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Right Column - Design Elements */}
            {design.elements && design.elements.length > 0 && (
              <div className="section-viewer">
                <h3 className="section-title-viewer">Elementos del diseño</h3>
                <div className="elements-container-viewer">
                  {Object.entries(groupedElements).map(([type, elements]) => {
                    if (elements.length === 0) return null;
                    
                    const getElementTypeTitle = (type) => {
                      switch(type) {
                        case 'text': return 'TEXTOS';
                        case 'image': return 'IMÁGENES';
                        case 'shape': return 'FORMAS';
                        case 'custom': return 'FORMAS';
                        case 'ellipse': return 'FORMAS';
                        case 'rectangle': return 'FORMAS';
                        case 'line': return 'FORMAS';
                        default: return 'FORMAS';
                      }
                    };
                    
                    const getElementName = (element, index) => {
                      if (element.type === 'text' && element.konvaAttrs?.text) {
                        return element.konvaAttrs.text.length > 15 
                          ? element.konvaAttrs.text.substring(0, 15) + '...' 
                          : element.konvaAttrs.text;
                      }
                      if (element.type === 'image') {
                        return element.konvaAttrs?.imageUrl?.split('/').pop()?.split('.')[0] || `Image ${index + 1}`;
                      }
                      const shapeNames = {
                        'rectangle': 'Rectángulo',
                        'ellipse': 'Círculo',
                        'line': 'Linea',
                        'custom': 'Forma Personalizada'
                      };
                      return shapeNames[element.type] || `${element.type} ${index + 1}`;
                    };
                    
                    return (
                      <div key={type} className="element-group-viewer">
                        <p className="element-group-title-viewer">
                          {getElementTypeTitle(type)} ({elements.length})
                        </p>
                        <div className="element-badges-viewer">
                          {elements.map((element, index) => (
                            <span key={`${type}-${index}`} className="element-badge-viewer">
                              {getElementName(element, index)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="dialog-footer-viewer">
          <div className="download-section-viewer">
            <button className="btn-download-viewer" onClick={() => {
              // Dispara el evento de descarga
              const downloadEvent = new CustomEvent('downloadDesign');
              document.dispatchEvent(downloadEvent);
            }}>
              <Download className="icon-sm-viewer" />
              Descargar PNG
            </button>
          </div>
          <div className="footer-actions-viewer">
            <button className="btn-secondary-viewer" onClick={handleClose}>
              Cerrar
            </button>
            {design.canEdit && (
              <button className="btn-primary-viewer" onClick={handleEdit}>
                <Edit className="icon-sm-viewer" />
                Abrir editor
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignViewerModal;