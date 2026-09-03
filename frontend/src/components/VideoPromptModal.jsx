import React from 'react';

export default function VideoPromptModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} className="fade-in" onClick={(e) => e.stopPropagation()}>
        <div style={styles.iconCircle}>
          🎥
        </div>
        <h3 style={styles.title}>Video Uploads Note</h3>
        <p style={styles.message}>
          To keep the portal fast and optimized, direct video file uploads are not supported.
        </p>
        <div style={styles.tipBox}>
          <div style={styles.tipHeader}>💡 Recommended Approach:</div>
          <p style={styles.tipText}>
            Please upload your screen recording or video to <strong>Google Drive</strong>, <strong>OneDrive</strong>, or <strong>Loom</strong>, and paste the shared link in the ticket description / comments.
          </p>
        </div>
        <button type="button" onClick={onClose} style={styles.confirmBtn}>
          Got it
        </button>
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(4px)',
    zIndex: 2100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    margin: '0 auto 16px auto',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  message: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.5',
    margin: '0 0 16px 0',
  },
  tipBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px 14px',
    textAlign: 'left',
    marginBottom: '20px',
  },
  tipHeader: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: '4px',
  },
  tipText: {
    fontSize: '12.5px',
    color: '#334155',
    lineHeight: '1.5',
    margin: 0,
  },
  confirmBtn: {
    width: '100%',
    padding: '10px 18px',
    backgroundColor: 'var(--accent-blue, #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  }
};
