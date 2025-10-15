// components/orders/completeOrderModal.jsx
import React, { useState, useEffect } from 'react';
import { X, MapPin, CreditCard, Truck, Package, ArrowRight, ArrowLeft, Check, Star, AlertCircle } from 'lucide-react';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import './completeOrderModal.css';

const CompleteOrderModal = ({ isOpen, onClose, design, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    deliveryType: 'meetup',
    shippingAddress: null,
    paymentMethod: 'cash',
    selectedCard: null,
    cvc: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  // Steps configuration
  const steps = [
    { id: 0, label: 'Tipo de Entrega', icon: Truck },
    { id: 1, label: 'Dirección', icon: MapPin },
    { id: 2, label: 'Método de Pago', icon: CreditCard },
    { id: 3, label: 'Confirmar', icon: Check }
  ];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setFormData({
        deliveryType: 'meetup',
        shippingAddress: null,
        paymentMethod: 'cash',
        selectedCard: null,
        cvc: '',
        notes: ''
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: return formData.deliveryType;
      case 1: return formData.deliveryType === 'meetup' || formData.shippingAddress;
      case 2: {
        // For online payment, require card selection and CVC
        if (formData.paymentMethod === 'online') {
          return formData.selectedCard && formData.cvc && formData.cvc.length >= 3;
        }
        return formData.paymentMethod;
      }
      case 3: return true;
      default: return false;
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await onComplete(formData);
      onClose();
    } catch (error) {
      console.error('Error completing order:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <DeliveryTypeStep formData={formData} setFormData={setFormData} />;
      case 1:
        return <AddressStep formData={formData} setFormData={setFormData} />;
      case 2:
        return <PaymentMethodStep formData={formData} setFormData={setFormData} />;
      case 3:
        return <ConfirmationStep formData={formData} design={design} />;
      default:
        return null;
    }
  };

  return (
    <div className="complete-order-overlay">
      <div className="complete-order-modal">
        {/* Header */}
        <div className="complete-order-header">
          <div>
            <h2>Completar Información del Pedido</h2>
            <p>Proporciona los detalles necesarios para procesar tu orden</p>
          </div>
          <button onClick={onClose} className="close-btn" aria-label="Cerrar">
            <X size={24} />
          </button>
        </div>

        {/* Stepper */}
        <div className="order-stepper">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.id} 
                className={`step-item ${index <= currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              >
                <div className="step-icon">
                  <Icon size={20} />
                </div>
                <span className="step-label">{step.label}</span>
                {index < steps.length - 1 && <div className="step-connector" />}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="complete-order-content">
          {renderStepContent()}
        </div>

        {/* Footer Actions */}
        <div className="complete-order-footer">
          <button 
            onClick={handleBack}
            disabled={currentStep === 0}
            className="btn-secondary"
          >
            <ArrowLeft size={18} />
            Atrás
          </button>

          {currentStep < steps.length - 1 ? (
            <button 
              onClick={handleNext}
              disabled={!canProceedToNext()}
              className="btn-primary"
            >
              Siguiente
              <ArrowRight size={18} />
            </button>
          ) : (
            <button 
              onClick={handleComplete}
              disabled={loading || !canProceedToNext()}
              className="btn-primary btn-complete"
            >
              {loading ? 'Procesando...' : 'Completar Pedido'}
              <Check size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== STEP COMPONENTS ====================

const DeliveryTypeStep = ({ formData, setFormData }) => {
  return (
    <div className="step-content">
      <h3>Selecciona el tipo de entrega</h3>
      <p className="step-description">¿Cómo prefieres recibir tu pedido?</p>

      <div className="delivery-options">
        <div 
          className={`delivery-option ${formData.deliveryType === 'meetup' ? 'selected' : ''}`}
          onClick={() => setFormData({ ...formData, deliveryType: 'meetup' })}
        >
          <div className="option-icon">
            <Package size={32} />
          </div>
          <div className="option-content">
            <h4>Recoger en Punto de Encuentro</h4>
            <p>Coordinaremos un punto de encuentro para la entrega</p>
            <span className="option-badge">Gratis</span>
          </div>
        </div>

        <div 
          className={`delivery-option ${formData.deliveryType === 'delivery' ? 'selected' : ''}`}
          onClick={() => setFormData({ ...formData, deliveryType: 'delivery' })}
        >
          <div className="option-icon">
            <Truck size={32} />
          </div>
          <div className="option-content">
            <h4>Envío a Domicilio</h4>
            <p>Recibirás tu pedido en la dirección que indiques</p>
            <span className="option-badge">Costo adicional</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddressStep = ({ formData, setFormData }) => {
  if (formData.deliveryType === 'meetup') {
    return (
      <div className="step-content">
        <div className="info-message">
          <Package size={24} />
          <div>
            <h4>Punto de Encuentro</h4>
            <p>Coordinaremos contigo el punto de encuentro una vez confirmado el pedido.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-content">
      <h3>Dirección de Envío</h3>
      <p className="step-description">Selecciona o agrega una dirección de envío</p>

      <div className="address-placeholder">
        <MapPin size={48} />
        <h4>Funcionalidad en Desarrollo</h4>
        <p>La gestión de direcciones estará disponible próximamente.</p>
        <p className="placeholder-note">Por ahora, coordinaremos la dirección contigo después de confirmar el pedido.</p>
      </div>

      {/* Temporary bypass for development */}
      <button 
        onClick={() => setFormData({ ...formData, shippingAddress: { placeholder: true } })}
        className="btn-secondary"
        style={{ marginTop: '1rem' }}
      >
        Continuar (Coordinar después)
      </button>
    </div>
  );
};

const PaymentMethodStep = ({ formData, setFormData }) => {
  const { methods, loading } = usePaymentMethods();

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Efectivo',
      description: 'Pago en efectivo al momento de la entrega',
      icon: '💵'
    },
    {
      id: 'online',
      name: 'Pago en Línea',
      description: 'Usa una tarjeta guardada',
      icon: '💳'
    }
  ];

  const handleCvcChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    setFormData({ ...formData, cvc: value });
  };

  const formatCardNumber = (card) => {
    return `**** **** **** ${card.lastFour || '****'}`;
  };

  const formatCardBrand = (brand) => {
    if (!brand || brand === 'unknown') return 'Tarjeta';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <div className="step-content">
      <h3>Método de Pago</h3>
      <p className="step-description">Selecciona cómo deseas pagar tu pedido</p>

      {/* Payment Method Selection */}
      <div className="payment-methods">
        {paymentMethods.map(method => (
          <div 
            key={method.id}
            className={`payment-method-modal ${formData.paymentMethod === method.id ? 'selected' : ''}`}
            onClick={() => setFormData({ ...formData, paymentMethod: method.id, selectedCard: null, cvc: '' })}
          >
            <div className="payment-icon">{method.icon}</div>
            <div className="payment-info">
              <h4>{method.name}</h4>
              <p>{method.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Show saved cards if online payment is selected */}
      {formData.paymentMethod === 'online' && (
        <div className="saved-cards-section">
          <h4>Selecciona una Tarjeta</h4>
          
          {loading ? (
            <div className="loading-cards">
              <p>Cargando tarjetas...</p>
            </div>
          ) : methods.length === 0 ? (
            <div className="no-cards-message">
              <AlertCircle size={32} />
              <p>No tienes tarjetas guardadas</p>
              <small>Ve a tu perfil para agregar una tarjeta</small>
            </div>
          ) : (
            <>
              <div className="saved-cards-list">
                {methods.map((card) => (
                  <div
                    key={card.id}
                    className={`saved-card-item ${formData.selectedCard?.id === card.id ? 'selected' : ''} ${card.isExpired ? 'expired' : ''}`}
                    onClick={() => !card.isExpired && setFormData({ ...formData, selectedCard: card, cvc: '' })}
                  >
                    <div className="card-radio">
                      {formData.selectedCard?.id === card.id && <Check size={16} />}
                    </div>
                    <div className="card-details-compact">
                      <div className="card-brand-row">
                        <CreditCard size={20} />
                        <span className="brand-name">{formatCardBrand(card.cardBrand)}</span>
                        {card.isDefault && (
                          <span className="default-badge">
                            <Star size={12} fill="currentColor" />
                            Por Defecto
                          </span>
                        )}
                      </div>
                      <div className="card-number-compact">{formatCardNumber(card)}</div>
                      <div className="card-expiry-compact">
                        Expira: {card.expiryMonth}/{card.expiryYear}
                      </div>
                      {card.nickname && (
                        <div className="card-nickname-compact">{card.nickname}</div>
                      )}
                      {card.isExpired && (
                        <div className="card-expired-badge">
                          <AlertCircle size={14} />
                          Expirada
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* CVC Input - Show only when card is selected */}
              {formData.selectedCard && (
                <div className="cvc-input-section">
                  <label htmlFor="cvc-input">
                    <strong>Código de Seguridad (CVC)</strong>
                  </label>
                  <p className="cvc-description">
                    Ingresa el CVC de tu tarjeta {formatCardBrand(formData.selectedCard.cardBrand)} terminada en {formData.selectedCard.lastFour}
                  </p>
                  <input
                    id="cvc-input"
                    type="text"
                    placeholder="123"
                    value={formData.cvc}
                    onChange={handleCvcChange}
                    maxLength="4"
                    className="cvc-input"
                    autoComplete="off"
                  />
                  <small className="cvc-note">
                    🔒 Tu CVC no se almacena por seguridad
                  </small>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ConfirmationStep = ({ formData, design }) => {
  return (
    <div className="step-content">
      <h3>Confirmar Información</h3>
      <p className="step-description">Revisa los detalles de tu pedido antes de confirmar</p>

      <div className="confirmation-summary">
        <div className="summary-section">
          <h4>Diseño</h4>
          <div className="summary-item">
            <span className="item-label">Nombre:</span>
            <span className="item-value">{design?.name || 'Sin nombre'}</span>
          </div>
          <div className="summary-item">
            <span className="item-label">Producto:</span>
            <span className="item-value">{design?.product?.name || 'N/A'}</span>
          </div>
          <div className="summary-item">
            <span className="item-label">Precio:</span>
            <span className="item-value">${design?.price || '0'}</span>
          </div>
        </div>

        <div className="summary-section">
          <h4>Entrega</h4>
          <div className="summary-item">
            <span className="item-label">Tipo:</span>
            <span className="item-value">
              {formData.deliveryType === 'meetup' ? 'Punto de Encuentro' : 'Envío a Domicilio'}
            </span>
          </div>
          {formData.deliveryType === 'delivery' && (
            <div className="summary-item">
              <span className="item-label">Dirección:</span>
              <span className="item-value">A coordinar</span>
            </div>
          )}
        </div>

        <div className="summary-section">
          <h4>Pago</h4>
          <div className="summary-item">
            <span className="item-label">Método:</span>
            <span className="item-value">
              {formData.paymentMethod === 'cash' ? 'Efectivo' : 'Pago en Línea'}
            </span>
          </div>
          {formData.paymentMethod === 'online' && formData.selectedCard && (
            <>
              <div className="summary-item">
                <span className="item-label">Tarjeta:</span>
                <span className="item-value">
                  {formData.selectedCard.cardBrand?.toUpperCase()} **** {formData.selectedCard.lastFour}
                </span>
              </div>
              <div className="summary-item">
                <span className="item-label">Titular:</span>
                <span className="item-value">{formData.selectedCard.cardHolderName}</span>
              </div>
              {formData.selectedCard.nickname && (
                <div className="summary-item">
                  <span className="item-label">Alias:</span>
                  <span className="item-value">{formData.selectedCard.nickname}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="confirmation-note">
        <p>Al confirmar, tu pedido será procesado y recibirás notificaciones sobre su estado.</p>
      </div>
    </div>
  );
};

export default CompleteOrderModal;
