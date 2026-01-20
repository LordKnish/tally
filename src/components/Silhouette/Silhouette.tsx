import { useState } from 'react';
import { ImageZoomModal } from '../ImageZoomModal/ImageZoomModal';
import './Silhouette.css';

export interface SilhouetteProps {
  /** Base64-encoded image source (data:image/png;base64,...) */
  src: string;
  /** Alt text for accessibility */
  alt?: string;
  /** URL of historical photo to reveal */
  photoUrl?: string;
  /** Aircraft name for photo alt text */
  aircraftName?: string;
  /** Whether to reveal the photo */
  showPhoto?: boolean;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Silhouette component displays the aircraft line art on a light background.
 * This is the core visual shown on Turn 1.
 * When showPhoto is true, the historical photo fades in to replace the line art.
 * Click on the image to open a modal with zoom and pan capabilities.
 */
export function Silhouette({
  src,
  alt = 'Aircraft silhouette',
  photoUrl,
  aircraftName,
  showPhoto = false,
  className = '',
}: SilhouetteProps) {
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  // Determine which image to show in the modal
  const modalImageSrc = showPhoto && photoLoaded && photoUrl ? photoUrl : src;
  const modalImageAlt = showPhoto && photoLoaded && photoUrl
    ? (aircraftName ? `Historical photograph of ${aircraftName}` : 'Historical photograph')
    : alt;

  const handleImageClick = () => {
    setIsZoomModalOpen(true);
  };

  return (
    <>
      <div
        className={`silhouette ${className}`.trim()}
        onClick={handleImageClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleImageClick();
          }
        }}
        aria-label="Click to zoom image"
      >
        <img
          src={src}
          alt={alt}
          className={`silhouette__image ${showPhoto && photoLoaded ? 'silhouette__image--hidden' : ''}`}
          draggable={false}
        />
        {photoUrl && showPhoto && (
          <img
            src={photoUrl}
            alt={aircraftName ? `Historical photograph of ${aircraftName}` : 'Historical photograph'}
            className={`silhouette__photo ${photoLoaded ? 'silhouette__photo--visible' : ''}`}
            onLoad={() => setPhotoLoaded(true)}
            draggable={false}
          />
        )}
        <div className="silhouette__zoom-hint">
          <span className="silhouette__zoom-icon">🔍</span>
          <span className="silhouette__zoom-text">Click to zoom</span>
        </div>
      </div>
      
      <ImageZoomModal
        src={modalImageSrc}
        alt={modalImageAlt}
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
      />
    </>
  );
}
