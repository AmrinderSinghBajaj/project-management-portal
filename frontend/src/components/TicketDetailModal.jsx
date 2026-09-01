import React, { useState } from 'react';
import { API_BASE } from '../config';

const ALL_TECH_TAGS = ['android', 'ios', 'backend', 'angular', 'design', 'react', 'flutter', 'python'];

const TAG_STYLES = {
  android: { bg: 'rgba(16, 185, 129, 0.1)', color: '#047857', border: 'rgba(16, 185, 129, 0.25)' },
  ios: { bg: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8', border: 'rgba(59, 130, 246, 0.25)' },
  backend: { bg: 'rgba(124, 58, 237, 0.1)', color: '#6d28d9', border: 'rgba(124, 58, 237, 0.25)' },
  angular: { bg: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: 'rgba(239, 68, 68, 0.25)' },
  react: { bg: 'rgba(6, 182, 212, 0.1)', color: '#0e7490', border: 'rgba(6, 182, 212, 0.25)' },
  design: { bg: 'rgba(236, 72, 153, 0.1)', color: '#be185d', border: 'rgba(236, 72, 153, 0.25)' },
  flutter: { bg: 'rgba(2, 132, 199, 0.1)', color: '#0369a1', border: 'rgba(2, 132, 199, 0.25)' },
  python: { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: 'rgba(245, 158, 11, 0.25)' },
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

  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');

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
      const res = await fetch(`${API_BASE}/tickets/${ticket._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser.name,
          comment: replyText.trim(),
          parentId
        })
      });
      if (!res.ok) throw new Error('Failed to post reply');
      setReplyText('');
      setReplyingToCommentId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReact = async (commentId, emoji) => {
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticket._id}/comments/${commentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, user: currentUser.name })
      });
      if (!res.ok) throw new Error('Failed to react to comment');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const currentStatusLower = (ticket.status || '').toLowerCase();
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

    try {
      const res = await fetch(`${API_BASE}/tickets/${ticket._id}`, {
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
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTypeChange = async (newType) => {
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticketType: newType,
          userName: currentUser.name 
        })
      });
      if (!res.ok) throw new Error('Failed to update ticket type');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priority: newPriority,
          userName: currentUser.name 
        })
      });
      if (!res.ok) throw new Error('Failed to update priority');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleTechTag = async (tag) => {
    const tagLower = tag.toLowerCase();
    const currentTags = ticket.tags || [];
    const isTagged = currentTags.some(t => t.toLowerCase() === tagLower);
    const newTags = isTagged
      ? currentTags.filter(t => t.toLowerCase() !== tagLower)
      : [...currentTags, tag];

    try {
      const res = await fetch(`${API_BASE}/tickets/${ticket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tags: newTags,
          tagAction: isTagged ? `Removed '${tag}' tech team tag` : `Added '${tag}' tech team tag`,
          userName: currentUser.name 
        })
      });
      if (!res.ok) throw new Error('Failed to update tech teams');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveTicketEdits = async (e) => {
    e.preventDefault();
    if (!editTask.trim()) {
      alert('Task title cannot be empty.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task: editTask.trim(),
          description: editDesc.trim(),
          figmaRef: editFigma.trim(),
          deadline: editDeadline || null,
          ticketType: editType,
          priority: editPriority,
          isEditAction: true,
          userName: currentUser.name 
        })
      });
      if (!res.ok) throw new Error('Failed to update ticket details');
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
      const res = await fetch(`${API_BASE}/tickets/${ticket._id}`, {
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
    if (!newComment.trim()) return;

    setCommenting(true);
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticket._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser.name,
          comment: newComment.trim()
        })
      });
      if (!res.ok) throw new Error('Failed to post comment');
      setNewComment('');
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
            <span style={styles.ticketIdLabel}>ID: #{ticket._id ? ticket._id.slice(-6).toUpperCase() : ''}</span>
            <h3 style={styles.title}>{ticket.task}</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 'QA', 'Quality Analyst (QA)', 'CEO', 'Delivery Head'].includes(currentUser.role) && !isEditing && (
              <button 
                type="button"
                onClick={() => {
                  setEditTask(ticket.task || '');
                  setEditDesc(ticket.description || '');
                  setEditType(ticket.ticketType || 'Task');
                  setEditPriority(ticket.priority || 'Medium');
                  setEditFigma(ticket.figmaRef || '');
                  setEditDeadline(ticket.deadline ? ticket.deadline.slice(0, 10) : '');
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
                  <label style={styles.formLabel}>Description</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    style={styles.editTextarea}
                    rows={4}
                    required
                  />
                </div>
              </form>
            ) : (
              <>
                <div style={styles.section}>
                  <h4 style={styles.sectionTitle}>Description</h4>
                  <p style={styles.description}>{renderTextWithLinks(ticket.description)}</p>
                </div>

                {ticket.figmaRef && (
                  <div style={styles.section}>
                    <h4 style={styles.sectionTitle}>Figma Reference</h4>
                    <a 
                      href={ticket.figmaRef} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={styles.figmaLink}
                    >
                      <span style={styles.figmaIcon}>❖</span> Open Figma Design Reference
                    </a>
                  </div>
                )}
              </>
            )}

            {/* Discussion Feed (Comments) */}
            {ticket.comments && ticket.comments.length > 0 && (
              <div style={styles.discussionSection}>
                <h4 style={styles.sectionTitle}>Discussion Feed</h4>
                
                <div style={styles.commentsList}>
                  {(() => {
                    const topLevelComments = (ticket.comments || []).filter(c => !c.parentId);
                    const repliesByParentId = (ticket.comments || []).reduce((acc, c) => {
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
                              <div style={styles.commentBody}>{renderTextWithLinks(comm.comment)}</div>
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
                                        <div style={styles.commentBody}>{renderTextWithLinks(reply.comment)}</div>
                                      </div>

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
                                          <>
                                            <span style={styles.dotSeparator}>•</span>
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
                                          </>
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
          <form onSubmit={handleAddComment} style={{ ...styles.commentForm, marginTop: (ticket.comments?.length > 0) ? '8px' : '0px' }}>
            <textarea
              placeholder="Write a message to the team..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              style={styles.commentTextarea}
              required
            />
            <div style={styles.commentActions}>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="secondary"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  style={styles.attachmentBtn}
                >
                  📎 Attach Media
                </button>
                {showTooltip && (
                  <div style={styles.tooltip}>
                    Coming soon (DB limit)
                  </div>
                )}
              </div>

              <button type="submit" disabled={commenting} style={styles.postBtn}>
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
                <span>{ticket.status}</span>
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
                      const isCurrentTesting = (ticket.status || '').toLowerCase().includes('ready') && (ticket.status || '').toLowerCase().includes('testing');
                      const r = (currentUser?.role || '').toLowerCase();
                      const isAuthorized = r.includes('qa') || r.includes('tester') || r.includes('quality') || 
                                           r.includes('pm') || r.includes('project manager') || 
                                           r.includes('pc') || r.includes('project coordinator') || 
                                           r.includes('delivery head') || r.includes('ceo');
                      const isRestricted = isCurrentTesting && col.title !== ticket.status && !isAuthorized;

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
                            ...(ticket.status === col.title ? styles.activeStatusOption : {})
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
                <span>{ticket.ticketType === 'Feature' ? '✨ Feature' : ticket.ticketType === 'Bug' ? '🐞 Bug' : '📋 Task'}</span>
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
                          ...(ticket.ticketType === item.type ? styles.activeStatusOption : {})
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
                <span>{ticket.priority === 'High' ? '🔴 High' : ticket.priority === 'Low' ? '🟢 Low' : '🟡 Medium'}</span>
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
                          ...(ticket.priority === item.priority ? styles.activeStatusOption : {})
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

            {/* Tech Teams Dropdown (Toggleable by everyone) */}
            <div style={styles.sidebarSection}>
              <label style={styles.sidebarLabel}>TECH TEAMS ({ticket.tags?.length || 0})</label>
              <div 
                onClick={() => setIsAddingTag(!isAddingTag)}
                style={{ ...styles.statusTrigger, minHeight: '38px', flexWrap: 'wrap', gap: '4px' }}
                title="Click to tag or untag tech teams"
              >
                {(ticket.tags || []).length === 0 ? (
                  <span style={{ color: '#94a3b8' }}>Select Tech Teams...</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1, minWidth: 0 }}>
                    {(ticket.tags || []).map(tag => {
                      const tagKey = tag.toLowerCase();
                      const tagStyle = TAG_STYLES[tagKey] || { bg: 'rgba(148, 163, 184, 0.15)', color: '#334155', border: 'rgba(148, 163, 184, 0.3)' };
                      return (
                        <span 
                          key={tag} 
                          style={{
                            ...styles.tagPill,
                            backgroundColor: tagStyle.bg,
                            color: tagStyle.color,
                            border: `1px solid ${tagStyle.border}`
                          }}
                        >
                          {tag === 'ios' ? 'iOS' : tag.charAt(0).toUpperCase() + tag.slice(1)}
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
                      const isSelected = (ticket.tags || []).some(t => t.toLowerCase() === tag.toLowerCase());
                      const label = tag === 'ios' ? 'iOS' : tag.charAt(0).toUpperCase() + tag.slice(1);
                      return (
                        <div
                          key={tag}
                          onClick={() => handleToggleTechTag(tag)}
                          style={{
                            ...styles.statusOption,
                            ...(isSelected ? styles.activeStatusOption : {}),
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          className="dropdown-option"
                        >
                          <span>{label}</span>
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
                {ticket.deadline ? formatDate(ticket.deadline) : 'No deadline set'}
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
                  {ticket.history && ticket.history.length > 0 ? (
                    ticket.history.map((log, idx) => (
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
};
