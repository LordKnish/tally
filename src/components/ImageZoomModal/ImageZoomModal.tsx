import { useState, useRef, useCallback, useEffect } from 'react';
import './ImageZoomModal.css';

export interface ImageZoomModalProps {
  /** Image source URL */
  src: string;
  /** Alt text for the image */
  alt: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.25;

/**
 * ImageZoomModal component displays an image in a modal with zoom and pan capabilities.
 * - Scroll wheel or pinch to zoom
 * - Click and drag to pan when zoomed in
 * - Double click to reset zoom
 * - Click outside or press Escape to close
 */
export function ImageZoomModal({
  src,
  alt,
  isOpen,
  onClose,
}: ImageZoomModalProps) {
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset transform when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset to initial state when modal opens
      setTransform({ scale: 1, x: 0, y: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const clampTransform = useCallback((newTransform: Transform): Transform => {
    const { scale, x, y } = newTransform;
    const clampedScale = Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
    
    // When scale is 1, center the image
    if (clampedScale === 1) {
      return { scale: 1, x: 0, y: 0 };
    }

    // Calculate bounds based on how much the image extends beyond the container
    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image) {
      return { scale: clampedScale, x, y };
    }

    const containerRect = container.getBoundingClientRect();
    const scaledWidth = image.naturalWidth * clampedScale;
    const scaledHeight = image.naturalHeight * clampedScale;

    // Calculate maximum pan based on image size vs container size
    const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
    const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);

    return {
      scale: clampedScale,
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY),
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    
    setTransform((prev) => {
      const newScale = prev.scale + delta;
      return clampTransform({ ...prev, scale: newScale });
    });
  }, [clampTransform]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (transform.scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform.scale, transform.x, transform.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setTransform((prev) => clampTransform({ ...prev, x: newX, y: newY }));
  }, [isDragging, dragStart, clampTransform]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && transform.scale > 1) {
      const touch = e.touches[0];
      if (touch) {
        setIsDragging(true);
        setDragStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
      }
    }
  }, [transform.scale, transform.x, transform.y]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    setTransform((prev) => clampTransform({ ...prev, x: newX, y: newY }));
  }, [isDragging, dragStart, clampTransform]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const zoomIn = useCallback(() => {
    setTransform((prev) => clampTransform({ ...prev, scale: prev.scale + ZOOM_STEP }));
  }, [clampTransform]);

  const zoomOut = useCallback(() => {
    setTransform((prev) => clampTransform({ ...prev, scale: prev.scale - ZOOM_STEP }));
  }, [clampTransform]);

  const resetZoom = useCallback(() => {
    setTransform({ scale: 1, x: 0, y: 0 });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="image-zoom-modal__overlay" onClick={onClose}>
      <div
        className="image-zoom-modal"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        <button
          className="image-zoom-modal__close"
          onClick={onClose}
          aria-label="Close modal"
          type="button"
        >
          ×
        </button>
        
        <div className="image-zoom-modal__controls">
          <button
            className="image-zoom-modal__control-btn"
            onClick={zoomOut}
            disabled={transform.scale <= MIN_SCALE}
            aria-label="Zoom out"
            type="button"
          >
            −
          </button>
          <span className="image-zoom-modal__zoom-level">
            {Math.round(transform.scale * 100)}%
          </span>
          <button
            className="image-zoom-modal__control-btn"
            onClick={zoomIn}
            disabled={transform.scale >= MAX_SCALE}
            aria-label="Zoom in"
            type="button"
          >
            +
          </button>
          <button
            className="image-zoom-modal__control-btn image-zoom-modal__reset-btn"
            onClick={resetZoom}
            disabled={transform.scale === 1}
            aria-label="Reset zoom"
            type="button"
          >
            ⟲
          </button>
        </div>

        <div
          className={`image-zoom-modal__image-container ${isDragging ? 'image-zoom-modal__image-container--dragging' : ''}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            className="image-zoom-modal__image"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              cursor: transform.scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
            }}
            draggable={false}
          />
        </div>

        <p className="image-zoom-modal__hint">
          {transform.scale > 1 
            ? 'Drag to pan • Double-click to reset' 
            : 'Scroll to zoom • Click outside to close'}
        </p>
      </div>
    </div>
  );
}
