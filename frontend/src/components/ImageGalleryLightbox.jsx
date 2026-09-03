import React, { useState, useEffect } from 'react';
import { getFullImageUrl } from '../utils/imageUtils';

export default function ImageGalleryLightbox({ images = [], initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const fullUrl = getFullImageUrl(currentImage);

  const handleNext = () => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoom(1);
  };

  const handlePrev = () => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoom(1);
  };

  const toggleZoom = () => {
    setZoom(prev => (prev === 1 ? 1.75 : 1));
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <div style={styles.counter}>
            Image {currentIndex + 1} of {images.length}
          </div>
          <div style={styles.actions}>
            <button
              type="button"
              onClick={toggleZoom}
              style={styles.iconBtn}
              title={zoom > 1 ? "Zoom Out" : "Zoom In"}
            >
              {zoom > 1 ? '🔍 -' : '🔍 +'}
            </button>
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              style={styles.iconBtn}
              title="Open Original / Download"
              onClick={(e) => e.stopPropagation()}
            >
              ⬇️
            </a>
            <button
              type="button"
              onClick={onClose}
              style={styles.closeBtn}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Image Viewport */}
        <div style={styles.imageContainer}>
          {images.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              style={{ ...styles.navBtn, left: '16px' }}
              title="Previous (Left Arrow)"
            >
              ‹
            </button>
          )}

          <div style={styles.imgWrapper} onClick={toggleZoom}>
            <img
              src={fullUrl}
              alt={`Attachment ${currentIndex + 1}`}
              style={{
                ...styles.mainImg,
                transform: `scale(${zoom})`,
                cursor: zoom === 1 ? 'zoom-in' : 'zoom-out'
              }}
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              style={{ ...styles.navBtn, right: '16px' }}
              title="Next (Right Arrow)"
            >
              ›
            </button>
          )}
        </div>

        {/* Bottom Thumbnails Strip */}
        {images.length > 1 && (
          <div style={styles.thumbnailsStrip}>
            {images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoom(1);
                }}
                style={{
                  ...styles.thumbItem,
                  borderColor: idx === currentIndex ? 'var(--accent-blue, #2563eb)' : 'transparent',
                  opacity: idx === currentIndex ? 1 : 0.6
                }}
              >
                <img
                  src={getFullImageUrl(img)}
                  alt={`Thumb ${idx + 1}`}
                  style={styles.thumbImg}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 15, 30, 0.88)',
    backdropFilter: 'blur(8px)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalContent: {
    width: '100%',
    maxWidth: '1050px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: '12px 12px 0 0',
    color: '#ffffff',
  },
  counter: {
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '0.3px',
    color: '#e2e8f0',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.12)',
    border: 'none',
    color: '#ffffff',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'none',
    transition: 'background 0.2s ease',
  },
  closeBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#f87171',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  imgWrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
  },
  mainImg: {
    maxWidth: '92%',
    maxHeight: '92%',
    objectFit: 'contain',
    borderRadius: '8px',
    boxShadow: '0 10px 35px rgba(0, 0, 0, 0.5)',
    transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    userSelect: 'none',
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    cursor: 'pointer',
    zIndex: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    transition: 'all 0.2s ease',
  },
  thumbnailsStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: '0 0 12px 12px',
    overflowX: 'auto',
  },
  thumbItem: {
    width: '56px',
    height: '56px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '2px solid transparent',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }
};
