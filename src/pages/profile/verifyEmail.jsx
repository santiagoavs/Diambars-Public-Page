// src/pages/verifyEmail/verifyEmail.jsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Footer from '../../components/UI/footer/footer';
import { resendVerificationEmail } from '../../api/resendVerificatonService.js';
import './verifyEmail.css';

export default function VerifyEmailPage() {
  const { state } = useLocation();
  const email = state?.email || 'tu correo';
  const fromLogin = state?.fromLogin || false;
  const message = state?.message || '';
  const navigate = useNavigate();
  
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(''); // 'success', 'error', ''
  const [autoSentStatus, setAutoSentStatus] = useState(''); // Para el envío automático
  const [resendMessage, setResendMessage] = useState('');

  // Enviar correo automáticamente si viene desde login
  useEffect(() => {
    if (fromLogin && email !== 'tu correo') {
      console.log('[VerifyEmailPage] Enviando correo automáticamente');
      console.log('[VerifyEmailPage] Email:', email);
      console.log('[VerifyEmailPage] fromLogin:', fromLogin);
      
      const sendVerificationEmail = async () => {
        try {
          await resendVerificationEmail(email);
          setAutoSentStatus('success');
          console.log('[VerifyEmailPage] Correo de verificación enviado automáticamente');
        } catch (error) {
          setAutoSentStatus('error');
          console.error('[VerifyEmailPage] Error al enviar correo automáticamente:', error);
        }
      };

      sendVerificationEmail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Agregar/quitar clase al body para controlar el scroll
  useEffect(() => {
    // Agregar clase al body y html cuando se monte el componente
    document.body.classList.add('verify-email-page');
    document.documentElement.classList.add('verify-email-page');

    // Cleanup: quitar la clase cuando se desmonte el componente
    return () => {
      document.body.classList.remove('verify-email-page');
      document.documentElement.classList.remove('verify-email-page');
    };
  }, []);

  const handleResendEmail = async () => {
    console.log('[VerifyEmailPage] Reenvío manual solicitado');
    console.log('[VerifyEmailPage] Email:', email);
    
    if (email === 'tu correo') {
      setResendStatus('error');
      setResendMessage('Email no válido');
      return;
    }
    
    setIsResending(true);
    setResendStatus('');
    setResendMessage('');
    
    try {
      await resendVerificationEmail(email);
      setResendStatus('success');
      setResendMessage('Correo reenviado exitosamente');
      console.log('[VerifyEmailPage] Correo reenviado exitosamente');
    } catch (error) {
      setResendStatus('error');
      setResendMessage(error.message || 'Error al reenviar el correo');
      console.error('[VerifyEmailPage] Error al reenviar correo:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/profile');
  };

  return (
    <main className="verify-page">
      <div className="verify-card">
        <div className="verify-icon">
          📧
        </div>
        
        <h1>¡Verifica tu correo!</h1>
        
        {message && (
          <div className="verify-message">
            {message}
          </div>
        )}
        
        <p className="verify-description">
          {fromLogin ? 
            `Hemos reenviado un email a` : 
            `Hemos enviado un email a`
          } <strong>{email}</strong> con un enlace para activar tu cuenta.
        </p>
        
        <p className="verify-instruction">
          Revisa tu bandeja de entrada y haz clic en el enlace de verificación.
        </p>

        {/* Mensaje de estado del envío automático */}
        {fromLogin && autoSentStatus === 'success' && (
          <div className="status-message status-success">
            ✓ Correo de verificación enviado exitosamente
          </div>
        )}
        
        {fromLogin && autoSentStatus === 'error' && (
          <div className="status-message status-error">
            ❌ Error al enviar el correo. Intenta reenviarlo manualmente.
          </div>
        )}

        <div className="verify-actions">
          <p className="verify-spam-notice">
            Si no lo ves, revisa tu carpeta de spam o solicita un nuevo envío:
          </p>
          
          <button
            className={`resend-button ${isResending ? 'loading' : ''}`}
            onClick={handleResendEmail}
            disabled={isResending || email === 'tu correo'}
          >
            {isResending ? 'Reenviando...' : 'Reenviar correo'}
          </button>

          {/* Mensaje de estado del reenvío manual */}
          {resendStatus === 'success' && (
            <div className="status-message status-success">
              ✓ {resendMessage}
            </div>
          )}
          
          {resendStatus === 'error' && (
            <div className="status-message status-error">
              ❌ {resendMessage}
            </div>
          )}
          
          <button 
            className="back-button-email"
            onClick={handleBackToLogin}
          >
            Volver al login
          </button>
        </div>
      </div>

    </main>
  );
}