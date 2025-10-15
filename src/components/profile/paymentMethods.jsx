// components/profile/PaymentMethods.jsx - Redesigned with designViewerModal structure
import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, CreditCard, Plus, Edit2, Trash2, Star, Check, AlertCircle, AlertTriangle } from 'lucide-react';
import Cards from 'react-credit-cards-2';
import 'react-credit-cards-2/dist/es/styles-compiled.css';
import './paymentMethods.css';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import { useAuth } from '../../context/authContext';
import Swal from 'sweetalert2';

const PaymentMethods = () => {
  const { isAuthenticated } = useAuth();
  const {
    methods,
    loading,
    error,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    togglePaymentMethod,
    refreshMethods,
    clearError
  } = usePaymentMethods();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Estado para el formulario de la tarjeta (CON CVC para tokenización)
  const [cardForm, setCardForm] = useState({
    number: '',
    name: '',
    expiry: '',
    cvc: '',
    nickname: '',
    focus: ''
  });

  // Block body scroll when modal is open
  useEffect(() => {
    if (isModalOpen || editingMethod) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen, editingMethod]);

  // ==================== HANDLERS ====================

  const handleInputChange = useCallback((evt) => {
    const { name, value } = evt.target;
    
    if (name === 'number') {
      const formattedValue = value
        .replace(/\s/g, '')
        .replace(/(.{4})/g, '$1 ')
        .trim()
        .substring(0, 19);
      setCardForm(prev => ({ ...prev, [name]: formattedValue }));
    }
    else if (name === 'expiry') {
      const formattedValue = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .substring(0, 5);
      setCardForm(prev => ({ ...prev, [name]: formattedValue }));
    }
    else if (name === 'name') {
      setCardForm(prev => ({ ...prev, [name]: value.toUpperCase().substring(0, 30) }));
    }
    else if (name === 'cvc') {
      const formattedValue = value.replace(/\D/g, '').substring(0, 4);
      setCardForm(prev => ({ ...prev, [name]: formattedValue }));
    }
    else if (name === 'nickname') {
      setCardForm(prev => ({ ...prev, [name]: value.substring(0, 50) }));
    }
    else {
      setCardForm(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleInputFocus = useCallback((evt) => {
    setCardForm(prev => ({ ...prev, focus: evt.target.name }));
  }, []);

  const resetForm = useCallback(() => {
    setCardForm({
      number: '',
      name: '',
      expiry: '',
      cvc: '',
      nickname: '',
      focus: ''
    });
  }, []);

  const handleAddMethod = async () => {
    try {
      setSubmitting(true);
      clearError();
      
      await addPaymentMethod(cardForm);
      
      await Swal.fire({
        icon: 'success',
        title: 'Tarjeta agregada',
        text: 'Tu método de pago ha sido guardado exitosamente',
        confirmButtonColor: '#3F2724',
        timer: 3000,
        timerProgressBar: true
      });
      
      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Error agregando método de pago',
        confirmButtonColor: '#3F2724'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMethod = async () => {
    try {
      setSubmitting(true);
      clearError();

      const updateData = {
        nickname: cardForm.nickname
      };

      await updatePaymentMethod(getCardId(editingMethod), updateData);
      
      await Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'Método de pago actualizado exitosamente',
        confirmButtonColor: '#3F2724',
        timer: 2000,
        timerProgressBar: true
      });
      
      resetForm();
      setEditingMethod(null);
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Error actualizando método de pago',
        confirmButtonColor: '#3F2724'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMethod = async (methodId) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar tarjeta?',
      text: 'Esta acción no se puede deshacer',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      setSubmitting(true);
      clearError();
      
      await deletePaymentMethod(methodId);
      
      await Swal.fire({
        icon: 'success',
        title: 'Eliminada',
        text: 'Método de pago eliminado exitosamente',
        confirmButtonColor: '#3F2724',
        timer: 2000,
        timerProgressBar: true
      });
      
      if (editingMethod && editingMethod._id === methodId) {
        closeModal();
      }
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Error eliminando método de pago',
        confirmButtonColor: '#3F2724'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMethod = async (methodId, shouldActivate) => {
    try {
      setSubmitting(true);
      clearError();
      
      await togglePaymentMethod(methodId, shouldActivate);
      
      await Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'Tarjeta establecida como por defecto',
        confirmButtonColor: '#3F2724',
        timer: 2000,
        timerProgressBar: true
      });
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Error actualizando método de pago',
        confirmButtonColor: '#3F2724'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = useCallback((method) => {
    setEditingMethod(method);
    setCardForm({
      number: '1234 5678 9012 ' + (method.lastFour || method.lastFourDigits || method.last_four_digits || '****'),
      name: method.cardHolderName || method.cardholderName || method.name || '',
      expiry: `${method.expiryMonth || ''}/${method.expiryYear || ''}`,
      cvc: '',
      nickname: method.nickname || '',
      focus: ''
    });
  }, []);

  const closeModal = useCallback(() => {
    resetForm();
    setIsModalOpen(false);
    setEditingMethod(null);
  }, [resetForm]);

  // ==================== UTILITY FUNCTIONS ====================

  const formatDisplayNumber = (method) => {
    return `**** **** **** ${method.lastFour || method.lastFourDigits || method.last_four_digits || '****'}`;
  };

  const formatCardBrand = (brand) => {
    if (!brand || brand === 'unknown') return 'Tarjeta';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const getCardStatus = (method) => {
    return method.isDefault || method.active || false;
  };

  const getCardId = (method) => {
    return method.id || method._id;
  };

  const getCardBrandIcon = (brand) => {
    // You can replace with actual brand icons later
    return <CreditCard size={24} />;
  };

  // ==================== RENDER ====================

  if (!isAuthenticated) {
    return (
      <div className="payment-container">
        <div className="payment-header">
          <h3 className="payment-title">Tus métodos de pago</h3>
        </div>
        <div className="payment-underline"></div>
        <div className="auth-required-message">
          <p>Debes iniciar sesión para gestionar tus métodos de pago.</p>
        </div>
      </div>
    );
  }

  if (loading && methods.length === 0) {
    return (
      <div className="payment-container">
        <div className="payment-header">
          <h3 className="payment-title">Tus métodos de pago</h3>
        </div>
        <div className="payment-underline"></div>
        <div className="loading-message">
          <p>Cargando métodos de pago...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="payment-container">
      <div className="payment-header">
        <h3 className="payment-title">Tus métodos de pago</h3>
        <div className="header-buttons">
          <button 
            className="address-button edit"
            onClick={refreshMethods}
            disabled={submitting || loading}
          >
            Recargar
          </button>
          <button 
            className="btn-add" 
            onClick={() => setIsModalOpen(true)}
            disabled={submitting}
          >
            Añadir
          </button>
        </div>
      </div>
      <div className="payment-underline"></div>

      {error && (
        <div className="error-message" style={{
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          padding: '10px',
          margin: '10px 0',
          color: '#c33'
        }}>
          {error}
          <button 
            onClick={clearError}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div className="payment-list">
        {methods.length === 0 ? (
          <div className="no-methods-message">
            <p>No tienes métodos de pago registrados</p>
            <small>⚠️ Nota: El CVC se solicitará en cada transacción por seguridad</small>
          </div>
        ) : (
          methods.map((method) => (
            <div key={getCardId(method)} className={`payment-method ${getCardStatus(method) ? 'active' : 'inactive'}`}>
              <p>
                <strong>{getCardStatus(method) ? 'Tarjeta por defecto' : 'Tarjeta registrada'}</strong>
                <br />{method.displayName || `${formatCardBrand(method.cardBrand)} terminada en ${method.lastFour || method.lastFourDigits || method.last_four_digits}`}<br />
                {method.isExpired && <span style={{color: 'red'}}>⚠️ Tarjeta expirada</span>}
              </p>
              <div className="payment-buttons">
                <button
                  className={`payment-button active-toggle ${getCardStatus(method) ? 'active' : ''}`}
                  onClick={() => {
                    if (!getCardStatus(method)) {
                      handleToggleMethod(getCardId(method), true);
                    }
                  }}
                  disabled={submitting || loading || method.isExpired || getCardStatus(method)}
                  aria-label={getCardStatus(method) ? 'Tarjeta por defecto' : 'Activar como por defecto'}
                >
                  {submitting ? '...' : (getCardStatus(method) ? 'Por defecto' : 'Activar')}
                </button>
                
                <button
                  className="payment-button edit"
                  onClick={() => openEditModal(method)}
                  disabled={submitting || loading}
                  aria-label="Editar"
                >
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {loading && methods.length > 0 && (
        <div className="updating-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <p>Actualizando...</p>
        </div>
      )}
    </div>

    {/* Add Card Modal - Rendered via Portal to document.body */}
    {isModalOpen && ReactDOM.createPortal(
        <div className="payment-modal-overlay" onClick={closeModal}>
          <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="payment-modal-header">
              <div>
                <h2>Agregar método de pago</h2>
                <p>Ingresa los datos de tu tarjeta de forma segura</p>
              </div>
              <button className="btn-close-modal" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="payment-modal-body">
              {/* Security Notice */}
              <div className="security-notice">
                <AlertTriangle size={20} />
                <div>
                  <strong>Seguridad:</strong>
                  <p>Usamos tokenización por Wompi. Tu tarjeta se almacenará de forma segura y encriptada.</p>
                </div>
              </div>

              {/* Card Preview */}
              <div className="card-preview-container">
                <Cards
                  number={cardForm.number || ''}
                  name={cardForm.name || ''}
                  expiry={cardForm.expiry || ''}
                  cvc={cardForm.cvc || ''}
                  focused={cardForm.focus}
                  locale={{
                    valid: 'VÁLIDA HASTA',
                    monthYear: 'MM/AA',
                    yourNameHere: 'NOMBRE AQUÍ'
                  }}
                  placeholders={{
                    name: 'TU NOMBRE'
                  }}
                />
              </div>

              {/* Card Form */}
              <form className="card-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-group">
                  <label>Número de tarjeta</label>
                  <input
                    type="text"
                    name="number"
                    placeholder="1234 5678 9012 3456"
                    value={cardForm.number}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    disabled={submitting}
                    className="form-input-payment"
                  />
                </div>

                <div className="form-group">
                  <label>Nombre en la tarjeta</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="NOMBRE APELLIDO"
                    value={cardForm.name}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    disabled={submitting}
                    className="form-input-payment"
                  />
                </div>

                <div className="form-group">
                  <label>Nombre personalizado (Opcional)</label>
                  <input
                    type="text"
                    name="nickname"
                    placeholder="Mi tarjeta personal"
                    value={cardForm.nickname}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    disabled={submitting}
                    className="form-input-payment"
                  />
                </div>

                <div className="form-row-payment">
                  <div className="form-group">
                    <label>Fecha de expiración</label>
                    <input
                      type="text"
                      name="expiry"
                      placeholder="MM/AA"
                      value={cardForm.expiry}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      disabled={submitting}
                      className="form-input-payment row"
                    />
                  </div>
                  <div className="form-group">
                    <label>CVC</label>
                    <input
                      type="text"
                      name="cvc"
                      placeholder="123"
                      value={cardForm.cvc}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      disabled={submitting}
                      maxLength="4"
                      className="form-input-payment row"
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleAddMethod} 
                  className="btn-submit-method"
                  disabled={submitting}
                >
                  {submitting ? 'Guardando...' : 'Guardar tarjeta'}
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )
    }

    {/* Edit Card Modal - Rendered via Portal to document.body */}
    {editingMethod && ReactDOM.createPortal(
        <div className="payment-modal-overlay" onClick={closeModal}>
          <div className="payment-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="payment-modal-header">
              <div>
                <h2>Editar método de pago</h2>
                <p>Solo puedes editar el nombre personalizado</p>
              </div>
              <button className="btn-close-modal" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="payment-modal-body">
              {/* Info Notice */}
              <div className="info-notice">
                <AlertCircle size={20} />
                <div>
                  <strong>Nota de seguridad</strong>
                  <p>Los datos de la tarjeta no se pueden modificar por seguridad.</p>
                </div>
              </div>

              {/* Card Preview */}
              <div className="card-preview-container">
                <Cards
                  number={cardForm.number || ''}
                  name={cardForm.name || ''}
                  expiry={cardForm.expiry || ''}
                  cvc="***"
                  focused={cardForm.focus}
                />
              </div>

              {/* Edit Form */}
              <form className="card-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-group">
                  <label>Número de tarjeta</label>
                  <input
                    type="text"
                    value={cardForm.number}
                    disabled
                    className="form-input-payment disabled"
                  />
                </div>

                <div className="form-group">
                  <label>Nombre en la tarjeta</label>
                  <input
                    type="text"
                    value={cardForm.name}
                    disabled
                    className="form-input-payment disabled"
                  />
                </div>

                <div className="form-group">
                  <label>Nombre personalizado</label>
                  <input
                    type="text"
                    name="nickname"
                    placeholder="Mi tarjeta personal"
                    value={cardForm.nickname}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    disabled={submitting}
                    className="form-input-payment"
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de expiración</label>
                  <input
                    type="text"
                    value={cardForm.expiry}
                    disabled
                    className="form-input-payment disabled"
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={handleEditMethod}
                    className="btn-submit-method"
                    disabled={submitting}
                  >
                    {submitting ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMethod(getCardId(editingMethod))}
                    className="btn-delete-card"
                    disabled={submitting}
                  >
                    {submitting ? 'Eliminando...' : 'Eliminar tarjeta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )
    }
    </>
  );
};

export default PaymentMethods;
