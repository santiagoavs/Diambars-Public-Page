// components/orders/completeOrderModal.jsx
import React, { useState, useEffect } from 'react';
import { X, MapPin, CreditCard, Truck, Package, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import './completeOrderModal.css';

const CompleteOrderModal = ({ isOpen, onClose, design, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    deliveryType: 'meetup',
    shippingAddress: null,
    paymentMethod: 'cash',
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
      case 2: return formData.paymentMethod;
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
  const paymentMethods = [
    {
      id: 'cash',
      name: 'Efectivo',
      description: 'Pago en efectivo al momento de la entrega',
      icon: '💵'
    },
    {
      id: 'bank_transfer',
      name: 'Transferencia Bancaria',
      description: 'Transferencia a cuenta bancaria',
      icon: '🏦',
      disabled: true,
      note: 'Próximamente disponible'
    },
    {
      id: 'wompi',
      name: 'Pago en Línea',
      description: 'Tarjeta de crédito/débito o PSE',
      icon: '💳',
      disabled: true,
      note: 'Próximamente disponible'
    }
  ];

  return (
    <div className="step-content">
      <h3>Método de Pago</h3>
      <p className="step-description">Selecciona cómo deseas pagar tu pedido</p>

      <div className="payment-methods">
        {paymentMethods.map(method => (
          <div 
            key={method.id}
            className={`payment-method ${formData.paymentMethod === method.id ? 'selected' : ''} ${method.disabled ? 'disabled' : ''}`}
            onClick={() => !method.disabled && setFormData({ ...formData, paymentMethod: method.id })}
          >
            <div className="payment-icon">{method.icon}</div>
            <div className="payment-info">
              <h4>{method.name}</h4>
              <p>{method.description}</p>
              {method.note && <span className="payment-note">{method.note}</span>}
            </div>
          </div>
        ))}
      </div>
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
              {formData.paymentMethod === 'cash' ? 'Efectivo' : 
               formData.paymentMethod === 'bank_transfer' ? 'Transferencia Bancaria' : 
               'Pago en Línea'}
            </span>
          </div>
        </div>
      </div>

      <div className="confirmation-note">
        <p>Al confirmar, tu pedido será procesado y recibirás notificaciones sobre su estado.</p>
      </div>
    </div>
  );
};

export default CompleteOrderModal;
