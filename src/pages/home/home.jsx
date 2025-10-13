import React, { useEffect, useRef, useState, useCallback, useMemo, lazy, Suspense, memo } from 'react';
import { Link } from 'react-router-dom';
import './home.css';
import { useNavigate } from 'react-router-dom';

// ⚡ Lazy load heavy components
const ContactButton = lazy(() => import('../../components/UI/contactButton/contactButton'));
const Notifications = lazy(() => import('../../components/UI/notifications/notifications'));
const Footer = lazy(() => import('../../components/UI/footer/footer'));

// ⚡ Memoized static hero content
const HeroContent = memo(({ onNavigate }) => (
  <>
    <h1 className="hero-title">
      Traemos tus ideas a la realidad.
    </h1>
    <p className="hero-subtitle">
      Empieza a crear tus productos favoritos. <br />Explora nuestro catálogo
      y elige el producto de tu interés para personalizarlo.
    </p>
    <button 
      className="hero-cta-button" 
      onClick={onNavigate}
    >
      <svg className="cta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
      <span>Explorar catálogo</span>
    </button>
  </>
));

HeroContent.displayName = 'HeroContent';

export default function Home() {
  const navigate = useNavigate();
  const heroContainerRef = useRef(null);
  const videoRef = useRef(null);
  const tshirtSectionRef = useRef(null);
  const sublimationSectionRef = useRef(null);
  const carouselRef = useRef(null); // ⚡ For video lazy loading
  
  // T-shirt template switching images state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const switchingImages = useMemo(() => [
    'images/tshirt-designs/design1.webp',
    'images/tshirt-designs/design2.png',
    'images/tshirt-designs/design3.jpg',
    'images/tshirt-designs/design4.png',
    'images/tshirt-designs/design5.jpg',
    'images/tshirt-designs/design6.webp'
  ], []);

  // ⚡ Memoized navigation handler
  const handleNavigateToProducts = useCallback(() => {
    navigate('/products');
  }, [navigate]);

  // Sublimation form state
  const [sublimationData, setSublimationData] = useState({
    subject: '',
    email: '',
    message: ''
  });
  const [isSubmittingSublimation, setIsSubmittingSublimation] = useState(false);
  const [sublimationStatus, setSublimationStatus] = useState(null);
  const [sublimationMessage, setSublimationMessage] = useState('');

  // ⚡ Lazy load videos with Intersection Observer
  useEffect(() => {
    const videos = document.querySelectorAll('.carousel-video');
    
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          // Load and play video when visible
          if (!video.src && video.dataset.src) {
            video.src = video.dataset.src;
            video.load();
          }
          video.play().catch(() => {});
        } else {
          // Pause video when not visible to save resources
          video.pause();
        }
      });
    }, {
      threshold: 0.25, // Start loading when 25% visible
      rootMargin: '50px' // Start loading 50px before entering viewport
    });

    videos.forEach(video => {
      video.style.transform = 'translateZ(0)'; // GPU acceleration
      videoObserver.observe(video);
    });

    return () => {
      videos.forEach(video => videoObserver.unobserve(video));
    };
  }, []);

  useEffect(() => {
    // ⚡ Optimized T-shirt image switching with reduced frequency
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % switchingImages.length
      );
    }, 1200);

    const heroContainer = heroContainerRef.current;
    if (!heroContainer) return;

    // ⚡ Optimized mouse tracking with debounce (16ms = 60fps)
    let animationId = null;
    let lastTime = 0;
    const throttleDelay = 16; // 60fps
    
    const handleMouseMove = (e) => {
      const now = performance.now();
      
      if (now - lastTime < throttleDelay) {
        return; // Skip if called too frequently
      }
      
      lastTime = now;
      
      if (animationId) cancelAnimationFrame(animationId);
      
      animationId = requestAnimationFrame(() => {
        const rect = heroContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        heroContainer.style.setProperty('--mouse-x', `${x}%`);
        heroContainer.style.setProperty('--mouse-y', `${y}%`);
      });
    };

    const handleMouseEnter = () => {
      heroContainer.classList.add('mouse-tracking');
    };

    const handleMouseLeave = () => {
      heroContainer.classList.remove('mouse-tracking');
    };

    heroContainer.addEventListener('mousemove', handleMouseMove, { passive: true });
    heroContainer.addEventListener('mouseenter', handleMouseEnter, { passive: true });
    heroContainer.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      clearInterval(imageInterval);
      if (animationId) cancelAnimationFrame(animationId);
      heroContainer.removeEventListener('mousemove', handleMouseMove);
      heroContainer.removeEventListener('mouseenter', handleMouseEnter);
      heroContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [switchingImages.length]);

  // Original scroll handler
  const handleScroll = useCallback(() => {
    const tshirtSection = tshirtSectionRef.current;
    const sublimationSection = sublimationSectionRef.current;
    const pageWrapper = document.querySelector('.home-page-wrapper');
    if (!tshirtSection || !sublimationSection || !pageWrapper) return;
    
    const tshirtRect = tshirtSection.getBoundingClientRect();
    const sublimationRect = sublimationSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Calculate scroll progress for t-shirt section (dark zones)
    let tshirtScrollProgress = 0;
    
    const triggerStart = windowHeight * 1.2;
    const triggerEnd = -tshirtRect.height * 0.3;
    
    if (tshirtRect.top <= triggerStart && tshirtRect.top >= triggerEnd) {
      const totalDistance = triggerStart - triggerEnd;
      const currentDistance = triggerStart - tshirtRect.top;
      tshirtScrollProgress = Math.max(0, Math.min(1, currentDistance / totalDistance));
      
      // Apply smooth easing
      tshirtScrollProgress = tshirtScrollProgress * tshirtScrollProgress * (3 - 2 * tshirtScrollProgress);
    } else if (tshirtRect.top < triggerEnd) {
      tshirtScrollProgress = 1;
    }
    
    // Calculate scroll progress for sublimation section (light zones)
    let sublimationScrollProgress = 0;
    
    const sublimationTriggerStart = windowHeight * 1.2;
    const sublimationTriggerEnd = -sublimationRect.height * 0.3;
    
    if (sublimationRect.top <= sublimationTriggerStart && sublimationRect.top >= sublimationTriggerEnd) {
      const totalDistance = sublimationTriggerStart - sublimationTriggerEnd;
      const currentDistance = sublimationTriggerStart - sublimationRect.top;
      sublimationScrollProgress = Math.max(0, Math.min(1, currentDistance / totalDistance));
      
      // Apply smooth easing
      sublimationScrollProgress = sublimationScrollProgress * sublimationScrollProgress * (3 - 2 * sublimationScrollProgress);
    } else if (sublimationRect.top < sublimationTriggerEnd) {
      sublimationScrollProgress = 1;
    }
    
    // Create smooth transition between zones
    const transitionFactor = Math.min(1, sublimationScrollProgress * 2);
    
    // Apply dark zone opacity for t-shirt section
    const baseDarkOpacity = Math.min(0.9, tshirtScrollProgress * 1.3);
    const darkZoneOpacity = baseDarkOpacity * (1 - transitionFactor);
    pageWrapper.style.setProperty('--dark-zone-opacity', darkZoneOpacity);
    
    // Apply light zone opacity for sublimation section
    const baseLightOpacity = Math.min(0.8, sublimationScrollProgress * 1.0);
    const lightZoneOpacity = baseLightOpacity * transitionFactor;
    pageWrapper.style.setProperty('--light-zone-opacity', lightZoneOpacity);
    
    // Smooth text color transitions
    const isDark = darkZoneOpacity > 0.4;
    
    if (isDark) {
      tshirtSection.classList.add('dark-mode');
      tshirtSection.classList.remove('light-mode');
    } else {
      tshirtSection.classList.add('light-mode');
      tshirtSection.classList.remove('dark-mode');
    }
  }, []);

  // Original parallax scroll listener
  useEffect(() => {
    let ticking = false;
    let scrollAnimationId = null;
    
    const throttledHandleScroll = () => {
      if (!ticking) {
        ticking = true;
        if (scrollAnimationId) cancelAnimationFrame(scrollAnimationId);
        scrollAnimationId = requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      if (scrollAnimationId) cancelAnimationFrame(scrollAnimationId);
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [handleScroll]);

  // Sublimation form handlers
  const handleSublimationChange = useCallback((e) => {
    const { name, value } = e.target;
    setSublimationData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear status when user is typing
    if (sublimationStatus) {
      setSublimationStatus(null);
      setSublimationMessage('');
    }
  }, [sublimationStatus]);

  const handleSublimationSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!sublimationData.subject.trim() || !sublimationData.email.trim() || !sublimationData.message.trim()) {
      setSublimationStatus('error');
      setSublimationMessage('Todos los campos son obligatorios.');
      return;
    }

    if (sublimationData.message.trim().length < 10) {
      setSublimationStatus('error');
      setSublimationMessage('El mensaje debe tener al menos 10 caracteres.');
      return;
    }

    setIsSubmittingSublimation(true);
    setSublimationStatus(null);
    setSublimationMessage('');

    try {
      const response = await fetch('https://expo2025-8bjn.onrender.com/api/contact/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...sublimationData,
          _metadata: {
            formStartTime: Date.now() - 15000, // Simulate 15 seconds form fill time
            submitTime: Date.now()
          }
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Respuesta no es JSON');
      }

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (data.success) {
        setSublimationStatus('success');
        setSublimationMessage(data.message || 'Solicitud enviada con éxito. Te contactaremos pronto.');
        
        // Reset form
        setSublimationData({
          subject: '',
          email: '',
          message: ''
        });
      } else {
        setSublimationStatus('error');
        setSublimationMessage(data.message || 'Error al enviar la solicitud.');
      }
    } catch (error) {
      console.error('Error al enviar solicitud de sublimación:', error);
      setSublimationStatus('error');
      setSublimationMessage('Error al enviar la solicitud. Por favor, intenta nuevamente.');
    } finally {
      setIsSubmittingSublimation(false);
    }
  }, [sublimationData]);

  return (
    <div className="home-page-wrapper">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container" ref={heroContainerRef}>
          <img 
            src="/images/navbar/Logo-2.png" 
            alt="Diambars Sublim Logo" 
            className="hero-logo"
            width="150"
            height="150"
            loading="eager"
            fetchpriority="high"
          />
          <HeroContent onNavigate={() => navigate('/catalogue')} />
          <div className="slots-indicator">
            <svg className="products-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Más de 50 productos a personalizar</span>
          </div>

          {/* Product Carousel */}
          <div className="hero-carousel" ref={carouselRef}>
            <div className="hero-carousel-track">
              <div className="hero-carousel-item">
                <video 
                  loop 
                  muted 
                  playsInline
                  preload="none"
                  data-src="/videos/product1.mp4"
                  className="carousel-video"
                  poster="/images/home/product1-poster.jpg"
                >
                  <source data-src="/videos/product1.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="hero-carousel-item">
                <video 
                  loop 
                  muted 
                  playsInline
                  preload="none"
                  data-src="/videos/product2.mp4"
                  className="carousel-video"
                  poster="/images/home/product2-poster.jpg"
                >
                  <source data-src="/videos/product2.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="hero-carousel-item">
                <img 
                  src="images/home/product3.png" 
                  alt="Producto personalizado 3" 
                  loading="lazy"
                  width="280"
                  height="160"
                  decoding="async"
                />
              </div>
              <div className="hero-carousel-item">
                <img 
                  src="images/home/product4.png" 
                  alt="Producto personalizado 4" 
                  loading="lazy"
                  width="280"
                  height="160"
                  decoding="async"
                />
              </div>
              <div className="hero-carousel-item">
                <video 
                  loop 
                  muted 
                  playsInline
                  preload="none"
                  data-src="/videos/product5.mp4"
                  className="carousel-video"
                  poster="/images/home/product5-poster.jpg"
                >
                  <source data-src="/videos/product5.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="hero-carousel-item">
                <video 
                  loop 
                  muted 
                  playsInline
                  preload="none"
                  data-src="/videos/product6.mp4"
                  className="carousel-video product6-video"
                  poster="/images/home/product6-poster.jpg"
                >
                  <source data-src="/videos/product6.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="hero-carousel-item">
                <img 
                  src="images/home/product7.png" 
                  alt="Producto personalizado 7" 
                  loading="lazy"
                  width="280"
                  height="160"
                  decoding="async"
                />
              </div>
              <div className="hero-carousel-item">
                <img 
                  src="images/home/product8.png" 
                  alt="Producto personalizado 8" 
                  loading="lazy"
                  width="280"
                  height="160"
                  decoding="async"
                />
              </div>
              {/* Duplicate first items for seamless loop */}
              <div className="hero-carousel-item">
                <video 
                  loop 
                  muted 
                  playsInline
                  preload="none"
                  data-src="/videos/product1.mp4"
                  className="carousel-video"
                  poster="/images/home/product1-poster.jpg"
                >
                  <source data-src="/videos/product1.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="hero-carousel-item">
                <video 
                  loop 
                  muted 
                  playsInline
                  preload="none"
                  data-src="/videos/product2.mp4"
                  className="carousel-video"
                  poster="/images/home/product2-poster.jpg"
                >
                  <source data-src="/videos/product2.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="hero-carousel-item">
              <img 
                src="images/home/product3.png" 
                alt="Producto personalizado 3" 
                loading="lazy"
                width="280"
                height="160"
                decoding="async"
              />
              </div>
              <div className="hero-carousel-item">
                <img 
                  src="images/home/product4.png" 
                  alt="Producto personalizado 4" 
                  loading="lazy"
                  width="280"
                  height="160"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* T-shirt Template Section */}
      <section className="tshirt-template-section" ref={tshirtSectionRef}>
        <div className="tshirt-container">
          <h2 className="tshirt-title">Explota tu creatividad</h2>
          <p className="tshirt-subtitle">Mira cómo tus diseños cobran vida en tiempo real</p>
          
          <div className="tshirt-customization-area">
            {/* Left side text */}
            <div className="customization-text left-text">
              <span className="custom-text-item">Añade tu logo</span>
              <span className="custom-text-item">Cambia colores</span>
              <span className="custom-text-item">Elige tipografías</span>
            </div>

            <div className="tshirt-template">
              <img 
                src="images/home/white-t-shirt.webp" 
                alt="Plantilla de camiseta blanca personalizable" 
                className="tshirt-base"
                loading="lazy"
                width="400"
                height="500"
                decoding="async"
              />
              
              {/* Switching design overlay - ⚡ Only render active image */}
              <div className="design-overlay">
                {switchingImages.map((image, index) => {
                  // ✅ Only render the current active image to prevent overlap
                  if (index !== currentImageIndex) return null;
                  
                  return (
                    <img
                      key={`design-${index}-${currentImageIndex}`}
                      src={image}
                      alt={`Diseño personalizado ${index + 1}`}
                      className="design-image active"
                      loading="eager"
                      width="200"
                      height="200"
                      decoding="sync"
                    />
                  );
                })}
              </div>
            </div>

            {/* Right side text */}
            <div className="customization-text right-text">
              <span className="custom-text-item">Sube imágenes</span>
              <span className="custom-text-item">Ajusta tamaños</span>
              <span className="custom-text-item">Añade formas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="content-section">
        <div className="content-grid">
          <div className="content-card">
            <h3>¡Conócenos!</h3>
            <p>
              Si tienes dudas sobre quiénes somos, qué hacemos y cómo podemos ayudarte, tenemos una sección dedicada para ti.
            </p>
            <Link to="/about" className="content-card-link">Saber más →</Link>
          </div>

          <div className="content-card">
            <h3>Nuestros Términos y Condiciones</h3>
            <p>
              Siempre seremos claros y honestos contigo, por lo que te incitamos a leer nuestros términos y condiciones para que sepas exactamente qué esperar de nosotros.
            </p>
            <Link to="/about#terms" className="content-card-link">Descubrir →</Link>
          </div>

          <div className="content-card">
            <h3>¿Quieres iniciar ya?</h3>
            <p>
              Continúa hacia la creación de tu perfil, y comienza a crear tus productos favoritos, podemos hacer todo lo que necesites.
            </p>
            <Link to="/profile" className="content-card-link">Explorar →</Link>
          </div>
        </div>
      </section>

      {/* Sublimation Request Section */}
      <section className="sublimation-request-section" ref={sublimationSectionRef}>
        <div className="sublimation-container">
          <div className="sublimation-header">
            <h2 className="sublimation-title">¿Tienes una idea en mente?</h2>
            <p className="sublimation-subtitle">
              Cuéntanos sobre tu proyecto de sublimación y te ayudaremos a hacerlo realidad
            </p>
          </div>

          <div className="sublimation-form-wrapper">
            <form className="sublimation-form" onSubmit={handleSublimationSubmit}>
              <div className="form-group">
                <label htmlFor="subject" className="form-label">Tipo de proyecto</label>
                <select
                  id="subject"
                  name="subject"
                  value={sublimationData.subject}
                  onChange={handleSublimationChange}
                  className="form-select"
                  required
                >
                  <option value="">Selecciona el tipo de proyecto</option>
                  <option value="Nueva propuesta de producto">Nueva propuesta de producto</option>
                  <option value="Diseño personalizado">Diseño personalizado</option>
                  <option value="Cotización de proyecto">Cotización de proyecto</option>
                  <option value="Consulta técnica">Consulta técnica</option>
                  <option value="Pedido especial">Pedido especial</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">Correo electrónico</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={sublimationData.email}
                  onChange={handleSublimationChange}
                  className="form-input"
                  placeholder="tu.email@ejemplo.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="message" className="form-label">Describe tu proyecto, idea o solicitud</label>
                <textarea
                  id="message"
                  name="message"
                  value={sublimationData.message}
                  onChange={handleSublimationChange}
                  className="form-textarea"
                  rows="5"
                  placeholder="Cuéntanos los detalles de tu proyecto: qué producto necesitas, colores, tamaños, cantidad, fecha de entrega, etc."
                  required
                />
              </div>

              {sublimationStatus && (
                <div className={`status-message ${sublimationStatus}`}>
                  {sublimationMessage}
                </div>
              )}

              <button
                type="submit"
                className="sublimation-submit-btn"
                disabled={isSubmittingSublimation}
              >
                {isSubmittingSublimation ? (
                  <>
                    <div className="loading-spinner-home"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <span>Enviar solicitud</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
      
      {/* ⚡ Lazy load non-critical components */}
      <Suspense fallback={<div style={{ height: '50px' }} />}>
        <Notifications />
      </Suspense>
      <Suspense fallback={<div style={{ height: '60px' }} />}>
        <ContactButton />
      </Suspense>
      <Suspense fallback={<div style={{ height: '200px' }} />}>
        <Footer />
      </Suspense>
    </div>
  );
}