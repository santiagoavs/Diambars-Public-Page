// components/designs/KonvaDesignViewer.jsx - KONVA DESIGN VIEWER (CSS VERSION)
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Circle, Text, Image, Line, RegularPolygon } from 'react-konva';
import { CANVAS_CONFIG, scaleCustomizationArea, calculateScaledDimensions } from '../../utils/canvasConfig';
import { useUnifiedCanvasCentering } from '../../hooks/useUnifiedCanvasCentering';
import './KonvaDesignViewer.css';
import Swal from 'sweetalert2';

// Componente optimizado para manejar imágenes con carga asíncrona
const KonvaImageElement = React.memo(({ imageUrl, image, ...props }) => {
  // Extraer key de props para evitar warning de React
  const { key, ...restProps } = props;
  const [imageState, setImageState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const imageSource = imageUrl || image;
    
    if (!imageSource) {
      setImageState(null);
      return;
    }
    
    if (imageSource instanceof HTMLImageElement) {
      setImageState(imageSource);
      return;
    }
    
    if (typeof imageSource === 'string' && !isLoading) {
      setIsLoading(true);
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImageState(img);
        setIsLoading(false);
      };
      img.onerror = (error) => {
        console.error('Error cargando imagen:', error);
        setIsLoading(false);
      };
      img.src = imageSource;
    }
  }, [imageUrl, image, isLoading]);

  const finalImage = imageState || image;
  
  if (!finalImage || !(finalImage instanceof HTMLImageElement)) {
    return (
      <Rect
        {...restProps}
        fill={isLoading ? "#e0e0e0" : "#f0f0f0"}
        stroke="#ccc"
        strokeWidth={1}
        dash={[5, 5]}
      />
    );
  }

  return (
    <Image
      {...restProps}
      image={finalImage}
    />
  );
});

/**
 * Viewer de diseños usando Konva.js con CSS tradicional
 * Compatible con el formato de datos del backend existente
 */
