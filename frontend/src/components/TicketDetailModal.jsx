import React, { useState, useEffect, useRef } from 'react';
import { API_BASE, SERVER_BASE } from '../config';
import { 
  isVideoFile, 
  isImageFile, 
  compressImageFile, 
  uploadImagesToServer, 
  formatFileSize, 
  getFullImageUrl 
} from '../utils/imageUtils';
import ImageGalleryLightbox from './ImageGalleryLightbox';
import VideoPromptModal from './VideoPromptModal';

const ALL_TECH_TAGS = ['android', 'ios', 'backend', 'flutter', 'react', 'angular', 'python', 'design', 'qa', 'fullstack'];

const TAG_STYLES = {
  android: { bg: 'rgba(16, 185, 129, 0.1)', color: '#047857', border: 'rgba(16, 185, 129, 0.25)' },
  ios: { bg: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8', border: 'rgba(59, 130, 246, 0.25)' },
  backend: { bg: 'rgba(124, 58, 237, 0.1)', color: '#6d28d9', border: 'rgba(124, 58, 237, 0.25)' },
  flutter: { bg: 'rgba(2, 132, 199, 0.1)', color: '#0369a1', border: 'rgba(2, 132, 199, 0.25)' },
  react: { bg: 'rgba(6, 182, 212, 0.1)', color: '#0e7490', border: 'rgba(6, 182, 212, 0.25)' },
  angular: { bg: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: 'rgba(239, 68, 68, 0.25)' },
  python: { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: 'rgba(245, 158, 11, 0.25)' },
  design: { bg: 'rgba(236, 72, 153, 0.1)', color: '#be185d', border: 'rgba(236, 72, 153, 0.25)' },
  qa: { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)' },
  fullstack: { bg: 'rgba(99, 102, 241, 0.1)', color: '#4338ca', border: 'rgba(99, 102, 241, 0.25)' },
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getAvatarColor = (name) => {
  if (!name) return '#94a3b8';
  const colors = [
    '#2563eb', // blue
    '#059669', // emerald
    '#7c3aed', // violet
    '#db2777', // pink
    '#ea580c', // orange
    '#0891b2', // cyan
    '#4f46e5', // indigo
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getUserRole = (name, currentUser, teamMembers) => {
  if (currentUser && name === currentUser.name) return currentUser.role;
  const member = teamMembers?.find(m => m.name === name);
  return member ? member.role : null;
};

const getRoleBadgeStyle = (role) => {
  if (!role) return { bg: 'rgba(148, 163, 184, 0.1)', color: '#64748b' };
  
  const roleLower = role.toLowerCase();
  if (roleLower.includes('ceo') || roleLower.includes('pm') || roleLower.includes('manager') || roleLower.includes('coordinator') || roleLower.includes('pc')) {
    return { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }; // Amber/Orange
  }
  if (roleLower.includes('developer') || roleLower.includes('designer') || roleLower.includes('frontend') || roleLower.includes('backend') || roleLower.includes('flutter') || roleLower.includes('android') || roleLower.includes('ios') || roleLower.includes('python')) {
    return { bg: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }; // Blue/Indigo
  }
  if (roleLower.includes('qa') || roleLower.includes('quality') || roleLower.includes('tester')) {
    return { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669' }; // Green/Emerald
  }
  return { bg: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' }; // Indigo default
};

const renderTextWithLinks = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part && part.match(urlRegex)) {
      const url = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--accent-blue)',
            textDecoration: 'underline',
            fontWeight: '600',
            wordBreak: 'break-all',
            overflowWrap: 'anywhere',
            cursor: 'pointer',
          }}
          className="clickable-url"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function TicketDetailModal({ ticket, columns = [], currentUser, teamMembers = [], onClose, onRefresh }) {
  const [localTicket, setLocalTicket] = useState(ticket);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [activePickerCommentId, setActivePickerCommentId] = useState(null);

  // Edit Ticket state
  const [isEditing, setIsEditing] = useState(false);
  const [editTask, setEditTask] = useState(ticket.task || '');
  const [editDesc, setEditDesc] = useState(ticket.description || '');
  const [editType, setEditType] = useState(ticket.ticketType || 'Task');
  const [editPriority, setEditPriority] = useState(ticket.priority || 'Medium');
  const [editFigma, setEditFigma] = useState(ticket.figmaRef || '');
  const [editDeadline, setEditDeadline] = useState(ticket.deadline ? ticket.deadline.slice(0, 10) : '');
  const [editImages, setEditImages] = useState(ticket.images || []);
  const editImageFileInputRef = useRef(null);
  const [isEditDragOver, setIsEditDragOver] = useState(false);
  const [isCompressingEditImages, setIsCompressingEditImages] = useState(false);

  // Lightbox & Video Modal
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showVideoPrompt, setShowVideoPrompt] = useState(false);

  // Comment images
  const [commentImages, setCommentImages] = useState([]);
  const commentFileInputRef = useRef(null);
  const [isCompressingCommentImages, setIsCompressingCommentImages] = useState(false);
  const [isCommentDragOver, setIsCommentDragOver] = useState(false);

  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    setLocalTicket(ticket);
    setEditTask(ticket.task || '');
    setEditDesc(ticket.description || '');
    setEditType(ticket.ticketType || 'Task');
    setEditPriority(ticket.priority || 'Medium');
    setEditFigma(ticket.figmaRef || '');
    setEditDeadline(ticket.deadline ? ticket.deadline.slice(0, 10) : '');
    setEditImages(ticket.images || []);
  }, [ticket]);

  const getReactionLabel = (emoji) => {
    switch (emoji) {
      case '👍': return 'Like';
      case '❤️': return 'Love';
      case '👏': return 'Celebrate';
      case '💡': return 'Insightful';
      case '🚀': return 'Launch';
      case '😆': return 'Funny';
      default: return 'Like';
    }
  };

  const handleLikeToggle = (commentId, currentUserReaction) => {
    if (currentUserReaction) {
      handleReact(commentId, currentUserReaction);
    } else {
      handleReact(commentId, '👍');
    }
  };

  const handleAddReply = async (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/tickets/${localTicket._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser.name,
          comment: replyText.trim(),
          parentId
        })
      });
      if (!res.ok) throw new Error('Failed to post reply');
      const updated = await res.json();
      setLocalTicket(updated);
      setReplyText('');
      setReplyingToCommentId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReact = async (commentId, emoji) => {
    try {
      const res = await fetch(`${API_BASE}/tickets/${localTicket._id}/comments/${commentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, user: currentUser.name })
      });
      if (!res.ok) throw new Error('Failed to react to comment');
      const updated = await res.json();
      setLocalTicket(updated);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const currentStatusLower = (localTicket.status || '').toLowerCase();
    const newStatusLower = (newStatus || '').toLowerCase();

    // Check if moving out of Ready for Testing by developer
    if (currentStatusLower.includes('ready') && currentStatusLower.includes('testing') && currentStatusLower !== newStatusLower) {
      const r = (currentUser?.role || '').toLowerCase();
      const isAuthorized = r.includes('qa') || r.includes('tester') || r.includes('quality') || 
                           r.includes('pm') || r.includes('project manager') || 
                           r.includes('pc') || r.includes('project coordinator') || 
                           r.includes('delivery head') || r.includes('ceo');

      if (!isAuthorized) {
        alert('Permission Denied: Only QA, PC, and PM team members have permission to reopen or move tickets out of "Ready for Testing".');
        return;
      }
    }

    // Optimistic status update
    setLocalTicket(prev => ({ ...prev, status: newStatus }));

    try {
      const res = await fetch(`${API_BASE}/tickets/${localTicket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          userName: currentUser.name,
          userRole: currentUser.role
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update status');
      }
      const updated = await res.json();
      setLocalTicket(updated);
      onRefresh();
    } catch (err) {
      setLocalTicket(prev => ({ ...prev, status: ticket.status }));
      alert(err.message);
    }
  };

  const handleTypeChange = async (newType) => {
    setLocalTicket(prev => ({ ...prev, ticketType: newType }));
    try {
      const res = await fetch(`${API_BASE}/tickets/${localTicket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticketType: newType,
          userName: currentUser.name 
        })
      });
      if (!res.ok) throw new Error('Failed to update ticket type');
      const updated = await res.json();
      setLocalTicket(updated);
      onRefresh();
    } catch (err) {
      setLocalTicket(prev => ({ ...prev, ticketType: ticket.ticketType }));
      alert(err.message);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    setLocalTicket(prev => ({ ...prev, priority: newPriority }));
    try {
      const res = await fetch(`${API_BASE}/tickets/${localTicket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priority: newPriority,
          userName: currentUser.name 
        })
      });
      if (!res.ok) throw new Error('Failed to update priority');
      const updated = await res.json();
      setLocalTicket(updated);
      onRefresh();
    } catch (err) {
      setLocalTicket(prev => ({ ...prev, priority: ticket.priority }));
      alert(err.message);
    }
  };

  const handleToggleTechTag = async (tag) => {
    const tagLower = tag.toLowerCase();
    const currentTags = localTicket.tags || [];
    const isTagged = currentTags.some(t => t.toLowerCase() === tagLower);
    const newTags = isTagged
      ? currentTags.filter(t => t.toLowerCase() !== tagLower)
      : [...currentTags, tag];

    // Immediate UI feedback
    setLocalTicket(prev => ({ ...prev, tags: newTags }));

    try {
      const res = await fetch(`${API_BASE}/tickets/${localTicket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tags: newTags,
          tagAction: isTagged ? `Removed '${tag}' tech team tag` : `Added '${tag}' tech team tag`,
          userName: currentUser.name 
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update tech teams');
      }
      const updated = await res.json();
      setLocalTicket(updated);
      onRefresh();
    } catch (err) {
      setLocalTicket(prev => ({ ...prev, tags: currentTags }));
      alert(err.message);
    }
  };

  const handleProcessIncomingEditImages = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    if (files.some(f => isVideoFile(f))) {
      setShowVideoPrompt(true);
    }

    const imageFiles = files.filter(f => isImageFile(f));
    if (imageFiles.length === 0) return;

    const availableSlots = 7 - editImages.length;
    if (availableSlots <= 0) {
      alert('Maximum 7 images allowed per ticket.');
      return;
    }

    const filesToProcess = imageFiles.slice(0, availableSlots);
    if (imageFiles.length > availableSlots) {
      alert(`Only ${availableSlots} more image(s) could be added (max 7 images per ticket).`);
    }

    setIsCompressingEditImages(true);
    try {
      const processedObjects = await Promise.all(
        filesToProcess.map(async (f) => {
          const originalSize = f.size;
          let fileToUse = f;
          let isCompressed = false;

          if (f.size > 2 * 1024 * 1024) {
            fileToUse = await compressImageFile(f, 1024 * 1024);
            isCompressed = true;
          }

          return {
            isNew: true,
            file: fileToUse,
            previewUrl: URL.createObjectURL(fileToUse),
            isCompressed,
            originalSize,
            compressedSize: fileToUse.size,
            name: fileToUse.name
          };
        })
      );

      setEditImages(prev => [...prev, ...processedObjects]);
    } catch (err) {
      console.error('Error processing edit images:', err);
    } finally {
      setIsCompressingEditImages(false);
    }
  };

  const handleRemoveEditImage = (index) => {
    setEditImages(prev => {
      const copy = [...prev];
      const target = copy[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleProcessIncomingCommentImages = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    if (files.some(f => isVideoFile(f))) {
      setShowVideoPrompt(true);
    }

    const imageFiles = files.filter(f => isImageFile(f));
    if (imageFiles.length === 0) return;

    const availableSlots = 7 - commentImages.length;
    if (availableSlots <= 0) {
      alert('Maximum 7 images allowed per comment.');
      return;
    }

    const filesToProcess = imageFiles.slice(0, availableSlots);
    if (imageFiles.length > availableSlots) {
      alert(`Only ${availableSlots} more image(s) could be added (max 7 images per comment).`);
    }

    setIsCompressingCommentImages(true);
    try {
      const processedObjects = await Promise.all(
        filesToProcess.map(async (f) => {
          const originalSize = f.size;
          let fileToUse = f;
          let isCompressed = false;

          if (f.size > 2 * 1024 * 1024) {
            fileToUse = await compressImageFile(f, 1024 * 1024);
            isCompressed = true;
          }

          return {
            file: fileToUse,
            previewUrl: URL.createObjectURL(fileToUse),
            isCompressed,
            originalSize,
            compressedSize: fileToUse.size,
            name: fileToUse.name
          };
        })
      );

      setCommentImages(prev => [...prev, ...processedObjects]);
    } catch (err) {
      console.error('Error processing comment images:', err);
    } finally {
      setIsCompressingCommentImages(false);
    }
  };

  const handleRemoveCommentImage = (index) => {
    setCommentImages(prev => {
      const copy = [...prev];
      if (copy[index]?.previewUrl) {
        URL.revokeObjectURL(copy[index].previewUrl);
      }
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleCommentPaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const files = Array.from(e.clipboardData.files);
      const imageFiles = files.filter(f => isImageFile(f));
      if (imageFiles.length > 0) {
        e.preventDefault();
        handleProcessIncomingCommentImages(imageFiles);
      }
    }
  };

  const handleSaveTicketEdits = async (e) => {
    e.preventDefault();
    if (!editTask.trim()) {
      alert('Task title cannot be empty.');
      return;
    }
    try {
      const existingPaths = editImages.filter(item => typeof item === 'string');
      const newItems = editImages.filter(item => typeof item !== 'string' && item.file);

      let newlyUploaded = [];
      if (newItems.length > 0) {
        newlyUploaded = await uploadImagesToServer(newItems.map(item => item.file));
      }

      const finalImages = [...existingPaths, ...newlyUploaded];

      const res = await fetch(`${API_BASE}/tickets/${localTicket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task: editTask.trim(),
          description: editDesc.trim(),
          figmaRef: editFigma.trim(),
          deadline: editDeadline || null,
          ticketType: editType,
          priority: editPriority,
          images: finalImages,
          isEditAction: true,
          userName: currentUser.name 
        })
      });
      if (!res.ok) throw new Error('Failed to update ticket details');
      const updated = await res.json();
      setLocalTicket(updated);
      setEditImages(updated.images || []);
      setIsEditing(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTicket = async () => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/tickets/${localTicket._id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete ticket');
      onRefresh();
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && commentImages.length === 0) return;

    setCommenting(true);
    try {
      let uploadedImagePaths = [];
      if (commentImages.length > 0) {
        const rawFiles = commentImages.map(img => img.file);
        uploadedImagePaths = await uploadImagesToServer(rawFiles);
      }

      const res = await fetch(`${API_BASE}/tickets/${localTicket._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser.name,
          comment: newComment.trim(),
          images: uploadedImagePaths
        })
      });
      if (!res.ok) throw new Error('Failed to post comment');
      const updated = await res.json();
      setLocalTicket(updated);
      setNewComment('');
      setCommentImages([]);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setCommenting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div style={styles.overlay}>
      <div className="fade-in" style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleGroup}>
            <span style={styles.ticketIdLabel}>ID: #{localTicket._id ? localTicket._id.slice(-6).toUpperCase() : ''}</span>
            <h3 style={styles.title}>{localTicket.task}</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 'QA', 'Quality Analyst (QA)', 'CEO', 'Delivery Head'].includes(currentUser.role) && !isEditing && (
              <button 
                type="button"
                onClick={() => {
                  setEditTask(localTicket.task || '');
                  setEditDesc(localTicket.description || '');
                  setEditType(localTicket.ticketType || 'Task');
                  setEditPriority(localTicket.priority || 'Medium');
                  setEditFigma(localTicket.figmaRef || '');
                  setEditDeadline(localTicket.deadline ? localTicket.deadline.slice(0, 10) : '');
                  setIsEditing(true);
                }}
                title="Edit Ticket Details"
                style={styles.editTicketBtn}
              >
                ✏️ Edit
              </button>
            )}
            {['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 'QA', 'Quality Analyst (QA)', 'CEO', 'Delivery Head'].includes(currentUser.role) && (
              <button 
                type="button"
                onClick={handleDeleteTicket}
                title="Delete Ticket"
                className="delete-doc-btn"
                style={styles.smallDeleteBtn}
              >
                🗑️
              </button>
            )}
            <button onClick={onClose} style={styles.closeBtn}>×</button>
          </div>
        </div>

        {/* Grid Content */}
        <div style={styles.grid}>
          {/* Left Panel: Description, Figma, Edit Mode & Discussion Feed */}
          <div style={styles.leftCol}>
            {isEditing ? (
              <form onSubmit={handleSaveTicketEdits} style={styles.editForm}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={styles.sectionTitle}>Edit Ticket Details</h4>
                  <div style={styles.editActions}>
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)} 
                      style={styles.cancelEditBtn}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      style={styles.saveEditBtn}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Title</label>
                  <input
                    type="text"
                    value={editTask}
                    onChange={(e) => setEditTask(e.target.value)}
                    style={styles.editInput}
                    maxLength={80}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Type</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      style={styles.editInput}
                    >
                      <option value="Feature">✨ Feature</option>
                      <option value="Task">📋 Task</option>
                      <option value="Bug">🐞 Bug</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      style={styles.editInput}
                    >
                      <option value="High">🔴 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🟢 Low</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={styles.formLabel}>Deadline</label>
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      style={styles.editInput}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={styles.formLabel}>Figma Reference URL</label>
                  <input
                    type="text"
                    value={editFigma}
                    onChange={(e) => setEditFigma(e.target.value)}
                    placeholder="https://figma.com/file/..."
                    style={styles.editInput}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={styles.formLabel}>Description</label>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Paste (Ctrl+V) or drop photos / media</span>
                  </div>

                  {/* Integrated Description & Attachments Box */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsEditDragOver(true);
                    }}
                    onDragLeave={() => setIsEditDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsEditDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleProcessIncomingEditImages(e.dataTransfer.files);
                      }
                    }}
                    style={{
                      position: 'relative',
                      border: isEditDragOver ? '2px dashed var(--accent-blue, #2563eb)' : '1px solid #cbd5e1',
                      backgroundColor: isEditDragOver ? 'rgba(37, 99, 235, 0.04)' : '#ffffff',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      boxShadow: isEditDragOver ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none'
                    }}
                  >
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      onPaste={(e) => {
                        if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
                          const files = Array.from(e.clipboardData.files);
                          if (files.some(f => isVideoFile(f))) {
                            setShowVideoPrompt(true);
                          }
                          const imageFiles = files.filter(f => isImageFile(f));
                          if (imageFiles.length > 0) {
                            e.preventDefault();
                            handleProcessIncomingEditImages(imageFiles);
                          }
                        }
                      }}
                      placeholder="Provide ticket details, paste photos/videos directly, or paste Figma/Loom links..."
                      style={{
                        width: '100%',
                        minHeight: '130px',
                        padding: '10px 12px',
                        lineHeight: '1.5',
                        fontSize: '13px',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        color: 'var(--text-primary)',
                        boxSizing: 'border-box'
                      }}
                      rows={4}
                      required
                    />

                    {/* Staged Edit Images inside Description Box */}
                    {editImages.length > 0 && (
                      <div style={{ padding: '0 10px 8px 10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {editImages.map((imgItem, idx) => {
                          const isString = typeof imgItem === 'string';
                          const previewSrc = isString ? getFullImageUrl(imgItem) : imgItem.previewUrl;
                          return (
                            <div
                              key={idx}
                              style={{
                                position: 'relative',
                                width: '64px',
                                height: '64px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#f1f5f9',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                              }}
                            >
                              <img
                                src={previewSrc}
                                alt={`Attachment ${idx + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              {!isString && imgItem.isCompressed && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    bottom: '2px',
                                    left: '2px',
                                    backgroundColor: 'rgba(16, 185, 129, 0.9)',
                                    color: '#ffffff',
                                    fontSize: '8.5px',
                                    fontWeight: '700',
                                    padding: '1px 3px',
                                    borderRadius: '3px'
                                  }}
                                >
                                  ~1MB
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveEditImage(idx);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '2px',
                                  right: '2px',
                                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '18px',
                                  height: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                                title="Remove image"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {isCompressingEditImages && (
                      <div style={{ padding: '0 10px 6px 10px', fontSize: '11.5px', color: 'var(--accent-blue)', fontWeight: '500' }}>
                        ⏳ Optimizing and compressing images...
                      </div>
                    )}

                    {/* Integrated Toolbar Footer inside Description Box */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: '#f8fafc',
                      borderTop: '1px solid #f1f5f9',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="file"
                          ref={editImageFileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleProcessIncomingEditImages(e.target.files);
                              e.target.value = '';
                            }
                          }}
                          accept="image/*,video/*"
                          multiple
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={() => editImageFileInputRef.current?.click()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 9px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            color: '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title="Upload or attach photos / videos"
                        >
                          <span>📷</span>
                          <span>{editImages.length > 0 ? `Add Photos (${editImages.length}/7)` : 'Attach Photo / Video'}</span>
                        </button>

                        {isEditDragOver && (
                          <span style={{ fontSize: '11.5px', color: 'var(--accent-blue)', fontWeight: '600' }}>
                            Drop files here
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Max 7 images
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <>
                <div style={styles.section}>
                  <h4 style={styles.sectionTitle}>Description</h4>
                  <p style={styles.description}>{renderTextWithLinks(localTicket.description)}</p>
                </div>

                {localTicket.figmaRef && (
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Figma Reference</h4>
                    <a 
                      href={localTicket.figmaRef} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={styles.figmaLink}
                    >
                      <span style={styles.figmaIcon}>❖</span> Open Figma Design Reference
                    </a>
                  </div>
                )}

                {/* Ticket Attachments Gallery */}
                {localTicket.images && localTicket.images.length > 0 && (
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>
                      Attachments ({localTicket.images.length})
                    </h4>
                    <div style={styles.imageGalleryGrid}>
                      {localTicket.images.map((imgPath, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            setLightboxImages(localTicket.images);
                            setLightboxIndex(idx);
                            setIsLightboxOpen(true);
                          }}
                          style={styles.galleryThumbWrapper}
                          title="Click to view full size"
                        >
                          <img 
                            src={getFullImageUrl(imgPath)} 
                            alt={`Attachment ${idx + 1}`} 
                            style={styles.galleryThumbImg}
                          />
                          <div style={styles.zoomHoverOverlay}>
                            🔍
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Discussion Feed (Comments) */}
            {localTicket.comments && localTicket.comments.length > 0 && (
              <div style={styles.discussionSection}>
                <h4 style={styles.sectionTitle}>Discussion Feed</h4>
                
                <div style={styles.commentsList}>
                  {(() => {
                    const topLevelComments = (localTicket.comments || []).filter(c => !c.parentId);
                    const repliesByParentId = (localTicket.comments || []).reduce((acc, c) => {
                      if (c.parentId) {
                        if (!acc[c.parentId]) acc[c.parentId] = [];
                        acc[c.parentId].push(c);
                      }
                      return acc;
                    }, {});

                    return topLevelComments.map((comm) => {
                    const isSelf = comm.user === currentUser.name;
                    const userRole = getUserRole(comm.user, currentUser, teamMembers);
                    const roleBadge = getRoleBadgeStyle(userRole);
                    const userReaction = comm.reactions?.find(r => r.users.includes(currentUser.name))?.emoji;
                    const replies = repliesByParentId[comm._id] || [];
                    const hasReplies = replies.length > 0;

                    return (
                      <div key={comm._id} style={styles.commentThreadContainer}>
                        {/* The main comment */}
                        <div style={styles.commentRow}>
                          <div 
                            style={{
                              ...styles.avatar,
                              backgroundColor: getAvatarColor(comm.user),
                            }}
                            title={`${comm.user}${userRole ? ` (${userRole})` : ''}`}
                          >
                            {getInitials(comm.user)}
                          </div>
                          
                          <div style={styles.commentContentArea}>
                            <div style={styles.commentBubble}>
                              <div style={styles.commentHeader}>
                                <div style={styles.commentUserGroup}>
                                  <span style={styles.commentUser}>{comm.user}</span>
                                  {isSelf ? (
                                    <span style={styles.youBadge}>You</span>
                                  ) : (
                                    userRole && (
                                      <span style={{
                                        ...styles.roleBadge,
                                        backgroundColor: roleBadge.bg,
                                        color: roleBadge.color
                                      }}>
                                        {userRole}
                                      </span>
                                    )
                                  )}
                                </div>
                                <span style={styles.commentTime}>
                                  {formatTime(comm.timestamp)} - {formatDate(comm.timestamp)}
                                </span>
                              </div>
                              {comm.comment && comm.comment.trim() && (
                                <div style={styles.commentBody}>{renderTextWithLinks(comm.comment)}</div>
                              )}
                              {comm.images && comm.images.length > 0 && (
                                <div style={styles.commentImagesGrid}>
                                  {comm.images.map((cImg, cIdx) => (
                                    <div
                                      key={cIdx}
                                      onClick={() => {
                                        setLightboxImages(comm.images);
                                        setLightboxIndex(cIdx);
                                        setIsLightboxOpen(true);
                                      }}
                                      style={styles.commentThumbWrapper}
                                      title="Click to view image"
                                    >
                                      <img
                                        src={getFullImageUrl(cImg)}
                                        alt={`Comment image ${cIdx + 1}`}
                                        style={styles.commentThumbImg}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Action panel underneath the bubble */}
                            <div style={styles.commentActionsBar}>
                              <div 
                                style={styles.likeBtnContainer}
                                onMouseEnter={() => setHoveredCommentId(comm._id)}
                                onMouseLeave={() => setHoveredCommentId(null)}
                              >
                                <button 
                                  type="button" 
                                  onClick={() => handleLikeToggle(comm._id, userReaction)}
                                  style={{
                                    ...styles.commentActionBtn,
                                    ...(userReaction ? styles.commentActionBtnActive : {})
                                  }}
                                >
                                  {userReaction ? (
                                    <span style={{ marginRight: '4px' }}>{userReaction}</span>
                                  ) : (
                                    <span style={{ marginRight: '4px' }}>👍</span>
                                  )}
                                  <span style={{ fontWeight: userReaction ? '600' : 'normal' }}>
                                    {userReaction ? getReactionLabel(userReaction) : 'Like'}
                                  </span>
                                </button>
                                 {hoveredCommentId === comm._id && (
                                  <div style={styles.hoverReactionPanel}>
                                    <div style={styles.hoverReactionInner} className="glass fade-in">
                                      {['👍', '❤️', '👏', '💡', '🚀', '😆'].map(emoji => (
                                        <span
                                          key={emoji}
                                          onClick={() => {
                                            handleReact(comm._id, emoji);
                                            setHoveredCommentId(null);
                                          }}
                                          style={styles.hoverReactionEmoji}
                                          title={getReactionLabel(emoji)}
                                        >
                                          {emoji}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <span style={styles.dotSeparator}>•</span>

                              <button 
                                type="button" 
                                onClick={() => {
                                  if (replyingToCommentId === comm._id) {
                                    setReplyingToCommentId(null);
                                    setReplyText('');
                                  } else {
                                    setReplyingToCommentId(comm._id);
                                    setReplyText('');
                                  }
                                }}
                                style={styles.commentActionBtn}
                              >
                                💬 Reply
                              </button>

                              {/* Reaction summary if any */}
                              {comm.reactions && comm.reactions.length > 0 && (
                                <div className="reactions-tooltip-trigger" style={styles.commentReactionsSummary}>
                                  <span style={styles.reactionsSummaryEmojis}>
                                    {comm.reactions.slice(0, 3).map(r => r.emoji).join('')}
                                  </span>
                                  <span style={styles.reactionsSummaryCount}>
                                    {comm.reactions.reduce((sum, r) => sum + r.users.length, 0)}
                                  </span>
                                  <div className="reactions-tooltip-box">
                                    {comm.reactions.map((r, idx) => {
                                      const formattedNames = r.users.length > 1
                                        ? `${r.users.slice(0, -1).join(', ')} and ${r.users[r.users.length - 1]}`
                                        : r.users[0];
                                      return (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', lineHeight: '1.4' }}>
                                          <span>{r.emoji}</span>
                                          <span style={{ color: '#cbd5e1' }}>{formattedNames}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Replies (Nested and connected visually) */}
                        {hasReplies && (
                          <div style={styles.repliesWrapper}>
                            {/* Vertical line connecting replies */}
                            <div style={styles.threadLine} />
                            
                            <div style={styles.repliesList}>
                              {replies.map(reply => {
                                const isReplySelf = reply.user === currentUser.name;
                                const replyUserRole = getUserRole(reply.user, currentUser, teamMembers);
                                const replyRoleBadge = getRoleBadgeStyle(replyUserRole);
                                const replyUserReaction = reply.reactions?.find(r => r.users.includes(currentUser.name))?.emoji;

                                return (
                                  <div key={reply._id} style={styles.replyRow}>
                                    <div 
                                      style={{
                                        ...styles.replyAvatar,
                                        backgroundColor: getAvatarColor(reply.user),
                                      }}
                                      title={`${reply.user}${replyUserRole ? ` (${replyUserRole})` : ''}`}
                                    >
                                      {getInitials(reply.user)}
                                    </div>
                                    
                                    <div style={styles.commentContentArea}>
                                      <div style={styles.replyBubble}>
                                        <div style={styles.commentHeader}>
                                          <div style={styles.commentUserGroup}>
                                            <span style={styles.commentUser}>{reply.user}</span>
                                            {isReplySelf ? (
                                              <span style={styles.youBadge}>You</span>
                                            ) : (
                                              replyUserRole && (
                                                <span style={{
                                                  ...styles.roleBadge,
                                                  backgroundColor: replyRoleBadge.bg,
                                                  color: replyRoleBadge.color
                                                }}>
                                                  {replyUserRole}
                                                </span>
                                              )
                                            )}
                                          </div>
                                          <span style={styles.commentTime}>
                                            {formatTime(reply.timestamp)} - {formatDate(reply.timestamp)}
                                          </span>
                                        </div>
                                        {reply.comment && reply.comment.trim() && (
                                          <div style={styles.commentBody}>{renderTextWithLinks(reply.comment)}</div>
                                        )}
                                        {reply.images && reply.images.length > 0 && (
                                          <div style={styles.commentImagesGrid}>
                                            {reply.images.map((rImg, rIdx) => (
                                              <div
                                                key={rIdx}
                                                onClick={() => {
                                                  setLightboxImages(reply.images);
                                                  setLightboxIndex(rIdx);
                                                  setIsLightboxOpen(true);
                                                }}
                                                style={styles.commentThumbWrapper}
                                                title="Click to view image"
                                              >
                                                <img
                                                  src={getFullImageUrl(rImg)}
                                                  alt={`Reply image ${rIdx + 1}`}
                                                  style={styles.commentThumbImg}
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Reply Action Bar */}
                                      <div style={styles.commentActionsBar}>
                                        <div 
                                          style={styles.likeBtnContainer}
                                          onMouseEnter={() => setHoveredCommentId(reply._id)}
                                          onMouseLeave={() => setHoveredCommentId(null)}
                                        >
                                          <button 
                                            type="button" 
                                            onClick={() => handleLikeToggle(reply._id, replyUserReaction)}
                                            style={{
                                              ...styles.commentActionBtn,
                                              ...(replyUserReaction ? styles.commentActionBtnActive : {})
                                            }}
                                          >
                                            {replyUserReaction ? (
                                              <span style={{ marginRight: '4px' }}>{replyUserReaction}</span>
                                            ) : (
                                              <span style={{ marginRight: '4px' }}>👍</span>
                                            )}
                                            <span style={{ fontWeight: replyUserReaction ? '600' : 'normal' }}>
                                              {replyUserReaction ? getReactionLabel(replyUserReaction) : 'Like'}
                                            </span>
                                          </button>
                                          
                                          {hoveredCommentId === reply._id && (
                                            <div style={styles.hoverReactionPanel}>
                                              <div style={styles.hoverReactionInner} className="glass fade-in">
                                                {['👍', '❤️', '👏', '💡', '🚀', '😆'].map(emoji => (
                                                  <span
                                                    key={emoji}
                                                    onClick={() => {
                                                      handleReact(reply._id, emoji);
                                                      setHoveredCommentId(null);
                                                    }}
                                                    style={styles.hoverReactionEmoji}
                                                    title={getReactionLabel(emoji)}
                                                  >
                                                    {emoji}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {reply.reactions && reply.reactions.length > 0 && (
                                          <div className="reactions-tooltip-trigger" style={styles.commentReactionsSummary}>
                                            <span style={styles.reactionsSummaryEmojis}>
                                              {reply.reactions.slice(0, 3).map(r => r.emoji).join('')}
                                            </span>
                                            <span style={styles.reactionsSummaryCount}>
                                              {reply.reactions.reduce((sum, r) => sum + r.users.length, 0)}
                                            </span>
                                            <div className="reactions-tooltip-box">
                                              {reply.reactions.map((r, idx) => {
                                                const formattedNames = r.users.length > 1
                                                  ? `${r.users.slice(0, -1).join(', ')} and ${r.users[r.users.length - 1]}`
                                                  : r.users[0];
                                                return (
                                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', lineHeight: '1.4' }}>
                                                    <span>{r.emoji}</span>
                                                    <span style={{ color: '#cbd5e1' }}>{formattedNames}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Reply Form (Indented under parent comment) */}
                        {replyingToCommentId === comm._id && (
                          <div style={styles.replyFormWrapper}>
                            <div style={styles.threadLine} />
                            <form onSubmit={(e) => handleAddReply(e, comm._id)} style={styles.replyForm}>
                              <textarea
                                placeholder="Reply to this thread..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={1}
                                style={styles.replyTextarea}
                                required
                              />
                              <div style={styles.replyFormActions}>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setReplyingToCommentId(null);
                                    setReplyText('');
                                  }}
                                  style={styles.replyCancelBtn}
                                >
                                  Cancel
                                </button>
                                <button type="submit" style={styles.replySubmitBtn}>
                                  Reply
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
                </div>
              </div>
            )}

          {/* Comment Form */}
          <form 
            onSubmit={handleAddComment} 
            onDragOver={(e) => {
              e.preventDefault();
              setIsCommentDragOver(true);
            }}
            onDragLeave={() => setIsCommentDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsCommentDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleProcessIncomingCommentImages(e.dataTransfer.files);
              }
            }}
            style={{ 
              ...styles.commentForm, 
              marginTop: (localTicket.comments?.length > 0) ? '8px' : '0px',
              border: isCommentDragOver ? '2px dashed var(--accent-blue, #2563eb)' : '1px solid var(--panel-border)',
              backgroundColor: isCommentDragOver ? 'rgba(37, 99, 235, 0.03)' : 'transparent',
              borderRadius: '10px',
              padding: '10px',
              transition: 'all 0.2s ease'
            }}
          >
            <input
              type="file"
              ref={commentFileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleProcessIncomingCommentImages(e.target.files);
                  e.target.value = '';
                }
              }}
              accept="image/*,video/*"
              multiple
              style={{ display: 'none' }}
            />

            <textarea
              placeholder="Write a message to the team or paste images (Ctrl+V)..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onPaste={handleCommentPaste}
              rows={2}
              style={styles.commentTextarea}
            />

            {isCompressingCommentImages && (
              <div style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '4px', fontWeight: '500' }}>
                ⏳ Optimizing image size...
              </div>
            )}

            {/* Staged Comment Images Strip */}
            {commentImages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', marginBottom: '4px' }}>
                {commentImages.map((cImg, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '52px',
                      height: '52px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f1f5f9'
                    }}
                  >
                    <img
                      src={cImg.previewUrl}
                      alt={`Comment image ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {cImg.isCompressed && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '1px',
                          left: '1px',
                          backgroundColor: 'rgba(16, 185, 129, 0.9)',
                          color: '#ffffff',
                          fontSize: '8px',
                          fontWeight: '700',
                          padding: '0 2px',
                          borderRadius: '2px'
                        }}
                      >
                        ~1MB
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveCommentImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '1px',
                        right: '1px',
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.commentActions}>
              <button
                type="button"
                className="secondary"
                onClick={() => commentFileInputRef.current?.click()}
                style={styles.attachmentBtn}
                title="Attach images (up to 7, auto compressed)"
              >
                📎 Attach Images {commentImages.length > 0 ? `(${commentImages.length}/7)` : ''}
              </button>

              <button 
                type="submit" 
                disabled={commenting || isCompressingCommentImages || (!newComment.trim() && commentImages.length === 0)} 
                style={styles.postBtn}
              >
                {commenting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

          {/* Right Panel: Sidebar Details */}
          <div style={styles.rightCol}>
            <div style={styles.sidebarSection}>
              <label style={styles.sidebarLabel}>STATUS</label>
              <div 
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                style={styles.statusTrigger}
              >
                <span>{localTicket.status}</span>
                <span style={styles.statusCaret}>{isStatusOpen ? '▲' : '▼'}</span>
              </div>
              
              {isStatusOpen && (
                <>
                  <div style={styles.dropdownOverlay} onClick={() => setIsStatusOpen(false)} />
                  <div style={styles.statusMenu} className="glass fade-in">
                    {(columns && columns.length > 0 ? columns : [
                      { title: 'To be started' },
                      { title: 'In progress' },
                      { title: 'Ready for testing' },
                      { title: 'Tested' },
                      { title: 'Live' }
                    ]).map(col => {
                      const isCurrentTesting = (localTicket.status || '').toLowerCase().includes('ready') && (localTicket.status || '').toLowerCase().includes('testing');
                      const r = (currentUser?.role || '').toLowerCase();
                      const isAuthorized = r.includes('qa') || r.includes('tester') || r.includes('quality') || 
                                           r.includes('pm') || r.includes('project manager') || 
                                           r.includes('pc') || r.includes('project coordinator') || 
                                           r.includes('delivery head') || r.includes('ceo');
                      const isRestricted = isCurrentTesting && col.title !== localTicket.status && !isAuthorized;

                      return (
                        <div
                          key={col._id || col.title}
                          onClick={() => {
                            if (isRestricted) {
                              alert('Permission Denied: Only QA, PC, and PM team members have permission to reopen or move tickets out of "Ready for Testing".');
                              return;
                            }
                            handleStatusChange(col.title);
                            setIsStatusOpen(false);
                          }}
                          style={{
                            ...styles.statusOption,
                            ...(localTicket.status === col.title ? styles.activeStatusOption : {})
                          }}
                          className="dropdown-option"
                        >
                          <span>{col.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div style={styles.sidebarSection}>
              <label style={styles.sidebarLabel}>TYPE</label>
              <div 
                onClick={() => setIsTypeOpen(!isTypeOpen)}
                style={styles.statusTrigger}
              >
                <span>{localTicket.ticketType === 'Feature' ? '✨ Feature' : localTicket.ticketType === 'Bug' ? '🐞 Bug' : '📋 Task'}</span>
                <span style={styles.statusCaret}>{isTypeOpen ? '▲' : '▼'}</span>
              </div>
              
              {isTypeOpen && (
                <>
                  <div style={styles.dropdownOverlay} onClick={() => setIsTypeOpen(false)} />
                  <div style={styles.statusMenu} className="glass fade-in">
                    {[
                      { type: 'Feature', label: '✨ Feature' },
                      { type: 'Task', label: '📋 Task' },
                      { type: 'Bug', label: '🐞 Bug' }
                    ].map(item => (
                      <div
                        key={item.type}
                        onClick={() => {
                          handleTypeChange(item.type);
                          setIsTypeOpen(false);
                        }}
                        style={{
                          ...styles.statusOption,
                          ...(localTicket.ticketType === item.type ? styles.activeStatusOption : {})
                        }}
                        className="dropdown-option"
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={styles.sidebarSection}>
              <label style={styles.sidebarLabel}>PRIORITY</label>
              <div 
                onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                style={styles.statusTrigger}
              >
                <span>{localTicket.priority === 'High' ? '🔴 High' : localTicket.priority === 'Low' ? '🟢 Low' : '🟡 Medium'}</span>
                <span style={styles.statusCaret}>{isPriorityOpen ? '▲' : '▼'}</span>
              </div>
              
              {isPriorityOpen && (
                <>
                  <div style={styles.dropdownOverlay} onClick={() => setIsPriorityOpen(false)} />
                  <div style={styles.statusMenu} className="glass fade-in">
                    {[
                      { priority: 'High', label: '🔴 High' },
                      { priority: 'Medium', label: '🟡 Medium' },
                      { priority: 'Low', label: '🟢 Low' }
                    ].map(item => (
                      <div
                        key={item.priority}
                        onClick={() => {
                          handlePriorityChange(item.priority);
                          setIsPriorityOpen(false);
                        }}
                        style={{
                          ...styles.statusOption,
                          ...(localTicket.priority === item.priority ? styles.activeStatusOption : {})
                        }}
                        className="dropdown-option"
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Tech Teams Dropdown (Toggleable by everyone on platform) */}
            <div style={styles.sidebarSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={styles.sidebarLabel}>TECH TEAMS ({(localTicket.tags || []).length})</label>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Click tag to toggle</span>
              </div>
              <div 
                onClick={() => setIsAddingTag(!isAddingTag)}
                style={{ ...styles.statusTrigger, minHeight: '38px', flexWrap: 'wrap', gap: '4px', cursor: 'pointer' }}
                title="Click to tag or untag tech teams"
              >
                {(localTicket.tags || []).length === 0 ? (
                  <span style={{ color: '#94a3b8' }}>Select Tech Teams...</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1, minWidth: 0 }}>
                    {(localTicket.tags || []).map(tag => {
                      const tagKey = tag.toLowerCase();
                      const tagStyle = TAG_STYLES[tagKey] || { bg: 'rgba(148, 163, 184, 0.15)', color: '#334155', border: 'rgba(148, 163, 184, 0.3)' };
                      const label = tag === 'ios' ? 'iOS' : tag === 'qa' ? 'QA' : tag === 'fullstack' ? 'Full Stack' : tag.charAt(0).toUpperCase() + tag.slice(1);
                      return (
                        <span 
                          key={tag} 
                          style={{
                            ...styles.tagPill,
                            backgroundColor: tagStyle.bg,
                            color: tagStyle.color,
                            border: `1px solid ${tagStyle.border}`,
                          }}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
                <span style={styles.statusCaret}>{isAddingTag ? '▲' : '▼'}</span>
              </div>

              {isAddingTag && (
                <>
                  <div style={styles.dropdownOverlay} onClick={() => setIsAddingTag(false)} />
                  <div style={styles.statusMenu} className="glass fade-in">
                    {ALL_TECH_TAGS.map(tag => {
                      const isSelected = (localTicket.tags || []).some(t => t.toLowerCase() === tag.toLowerCase());
                      const label = tag === 'ios' ? 'iOS' : tag === 'qa' ? 'QA' : tag === 'fullstack' ? 'Full Stack' : tag.charAt(0).toUpperCase() + tag.slice(1);
                      const tagStyle = TAG_STYLES[tag] || { color: '#64748b' };
                      return (
                        <div
                          key={tag}
                          onClick={() => handleToggleTechTag(tag)}
                          style={{
                            ...styles.statusOption,
                            ...(isSelected ? styles.activeStatusOption : {}),
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}
                          className="dropdown-option"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span 
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: tagStyle.color || '#64748b'
                              }}
                            />
                            <span style={{ fontWeight: isSelected ? '600' : '400' }}>{label}</span>
                          </div>
                          {isSelected ? (
                            <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: '700' }}>✓ Tagged</span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>+ Add</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div style={styles.sidebarSection}>
              <label style={styles.sidebarLabel}>DEADLINE</label>
              <div style={styles.sidebarValue}>
                {localTicket.deadline ? formatDate(localTicket.deadline) : 'No deadline set'}
              </div>
            </div>

            <div style={styles.sidebarSection}>
              <button 
                type="button"
                onClick={() => setShowActivity(!showActivity)}
                className="secondary"
                style={styles.activityToggleBtn}
              >
                {showActivity ? 'Recent Activity ✕' : 'Recent Activity 👁️'}
              </button>

              {showActivity && (
                <div style={styles.historyList}>
                  {localTicket.history && localTicket.history.length > 0 ? (
                    localTicket.history.map((log, idx) => (
                      <div key={idx} style={styles.historyItem}>
                        <div style={styles.historyDot} />
                        <div style={styles.historyDetails}>
                          <div style={styles.historyAction}>{log.action}</div>
                          <div style={styles.historyMeta}>
                            by <strong>{log.user}</strong> at {formatTime(log.timestamp)} on {formatDate(log.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={styles.noHistory}>No movement logs found</div>
                  )}
                </div>
              )}
            </div>


          </div>
        </div>
      </div>

      {/* Lightbox for full screen viewing */}
      {isLightboxOpen && (
        <ImageGalleryLightbox 
          images={lightboxImages} 
          initialIndex={lightboxIndex} 
          onClose={() => setIsLightboxOpen(false)} 
        />
      )}

      {/* Video prompt modal */}
      <VideoPromptModal 
        isOpen={showVideoPrompt} 
        onClose={() => setShowVideoPrompt(false)} 
      />
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: '920px',
    padding: '30px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    color: 'var(--text-primary)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--panel-border)',
    paddingBottom: '16px',
    gap: '16px',
    minWidth: 0,
  },
  headerTitleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  ticketBadge: {
    alignSelf: 'flex-start',
    fontSize: '9px',
    fontWeight: '700',
    backgroundColor: 'rgba(0, 113, 227, 0.15)',
    color: 'var(--accent-blue)',
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.8px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    maxWidth: '100%',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '26px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '0 6px',
    flexShrink: 0,
  },
  smallDeleteBtn: {
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 6px',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 220px',
    gap: '24px',
    overflow: 'hidden',
    height: '100%',
    minWidth: 0,
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: '12px',
    maxHeight: '70vh',
    minWidth: 0,
    width: '100%',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    borderLeft: '1px solid var(--panel-border)',
    paddingLeft: '16px',
    overflowY: 'auto',
    maxHeight: '70vh',
  },
  discussionSection: {
    borderTop: '1px solid var(--panel-border)',
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sidebarSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    position: 'relative',
  },
  sidebarLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.8px',
  },
  sidebarValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  statusTrigger: {
    padding: '10px 14px',
    background: 'rgba(15, 23, 42, 0.03)',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    transition: 'var(--transition-smooth)',
    marginTop: '6px',
    position: 'relative',
    userSelect: 'none',
  },
  statusCaret: {
    fontSize: '9px',
    color: 'var(--text-secondary)',
    opacity: 0.7,
  },
  statusMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#ffffff',
    border: '1px solid var(--panel-border)',
    borderRadius: '10px',
    padding: '6px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statusOption: {
    padding: '10px 12px',
    fontSize: '13px',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'var(--transition-smooth)',
    userSelect: 'none',
  },
  activeStatusOption: {
    background: 'rgba(30, 58, 138, 0.06)',
    color: 'var(--accent-blue)',
    fontWeight: '600',
  },
  dropdownOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  reactionRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '10px',
    alignItems: 'center',
  },
  reactionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.03)',
    border: '1px solid rgba(15, 23, 42, 0.06)',
    borderRadius: '20px',
    padding: '3px 8px',
    gap: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'var(--transition-smooth)',
    userSelect: 'none',
  },
  reactionBadgeActive: {
    background: 'rgba(30, 58, 138, 0.08)',
    borderColor: 'rgba(30, 58, 138, 0.2)',
    color: 'var(--accent-blue)',
  },
  reactionCount: {
    fontSize: '10px',
    fontWeight: '600',
  },
  addReactionBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '12px',
    opacity: 0.6,
    transition: 'var(--transition-smooth)',
    display: 'flex',
    alignItems: 'center',
  },
  emojiPicker: {
    position: 'absolute',
    bottom: 'calc(100% + 6px)',
    left: '0',
    background: '#ffffff',
    border: '1px solid var(--panel-border)',
    borderRadius: '24px',
    padding: '6px 12px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    display: 'flex',
    gap: '8px',
    zIndex: 100,
  },
  pickerEmoji: {
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    userSelect: 'none',
  },
  pickerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  activityToggleBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center',
    cursor: 'pointer',
    borderRadius: '8px',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: 'transparent',
    transition: 'var(--transition-smooth)',
  },
  ticketIdLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    opacity: 0.8,
    fontFamily: 'monospace',
  },
  smallDeleteBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    color: '#ef4444',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'var(--transition-smooth)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  description: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  figmaLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--accent-blue)',
    textDecoration: 'none',
    fontWeight: '500',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'var(--transition-smooth)',
    width: 'fit-content',
  },
  figmaIcon: {
    color: '#f24e1e',
    fontWeight: 'bold',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  metaValue: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: 'rgba(255,159,10,0.03)',
    border: '1px solid rgba(255,159,10,0.1)',
    borderRadius: '10px',
    padding: '12px',
  },
  historyItem: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
  },
  historyDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-orange)',
    marginTop: '6px',
  },
  historyDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  historyAction: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  historyMeta: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  noHistory: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  commentsList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowY: 'auto',
    marginBottom: '15px',
    paddingRight: '6px',
    paddingBottom: '10px',
  },
  commentThreadContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  commentRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    width: '100%',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '13px',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'var(--transition-smooth)',
  },
  commentContentArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  commentBubble: {
    padding: '10px 14px',
    background: '#f3f4f6',
    borderRadius: '0 12px 12px 12px',
    border: '1px solid rgba(15, 23, 42, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '92%',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    gap: '16px',
    marginBottom: '2px',
  },
  commentUserGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  commentUser: {
    fontWeight: '600',
    color: '#1f2937',
  },
  commentTime: {
    color: '#6b7280',
    fontSize: '10px',
  },
  commentBody: {
    fontSize: '13px',
    color: '#374151',
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },
  youBadge: {
    fontSize: '9px',
    fontWeight: '700',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    color: 'var(--accent-blue)',
    padding: '1px 6px',
    borderRadius: '10px',
    textTransform: 'uppercase',
  },
  roleBadge: {
    fontSize: '9px',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  commentActionsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '2px',
    paddingLeft: '4px',
    position: 'relative',
  },
  likeBtnContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  commentActionBtn: {
    background: 'transparent',
    border: 'none',
    color: '#5e6778',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '500',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.2s, color 0.2s',
    outline: 'none',
    userSelect: 'none',
  },
  commentActionBtnActive: {
    color: '#0a66c2',
  },
  hoverReactionPanel: {
    position: 'absolute',
    bottom: '100%',
    left: '0',
    paddingBottom: '8px',
    zIndex: 1000,
  },
  hoverReactionInner: {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: '24px',
    padding: '4px 8px',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    gap: '6px',
  },
  hoverReactionEmoji: {
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
    padding: '2px',
    userSelect: 'none',
  },
  dotSeparator: {
    fontSize: '10px',
    color: '#9ca3af',
  },
  commentReactionsSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '12px',
    border: '1px solid rgba(15, 23, 42, 0.04)',
    marginLeft: 'auto',
    cursor: 'pointer',
  },
  reactionsSummaryEmojis: {
    fontSize: '10px',
    letterSpacing: '-2px',
    marginRight: '2px',
  },
  reactionsSummaryCount: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#4b5563',
  },
  repliesWrapper: {
    position: 'relative',
    paddingLeft: '48px',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  threadLine: {
    position: 'absolute',
    left: '18px',
    top: '-10px',
    bottom: '15px',
    width: '2px',
    backgroundColor: '#e5e7eb',
  },
  repliesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  replyRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    width: '100%',
  },
  replyAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '10px',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  replyBubble: {
    padding: '8px 12px',
    background: '#f9fafb',
    borderRadius: '0 12px 12px 12px',
    border: '1px solid rgba(15, 23, 42, 0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '92%',
  },
  replyFormWrapper: {
    position: 'relative',
    paddingLeft: '48px',
    width: '100%',
    display: 'flex',
  },
  replyForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    maxWidth: '92%',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '8px',
  },
  replyTextarea: {
    fontSize: '12.5px',
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    resize: 'none',
    width: '100%',
    fontFamily: 'inherit',
    outline: 'none',
  },
  replyFormActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    alignItems: 'center',
  },
  replyCancelBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '11px',
    color: '#4b5563',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  replySubmitBtn: {
    background: '#0a66c2',
    color: '#ffffff',
    border: 'none',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '12px',
    padding: '4px 12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  noComments: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '30px 0',
    fontStyle: 'italic',
  },
  commentForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  commentTextarea: {
    fontSize: '13px',
    padding: '10px',
    resize: 'none',
  },
  commentActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachmentBtn: {
    padding: '8px 12px',
    fontSize: '12px',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '0',
    backgroundColor: '#000',
    color: '#fff',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    marginBottom: '6px',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    zIndex: 1010,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  postBtn: {
    padding: '8px 16px',
    fontSize: '12px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
    width: '100%',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    minWidth: 0,
    width: '100%',
  },
  figmaLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--accent-blue)',
    textDecoration: 'none',
    fontWeight: '600',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    maxWidth: '100%',
  },
  figmaIcon: {
    fontSize: '14px',
  },
  editTicketBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '6px',
    border: '1px solid rgba(0, 113, 227, 0.3)',
    backgroundColor: 'rgba(0, 113, 227, 0.08)',
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  addTagBtn: {
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '6px',
    border: '1px solid rgba(0, 113, 227, 0.3)',
    backgroundColor: 'rgba(0, 113, 227, 0.06)',
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  tagPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '6px',
    letterSpacing: '0.3px',
  },
  removeTagBtn: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    lineHeight: '1',
    color: 'currentColor',
    opacity: 0.7,
    cursor: 'pointer',
    padding: '0 2px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px',
    marginLeft: '2px',
  },
  tagsMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    minWidth: '150px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
    zIndex: 1100,
    padding: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  tagOptionItem: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#0f172a',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    backgroundColor: '#f8fafc',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  formLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  editInput: {
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    width: '100%',
    fontFamily: 'inherit',
  },
  editTextarea: {
    padding: '10px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    width: '100%',
    minHeight: '90px',
    fontFamily: 'inherit',
    lineHeight: '1.5',
  },
  editActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  saveEditBtn: {
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  cancelEditBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: '#ffffff',
    color: '#64748b',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  imageGalleryGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '8px',
  },
  galleryThumbWrapper: {
    position: 'relative',
    width: '100px',
    height: '100px',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    backgroundColor: '#f8fafc',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  galleryThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  zoomHoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '18px',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  commentImagesGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
  },
  commentThumbWrapper: {
    width: '72px',
    height: '72px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(15, 23, 42, 0.1)',
    cursor: 'pointer',
    backgroundColor: '#f8fafc',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.15s ease',
  },
  commentThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
};