const KonvaDesignViewer = ({ 
  design, 
  product, 
  enableDownload = true,
  onDownload 
}) => {
  const productColorFilter = design?.productColorFilter || null;
  
  const stageRef = useRef();
  const layerRef = useRef();
  const containerRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [customizationAreas, setCustomizationAreas] = useState([]);
  const [elements, setElements] = useState([]);
  const [productMask, setProductMask] = useState(null);

  // Hook unificado para centrado del canvas
  const {
    stageScale,
    stagePosition,
    stageConfig
  } = useUnifiedCanvasCentering(productImage?.image, containerRef);

  // ==================== CREACIÓN DE MÁSCARA DE PRODUCTO ====================

  const createProductMask = useCallback((image, colorFilter) => {
    if (!image || !colorFilter || colorFilter === '#ffffff') return null;
    
    try {
      // Crear un canvas temporal para analizar la imagen
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Dibujar la imagen en el canvas
      ctx.drawImage(image, 0, 0);
      
      // Obtener los datos de píxeles
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Crear máscara: detectar píxeles que no sean fondo blanco
      const maskData = new Uint8ClampedArray(data.length);
      
      // Convertir hex a RGB una sola vez
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
      };
      
      const colorRgb = hexToRgb(colorFilter);
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Solo colorear píxeles que claramente son del producto
        let isProduct = false;
        
        if (a < 20) {
          // Píxeles completamente transparentes - NO colorear
          isProduct = false;
        } else if (r > 250 && g > 250 && b > 250) {
          // Píxeles casi blancos puros - NO colorear (fondo)
          isProduct = false;
        } else if (r < 30 && g < 30 && b < 30) {
          // Píxeles muy oscuros - NO colorear (sombras del fondo)
          isProduct = false;
        } else {
          // Píxeles con color medio - SÍ colorear (producto)
          isProduct = true;
        }
        
        if (isProduct) {
          // Producto: usar el color seleccionado
          maskData[i] = colorRgb.r;     // R
          maskData[i + 1] = colorRgb.g; // G
          maskData[i + 2] = colorRgb.b; // B
          maskData[i + 3] = 255;        // A
        } else {
          // Fondo: transparente
          maskData[i] = 0;     // R
          maskData[i + 1] = 0; // G
          maskData[i + 2] = 0; // B
          maskData[i + 3] = 0; // A
        }
      }
      
      // Crear nueva imagen con la máscara
      const maskImageData = new ImageData(maskData, canvas.width, canvas.height);
      ctx.putImageData(maskImageData, 0, 0);
      
      // Convertir canvas a imagen
      const maskImage = new window.Image();
      maskImage.src = canvas.toDataURL();
      
      return maskImage;
    } catch (error) {
      console.error('Error creando máscara de producto:', error);
      return null;
    }
  }, []);

  // ==================== CARGA DE IMAGEN DEL PRODUCTO ====================

  const loadProductImage = useCallback(async () => {
    // Handle both data structures: product.images.main (private admin) or product.image (public)
    const productImageUrl = product?.images?.main || product?.image;
    
    if (!productImageUrl) {
      return;
    }

    try {
      const imageObj = new window.Image();
      imageObj.crossOrigin = 'anonymous';
      
      imageObj.onload = () => {
        const scaleX = CANVAS_CONFIG.width / imageObj.width;
        const scaleY = CANVAS_CONFIG.height / imageObj.height;
        const scale = Math.min(scaleX, scaleY) * CANVAS_CONFIG.productScale;
        
        const scaledDimensions = calculateScaledDimensions(imageObj.width, imageObj.height, scale);

        const productImageData = {
          image: imageObj,
          x: scaledDimensions.x,
          y: scaledDimensions.y,
          width: scaledDimensions.width,
          height: scaledDimensions.height
        };

        setProductImage(productImageData);
        
        // Crear máscara de color si es necesario
        if (productColorFilter && productColorFilter !== '#ffffff') {
          const mask = createProductMask(imageObj, productColorFilter);
          setProductMask(mask);
        } else {
          setProductMask(null);
        }
      };

      imageObj.onerror = (error) => {
        console.error('Error cargando imagen del producto:', error);
        setError('Error cargando imagen del producto');
      };

      imageObj.src = productImageUrl;
    } catch (error) {
      console.error('Error en loadProductImage:', error);
      setError('Error cargando imagen del producto');
    }
  }, [product]);

  // ==================== CARGA DE ÁREAS DE PERSONALIZACIÓN ====================

  const loadCustomizationAreas = useCallback(() => {
    if (!product?.customizationAreas) return;

    const areas = product.customizationAreas.map(area => {
      const scaledArea = scaleCustomizationArea(area, 1);
      
      return {
        id: area._id || area.id,
        name: area.name,
        ...scaledArea,
        stroke: '#10B981',
        strokeWidth: 2,
        dash: [6, 6]
      };
    });

    setCustomizationAreas(areas);
  }, [product]);

  // ==================== CARGA DE ELEMENTOS DEL DISEÑO ====================

  const loadDesignElements = useCallback(() => {
    const designElements = design?.elements || [];
    
    if (designElements.length === 0) {
      setElements([]);
      return;
    }

    const konvaElements = designElements.map((element, index) => {
      const { konvaAttrs, type, areaId } = element;
      
      // Validación: Asegurar que konvaAttrs existe
      if (!konvaAttrs) {
        console.warn(`Elemento ${index} sin konvaAttrs:`, element);
        return null;
      }
      
      const scaledX = konvaAttrs.x || 50;
      const scaledY = konvaAttrs.y || 50;
      
      const baseElement = {
        id: element._id || `element-${Date.now()}-${index}`,
        name: `${type}-${index}`,
        elementType: type,
        areaId: areaId || '',
        
        x: scaledX,
        y: scaledY,
        opacity: konvaAttrs.opacity ?? 1,
        
        rotation: konvaAttrs.rotation || 0,
        scaleX: konvaAttrs.scaleX || 1,
        scaleY: konvaAttrs.scaleY || 1,
        offsetX: konvaAttrs.offsetX || 0,
        offsetY: konvaAttrs.offsetY || 0,
        
        ...(type === 'text' && {
          text: konvaAttrs.text || 'Texto',
          fontSize: konvaAttrs.fontSize || 24,
          fontFamily: konvaAttrs.fontFamily || 'Arial',
          fontWeight: konvaAttrs.fontWeight || 'normal',
          fontStyle: konvaAttrs.fontStyle || 'normal',
          textDecoration: konvaAttrs.textDecoration || 'none',
          fill: konvaAttrs.fill || '#000000',
          stroke: konvaAttrs.stroke || 'transparent',
          strokeWidth: konvaAttrs.strokeWidth || 0,
          width: konvaAttrs.width || 200,
          height: konvaAttrs.height || 50,
          align: konvaAttrs.align || 'left',
          verticalAlign: konvaAttrs.verticalAlign || 'top',
          lineHeight: konvaAttrs.lineHeight || 1.2,
          letterSpacing: konvaAttrs.letterSpacing || 0,
          padding: konvaAttrs.padding || 0
        }),
        
        ...(type === 'rect' && {
          width: konvaAttrs.width || 100,
          height: konvaAttrs.height || 60,
          fill: konvaAttrs.fill || '#1F64BF',
          stroke: konvaAttrs.stroke || '#032CA6',
          strokeWidth: konvaAttrs.strokeWidth || 2,
          cornerRadius: konvaAttrs.cornerRadius || 0
        }),
        
        ...(type === 'circle' && {
          radius: konvaAttrs.radius || 50,
          fill: konvaAttrs.fill || '#1F64BF',
          stroke: konvaAttrs.stroke || '#032CA6',
          strokeWidth: konvaAttrs.strokeWidth || 2
        }),
        
        ...(type === 'image' && {
          width: konvaAttrs.width || 100,
          height: konvaAttrs.height || 100,
          imageUrl: konvaAttrs.imageUrl,
          image: konvaAttrs.image,
          originalName: konvaAttrs.originalName
        }),
        
        // ✅ MATCH PRIVATE ADMIN: Universal shape handler for ALL shape types
        ...(['triangle', 'pentagon', 'hexagon', 'octagon', 'star', 'heart', 'diamond', 'polygon', 'custom', 'line', 'shape', 'customShape', 'path', 'square', 'ellipse'].includes(type) && {
          // Handle points-based shapes (most shapes)
          ...(konvaAttrs.points && Array.isArray(konvaAttrs.points) && {
            points: konvaAttrs.points,
            fill: konvaAttrs.fill || '#1F64BF',
            stroke: konvaAttrs.stroke || '#032CA6',
            strokeWidth: konvaAttrs.strokeWidth || 2,
            closed: konvaAttrs.closed !== false,
            lineCap: konvaAttrs.lineCap || 'round',
            lineJoin: konvaAttrs.lineJoin || 'round',
            tension: konvaAttrs.tension || 0,
            
            // Star-specific properties
            ...(konvaAttrs.numPoints && {
              numPoints: konvaAttrs.numPoints,
              innerRadius: konvaAttrs.innerRadius,
              outerRadius: konvaAttrs.outerRadius
            })
          }),
          
          // Handle square (rect-based)
          ...(type === 'square' && {
            width: konvaAttrs.width || 80,
            height: konvaAttrs.height || 80,
            fill: konvaAttrs.fill || '#1F64BF',
            stroke: konvaAttrs.stroke || '#032CA6',
            strokeWidth: konvaAttrs.strokeWidth || 2,
            cornerRadius: konvaAttrs.cornerRadius || 0
          }),
          
          // Handle ellipse (circle-based)
          ...(type === 'ellipse' && {
            radius: konvaAttrs.radius || 50,
            scaleX: konvaAttrs.scaleX || 1.2,
            scaleY: konvaAttrs.scaleY || 0.8,
            fill: konvaAttrs.fill || '#1F64BF',
            stroke: konvaAttrs.stroke || '#032CA6',
            strokeWidth: konvaAttrs.strokeWidth || 2
          }),
          
          // Store metadata for debugging
          originalType: type,
          shapeType: element.shapeType
        })
      };

      return baseElement;
    }).filter(Boolean); // ✅ FILTRAR: Eliminar elementos null/undefined

    setElements(konvaElements);
  }, [design]);

  // ==================== RENDERIZADO DE ELEMENTOS ====================

  // Memoizar elementos procesados para evitar re-renderizados innecesarios
  const memoizedElements = useMemo(() => {
    return elements.map(element => ({ ...element }));
  }, [elements]);

  const renderElement = useCallback((element) => {

    const commonProps = {
      id: element.id,
      name: element.name,
      x: element.x,
      y: element.y,
      listening: false,
      
      rotation: element.rotation || 0,
      scaleX: element.scaleX || 1,
      scaleY: element.scaleY || 1,
      offsetX: element.offsetX || 0,
      offsetY: element.offsetY || 0,
      opacity: element.opacity || 1
    };

    switch (element.elementType) {
      case 'text':
        return (
          <Text
            key={element.id}
            {...commonProps}
            text={element.text}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily}
            fill={element.fill}
            width={element.width}
            height={element.height}
            align={element.align || 'left'}
            verticalAlign={element.verticalAlign || 'top'}
            fontWeight={element.fontWeight || 'normal'}
            fontStyle={element.fontStyle || 'normal'}
            textDecoration={element.textDecoration || ''}
          />
        );

      case 'rect':
        return (
          <Rect
            key={element.id}
            {...commonProps}
            width={element.width}
            height={element.height}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            cornerRadius={element.cornerRadius}
          />
        );

      case 'circle':
        return (
          <Circle
            key={element.id}
            {...commonProps}
            radius={element.radius}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
          />
        );

      case 'image':
        return (
          <KonvaImageElement
            key={element.id}
            {...commonProps}
            width={element.width}
            height={element.height}
            imageUrl={element.imageUrl}
            image={element.image}
            opacity={element.opacity}
          />
        );

      // Universal shape rendering for ALL shape types
      case 'triangle':
      case 'pentagon':
      case 'hexagon':
      case 'octagon':
      case 'star':
      case 'heart':
      case 'diamond':
      case 'polygon':
      case 'custom':
      case 'line':
      case 'shape':
      case 'customShape':
      case 'path':
        
        return (
          <Line
            key={element.id}
            {...commonProps}
            points={element.points}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            closed={element.closed !== false}
            lineCap={element.lineCap || 'round'}
            lineJoin={element.lineJoin || 'round'}
            tension={element.tension || 0}
          />
        );

      case 'square':
        return (
          <Rect
            key={element.id}
            {...commonProps}
            width={element.width}
            height={element.height}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            cornerRadius={element.cornerRadius}
          />
        );

      case 'ellipse':
        return (
          <Circle
            key={element.id}
            {...commonProps}
            radius={element.radius}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            scaleX={element.scaleX}
            scaleY={element.scaleY}
          />
        );

      default:
        console.warn(`Tipo de elemento no soportado: ${element.elementType}`);
        return null;
    }
  }, []);

  // ==================== EFECTOS ====================

  useEffect(() => {
    if (!design || !product) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const loadContent = async () => {
      try {
        await loadProductImage();
        loadCustomizationAreas();
        loadDesignElements();
      } catch (error) {
        console.error('Error cargando contenido:', error);
        setError('Error al cargar la vista previa del diseño');
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [design?.id, product?.id, loadProductImage, loadCustomizationAreas, loadDesignElements]);

  // Efecto para actualizar máscara cuando cambia el color del producto
  useEffect(() => {
    if (productImage?.image && productColorFilter && productColorFilter !== '#ffffff') {
      const mask = createProductMask(productImage.image, productColorFilter);
      setProductMask(mask);
    } else {
      setProductMask(null);
    }
  }, [productColorFilter, productImage?.image, createProductMask]);

  // ==================== DESCARGA ====================

  const handleDownload = useCallback(() => {
    if (!stageRef.current) {
      console.error('Stage no disponible para descarga');
      return;
    }

    try {
      const dataURL = stageRef.current.toDataURL({
        mimeType: 'image/png',
        quality: 1.0,
        pixelRatio: 2
      });
      
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `diseno-${design?.name || design?.id || 'preview'}-${Date.now()}.png`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (onDownload) {
        onDownload(dataURL);
      }

    } catch (error) {
      console.error('Error en descarga:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de descarga',
        text: 'Error al descargar la imagen',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3F2724'
      });
    }
  }, [design, onDownload]);

  // ==================== RENDER ====================

  return (
    <div className="konva-design-viewer">
      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="canvas-container-viewer"
      >
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Cargando vista previa...</p>
          </div>
        )}

        {error && (
          <div className="error-overlay">
            <div className="error-content">
              <p>{error}</p>
              <button 
                className="retry-btn"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && (!design?.elements || design.elements.length === 0) && (
          <div className="empty-overlay">
            <div className="empty-content">
              <h3>No hay elementos en este diseño</h3>
              <p>Los elementos del diseño aparecerán aquí cuando estén disponibles</p>
            </div>
          </div>
        )}

        <Stage
          ref={stageRef}
          width={stageConfig.width}
          height={stageConfig.height}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          className="design-stage"
        >
          <Layer ref={layerRef}>
            {/* Imagen del producto con máscara de color */}
            {productImage && productImage.image && (() => {
              // Aplicar máscara de color si existe
              if (productColorFilter && productColorFilter !== '#ffffff') {
                
                return (
                  <>
                    {/* Imagen base */}
                    <Image
                      image={productImage.image}
                      x={productImage.x}
                      y={productImage.y}
                      width={productImage.width}
                      height={productImage.height}
                      listening={false}
                    />
                    {/* Máscara de color que solo afecta al producto */}
                    {productMask && (
                      <Image
                        image={productMask}
                        x={productImage.x}
                        y={productImage.y}
                        width={productImage.width}
                        height={productImage.height}
                        globalCompositeOperation="multiply"
                        opacity={0.8}
                        listening={false}
                      />
                    )}
                  </>
                );
              } else {
                // Sin color: renderizar imagen normal
                return (
                  <Image
                    image={productImage.image}
                    x={productImage.x}
                    y={productImage.y}
                    width={productImage.width}
                    height={productImage.height}
                    listening={false}
                  />
                );
              }
            })()}

            {/* Áreas de personalización - Hidden in viewer */}
            {/* {customizationAreas.map(area => (
              <Rect
                key={area.id}
                {...area}
                fill="transparent"
                listening={false}
              />
            ))} */}


            {/* Elementos del diseño */}
            {memoizedElements.map(renderElement)}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default KonvaDesignViewer;
