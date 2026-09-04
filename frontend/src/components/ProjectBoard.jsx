import React, { useState, useEffect, useRef } from 'react';
import { API_BASE, SERVER_BASE } from '../config';
import RichTextEditorInput, { getWordCountFromHtml } from './RichTextEditor';
import { 
  isVideoFile, 
  isImageFile, 
  compressImageFile, 
  uploadImagesToServer, 
  formatFileSize, 
  getFullImageUrl 
} from '../utils/imageUtils';
import VideoPromptModal from './VideoPromptModal';

const LINK_CATEGORIES = [
  'Live URL',
  'Test / Staging URL',
  'Admin Portal',
  'Dispatcher Portal',
  'API / Swagger',
  'Figma / Design',
  'Database / Server',
  'Other'
];

const CATEGORY_STYLES = {
  'Live URL': { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', icon: '🌐', border: 'rgba(16, 185, 129, 0.25)' },
  'Test / Staging URL': { bg: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', icon: '🧪', border: 'rgba(2, 132, 199, 0.25)' },
  'Admin Portal': { bg: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5', icon: '🛡️', border: 'rgba(79, 70, 229, 0.25)' },
  'Dispatcher Portal': { bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706', icon: '🚗', border: 'rgba(217, 119, 6, 0.25)' },
  'API / Swagger': { bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', icon: '⚡', border: 'rgba(124, 58, 237, 0.25)' },
  'Figma / Design': { bg: 'rgba(219, 39, 119, 0.12)', color: '#db2777', icon: '🎨', border: 'rgba(219, 39, 119, 0.25)' },
  'Database / Server': { bg: 'rgba(13, 148, 136, 0.12)', color: '#0d9488', icon: '🗄️', border: 'rgba(13, 148, 136, 0.25)' },
  'Other': { bg: 'rgba(71, 85, 105, 0.12)', color: '#475569', icon: '🔗', border: 'rgba(71, 85, 105, 0.25)' },
};

const getTicketTypeStyle = (type) => {
  switch (type) {
    case 'Feature':
      return { bg: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', icon: '✨', label: 'Feature', border: 'rgba(124, 58, 237, 0.25)' };
    case 'Bug':
      return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', icon: '🐞', label: 'Bug', border: 'rgba(239, 68, 68, 0.25)' };
    case 'Task':
    default:
      return { bg: 'rgba(30, 58, 138, 0.08)', color: '#1e3a8a', icon: '📋', label: 'Task', border: 'rgba(30, 58, 138, 0.18)' };
  }
};

const PRIORITY_ORDER = { 'High': 1, 'Medium': 2, 'Low': 3 };

const getPriorityDotColor = (priority) => {
  switch (priority) {
    case 'High':
      return '#ef4444'; // Red
    case 'Low':
      return '#10b981'; // Green
    case 'Medium':
    default:
      return '#f59e0b'; // Yellow/Amber
  }
};

const getPriorityStyle = (priority) => {
  switch (priority) {
    case 'High':
      return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.25)', icon: '🔴', label: 'High' };
    case 'Low':
      return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)', icon: '🟢', label: 'Low' };
    case 'Medium':
    default:
      return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)', icon: '🟡', label: 'Medium' };
  }
};

export default function ProjectBoard({ 
  projectData, 
  currentUser, 
  onRefresh, 
  onSelectTicket,
  onEditProject,
  onBackToDashboard,
  onLogout
}) {
  const { project, tickets = [] } = projectData;
  const [activeTab, setActiveTab] = useState('board'); // board, docs, cr
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [showAddCR, setShowAddCR] = useState(false);
  const [showEditColumns, setShowEditColumns] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // New ticket state
  const [ticketTask, setTicketTask] = useState('');
  const [ticketType, setTicketType] = useState('Task'); // Feature, Task, Bug
  const [ticketPriority, setTicketPriority] = useState('Medium'); // High, Medium, Low
  const [ticketDesc, setTicketDesc] = useState('');
  const ticketDescRef = useRef(null);
  const [ticketFigma, setTicketFigma] = useState('');
  const [ticketDeadline, setTicketDeadline] = useState('');
  const [ticketTags, setTicketTags] = useState([]);
  const [ticketImages, setTicketImages] = useState([]);
  const [isCompressingImages, setIsCompressingImages] = useState(false);
  const [showVideoPrompt, setShowVideoPrompt] = useState(false);
  const [isDragOverTicketDropzone, setIsDragOverTicketDropzone] = useState(false);
  const ticketFileInputRef = useRef(null);
  const [isTicketTagsOpen, setIsTicketTagsOpen] = useState(false);
  const [isCrTagsOpen, setIsCrTagsOpen] = useState(false);
  const [ticketStatus, setTicketStatus] = useState('To be started');
  const [localColumns, setLocalColumns] = useState([]);

  // Direct Financials Editing state
  const [isEditingFinancials, setIsEditingFinancials] = useState(false);
  const [editRevenue, setEditRevenue] = useState(project.totalRevenue || 0);
  const [editReceived, setEditReceived] = useState(project.paymentReceived || 0);
  const [editPending, setEditPending] = useState(project.pendingPayment || 0);

  useEffect(() => {
    setEditRevenue(project.totalRevenue || 0);
    setEditReceived(project.paymentReceived || 0);
    setEditPending(project.pendingPayment || 0);
  }, [project.totalRevenue, project.paymentReceived, project.pendingPayment]);

  const handleSaveFinancials = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/projects/${project._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalRevenue: Number(editRevenue) || 0,
          paymentReceived: Number(editReceived) || 0,
          pendingPayment: Number(editPending) || 0
        })
      });
      if (!res.ok) throw new Error('Failed to update financials');
      setIsEditingFinancials(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (showEditColumns) {
      setLocalColumns(columns.map(c => ({ ...c })));
    }
  }, [showEditColumns]);

  const handleAddLocalColumn = () => {
    const nextSeq = localColumns.length > 0 
      ? Math.max(...localColumns.map(c => c.sequence || 0)) + 1 
      : 1;
    setLocalColumns([
      ...localColumns,
      { title: '', sequence: nextSeq }
    ]);
  };

  const handleRemoveLocalColumn = (index) => {
    setLocalColumns(localColumns.filter((_, idx) => idx !== index));
  };

  const handleLocalColumnChange = (index, field, value) => {
    const updated = [...localColumns];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setLocalColumns(updated);
  };

  const handleSaveColumns = async (e) => {
    e.preventDefault();
    if (localColumns.some(c => !c.title.trim())) {
      alert('Column titles cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${project._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns: localColumns.map(c => ({
            title: c.title.trim(),
            sequence: Number(c.sequence) || 0
          }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update columns');
      setShowEditColumns(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // New CR state
  const [crTitle, setCrTitle] = useState('');
  const [crFile, setCrFile] = useState(null);
  const [crDesc, setCrDesc] = useState('');
  const [crFigma, setCrFigma] = useState('');
  const [crDeadline, setCrDeadline] = useState('');
  const [crTags, setCrTags] = useState([]);
  // Global Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Applied filters on the actual board
  const [appliedFilterTypes, setAppliedFilterTypes] = useState([]); // [] means all, or ['Feature', 'Bug']
  const [appliedFilterPriorities, setAppliedFilterPriorities] = useState([]); // [] means all, or ['High', 'Medium']
  const [appliedFilterTechs, setAppliedFilterTechs] = useState([]); // [] means all, or ['android', 'ios']
  const [appliedFilterSource, setAppliedFilterSource] = useState('all'); // 'all', 'client', 'internal'

  // Staged / Temporary filters inside the open dropdown
  const [tempFilterTypes, setTempFilterTypes] = useState([]);
  const [tempFilterPriorities, setTempFilterPriorities] = useState([]);
  const [tempFilterTechs, setTempFilterTechs] = useState([]);
  const [tempFilterSource, setTempFilterSource] = useState('all');

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  // When opening the menu, copy applied to temp
  const handleOpenFilterMenu = () => {
    setTempFilterTypes([...appliedFilterTypes]);
    setTempFilterPriorities([...appliedFilterPriorities]);
    setTempFilterTechs([...appliedFilterTechs]);
    setTempFilterSource(appliedFilterSource);
    setIsFilterMenuOpen(true);
  };

  const handleCloseFilterMenu = () => {
    setIsFilterMenuOpen(false);
  };

  const toggleTempFilterType = (type) => {
    if (type === 'All') {
      setTempFilterTypes([]);
    } else {
      setTempFilterTypes(prev => 
        prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
      );
    }
  };

  const toggleTempFilterPriority = (priority) => {
    if (priority === 'All') {
      setTempFilterPriorities([]);
    } else {
      setTempFilterPriorities(prev => 
        prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
      );
    }
  };

  const toggleTempFilterTech = (tech) => {
    if (tech === 'All') {
      setTempFilterTechs([]);
    } else {
      const lower = tech.toLowerCase();
      setTempFilterTechs(prev => 
        prev.includes(lower) ? prev.filter(t => t !== lower) : [...prev, lower]
      );
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilterTypes(tempFilterTypes);
    setAppliedFilterPriorities(tempFilterPriorities);
    setAppliedFilterTechs(tempFilterTechs);
    setAppliedFilterSource(tempFilterSource);
    setIsFilterMenuOpen(false);
  };

  const handleClearAllFilters = () => {
    setTempFilterTypes([]);
    setTempFilterPriorities([]);
    setTempFilterTechs([]);
    setTempFilterSource('all');
    setAppliedFilterTypes([]);
    setAppliedFilterPriorities([]);
    setAppliedFilterTechs([]);
    setAppliedFilterSource('all');
    setIsFilterMenuOpen(false);
  };

  const activeFilterCount = appliedFilterTypes.length + 
                            appliedFilterPriorities.length + 
                            appliedFilterTechs.length + 
                            (appliedFilterSource !== 'all' ? 1 : 0);

  const filteredSearchTickets = tickets.filter(t => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return false;
    
    const matchesId = t._id.toLowerCase() === query || 
                      t._id.toLowerCase().includes(query) || 
                      t._id.slice(-6).toLowerCase() === query || 
                      t._id.slice(-6).toLowerCase().includes(query);
    const matchesTitle = t.task.toLowerCase().includes(query);
    const matchesDesc = t.description ? t.description.toLowerCase().includes(query) : false;
    
    return matchesId || matchesTitle || matchesDesc;
  });

  // New Doc state
  const docFileInputRef = useRef(null);

  // Important Links & Credentials state
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkCategory, setLinkCategory] = useState('Live URL');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkUsername, setLinkUsername] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkNotes, setLinkNotes] = useState('');
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkCategoryFilter, setLinkCategoryFilter] = useState('All');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getWordCount = (str) => {
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const BUG_TEMPLATE = `<p><strong>Steps to Reproduce:</strong></p><p>1. </p><p>2. </p><p>3. </p><p><br></p><p><strong>Expected Result:</strong></p><p><br></p><p><strong>Figma Reference Link:</strong></p><p><br></p>`;

  const handleTicketTypeChange = (newType) => {
    setTicketType(newType);
    if (newType === 'Bug') {
      const isDescEmptyOrBugTemplate = !ticketDesc.trim() || 
                                       ticketDesc === '<p><br></p>' || 
                                       ticketDesc.includes('Steps to Reproduce');
      if (isDescEmptyOrBugTemplate) {
        setTicketDesc(BUG_TEMPLATE);
      }
    } else if (ticketDesc.includes('Steps to Reproduce') && ticketDesc.includes('Figma Reference')) {
      setTicketDesc('');
    }
  };

  const handleProcessIncomingTicketFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    // Check for video files
    const hasVideo = files.some(f => isVideoFile(f));
    if (hasVideo) {
      setShowVideoPrompt(true);
    }

    // Filter only images
    const imageFiles = files.filter(f => isImageFile(f));
    if (imageFiles.length === 0) return;

    // Limit to max 7 images total
    const currentCount = ticketImages.length;
    const availableSlots = 7 - currentCount;
    if (availableSlots <= 0) {
      alert('Maximum 7 images allowed per ticket.');
      return;
    }

    const filesToProcess = imageFiles.slice(0, availableSlots);
    if (imageFiles.length > availableSlots) {
      alert(`Only ${availableSlots} more image(s) could be added (max 7 images per ticket).`);
    }

    setIsCompressingImages(true);
    try {
      const processedObjects = await Promise.all(
        filesToProcess.map(async (f) => {
          const originalSize = f.size;
          let fileToUse = f;
          let isCompressed = false;

          // If over 2MB, compress down to ~1MB
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

      setTicketImages(prev => [...prev, ...processedObjects]);
    } catch (err) {
      console.error('Error processing images:', err);
    } finally {
      setIsCompressingImages(false);
    }
  };

  const handleRemoveTicketImage = (index) => {
    setTicketImages(prev => {
      const copy = [...prev];
      if (copy[index]?.previewUrl) {
        URL.revokeObjectURL(copy[index].previewUrl);
      }
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleTicketModalPaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const files = Array.from(e.clipboardData.files);
      const hasVideo = files.some(f => isVideoFile(f));
      if (hasVideo) {
        setShowVideoPrompt(true);
      }
      const imageFiles = files.filter(f => isImageFile(f));
      if (imageFiles.length > 0) {
        e.preventDefault();
        handleProcessIncomingTicketFiles(imageFiles);
      }
    }
  };

  // Ticket creation handler
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setError('');

    if (getWordCountFromHtml(ticketDesc) > 400) {
      setError('Description must be 400 words or less.');
      return;
    }

    setLoading(true);
    try {
      let uploadedImagePaths = [];
      if (ticketImages.length > 0) {
        const rawFiles = ticketImages.map(img => img.file);
        uploadedImagePaths = await uploadImagesToServer(rawFiles);
      }

      const isClientUser = currentUser?.role === 'Client';

      const res = await fetch(`${API_BASE}/projects/${project._id}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: ticketTask,
          ticketType: ticketType || 'Task',
          priority: ticketPriority || 'Medium',
          description: ticketDesc,
          figmaRef: ticketFigma,
          deadline: ticketDeadline,
          tags: ticketTags,
          images: uploadedImagePaths,
          createdBy: currentUser.name,
          status: ticketStatus,
          isClientTicket: isClientUser,
          reportedBy: isClientUser ? currentUser.name : null,
          reportedByEmail: isClientUser ? currentUser.email : null,
          reportedByRole: isClientUser ? 'Client' : null
        })
      });
      if (!res.ok) throw new Error('Failed to create ticket');
      
      // Reset form
      setTicketTask('');
      setTicketType('Task');
      setTicketPriority('Medium');
      setTicketDesc('');
      setTicketFigma('');
      setTicketDeadline('');
      setTicketTags([]);
      setTicketImages([]);
      setShowAddTicket(false);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Ticket status update handler
  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          userName: currentUser.name
        })
      });
      if (!res.ok) throw new Error('Failed to update status');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle ticket tags helper
  const handleToggleTag = (tag) => {
    if (ticketTags.includes(tag)) {
      setTicketTags(ticketTags.filter(t => t !== tag));
    } else {
      setTicketTags([...ticketTags, tag]);
    }
  };

  // Toggle CR tags helper
  const handleToggleCRTag = (tag) => {
    if (crTags.includes(tag)) {
      setCrTags(crTags.filter(t => t !== tag));
    } else {
      setCrTags([...crTags, tag]);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain');
    if (!ticketId) return;

    // Check if source ticket is currently in Ready for Testing
    const sourceTicket = tickets.find(t => t._id === ticketId);
    if (sourceTicket) {
      const sourceStatusLower = (sourceTicket.status || '').toLowerCase();
      const targetStatusLower = (targetStatus || '').toLowerCase();

      if (sourceStatusLower.includes('ready') && sourceStatusLower.includes('testing') && sourceStatusLower !== targetStatusLower) {
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
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: targetStatus, 
          userName: currentUser.name,
          userRole: currentUser.role
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update ticket status');
      }
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Document Upload (1-click from hidden file input)
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', currentUser.name);

    try {
      const res = await fetch(`${API_BASE}/projects/${project._id}/documents`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Failed to upload document');
      e.target.value = '';
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Document Delete
  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to remove this document?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${project._id}/documents/${docId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete document');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Important Links & Credentials Handlers
  const handleOpenAddLinkModal = () => {
    setEditingLinkId(null);
    setLinkTitle('');
    setLinkCategory('Live URL');
    setLinkUrl('');
    setLinkUsername('');
    setLinkPassword('');
    setLinkNotes('');
    setShowAddLinkModal(true);
  };

  const handleOpenEditLinkModal = (link) => {
    setEditingLinkId(link._id);
    setLinkTitle(link.title || '');
    setLinkCategory(link.category || 'Live URL');
    setLinkUrl(link.url || '');
    setLinkUsername(link.username || '');
    setLinkPassword(link.password || '');
    setLinkNotes(link.notes || '');
    setShowAddLinkModal(true);
  };

  const handleCloseLinkModal = () => {
    setShowAddLinkModal(false);
    setEditingLinkId(null);
  };

  const handleSaveLink = async (e) => {
    e.preventDefault();
    if (!linkTitle.trim()) {
      alert('Title is required.');
      return;
    }
    setLoading(true);
    try {
      if (editingLinkId) {
        const res = await fetch(`${API_BASE}/projects/${project._id}/links/${editingLinkId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: linkTitle,
            category: linkCategory,
            url: linkUrl,
            username: linkUsername,
            password: linkPassword,
            notes: linkNotes
          })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to update link / credential');
        }
      } else {
        const res = await fetch(`${API_BASE}/projects/${project._id}/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: linkTitle,
            category: linkCategory,
            url: linkUrl,
            username: linkUsername,
            password: linkPassword,
            notes: linkNotes,
            addedBy: currentUser.name
          })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to add link / credential');
        }
      }
      setShowAddLinkModal(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!window.confirm('Are you sure you want to remove this link / credential?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${project._id}/links/${linkId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete link');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 2000);
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredLinks = (project.importantLinks || []).filter(link => {
    const matchesCategory = linkCategoryFilter === 'All' || link.category === linkCategoryFilter;
    if (!matchesCategory) return false;
    if (!linkSearchQuery.trim()) return true;
    const q = linkSearchQuery.toLowerCase();
    return (
      (link.title && link.title.toLowerCase().includes(q)) ||
      (link.category && link.category.toLowerCase().includes(q)) ||
      (link.url && link.url.toLowerCase().includes(q)) ||
      (link.username && link.username.toLowerCase().includes(q)) ||
      (link.notes && link.notes.toLowerCase().includes(q))
    );
  });

  // CR Upload
  const handleUploadCR = async (e) => {
    e.preventDefault();
    if (!crTitle.trim()) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('title', crTitle.trim());
    formData.append('uploadedBy', currentUser.name);
    formData.append('description', crDesc.trim());
    formData.append('figmaRef', crFigma.trim());
    formData.append('deadline', crDeadline);
    formData.append('tags', JSON.stringify(crTags));
    if (crFile) {
      formData.append('file', crFile);
    }

    try {
      const res = await fetch(`${API_BASE}/projects/${project._id}/change-requests`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Failed to raise Change Request');
      setCrTitle('');
      setCrDesc('');
      setCrFigma('');
      setCrDeadline('');
      setCrTags([]);
      setCrFile(null);
      e.target.reset();
      setShowAddCR(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Find and select corresponding ticket for Change Request details
  const handleSelectCR = (cr) => {
    const correspondingTicket = tickets.find(t => 
      t.task === `CR: ${cr.title}` || 
      t.task === `[CR] ${cr.title}` ||
      t.task.toLowerCase().includes(cr.title.toLowerCase())
    );
    
    if (correspondingTicket) {
      onSelectTicket(correspondingTicket);
    } else {
      alert('Associated task ticket not found or has been removed.');
    }
  };

  // Edit Change Request
  const handleEditCR = async (crId, oldTitle) => {
    const newTitle = prompt('Enter new title for Change Request:', oldTitle);
    if (newTitle === null) return;
    if (!newTitle.trim()) {
      alert('Title cannot be empty');
      return;
    }
    if (newTitle.trim().length > 80) {
      alert('Title cannot exceed 80 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${project._id}/change-requests/${crId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      if (!res.ok) throw new Error('Failed to update Change Request');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Change Request
  const handleDeleteCR = async (crId) => {
    if (!window.confirm('Are you sure you want to delete this Change Request and its spawned ticket?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${project._id}/change-requests/${crId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete Change Request');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = (project.columns && project.columns.length > 0)
    ? [...project.columns].sort((a, b) => a.sequence - b.sequence)
    : [
        { title: 'To be started', sequence: 1 },
        { title: 'In progress', sequence: 2 },
        { title: 'Ready for testing', sequence: 3 },
        { title: 'Tested', sequence: 4 }
      ];

  return (
    <div style={styles.boardContainer} className="fade-in">
      <div style={styles.boardHeader}>
        <div style={styles.headerLeft}>
          {currentUser?.role === 'Client' && (
            <div style={{ display: 'flex', alignItems: 'center', marginRight: '6px' }}>
              <img 
                src="/logo_icon.png" 
                alt="Apptunix" 
                style={{ 
                  height: '36px', 
                  width: '36px', 
                  objectFit: 'contain',
                  clipPath: 'inset(0% 0% 5% 5%)'
                }} 
              />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentUser?.role !== 'Client' && <div style={styles.projectBadge}>ACTIVE PROJECT</div>}
            {onBackToDashboard && ['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 'CEO', 'Delivery Head'].includes(currentUser?.role) && (
              <button
                type="button"
                onClick={onBackToDashboard}
                style={styles.backDashboardBtn}
                title="Return to Projects Overview Dashboard"
              >
                📊 All Projects
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={styles.projectTitle}>{project.name}</h1>
          </div>
          <p style={styles.projectDesc}>{project.description || (currentUser?.role === 'Client' ? 'Client Issue Portal' : '')}</p>
        </div>

        {/* Global Search Bar */}
        <div style={styles.searchContainer}>
          <div style={styles.searchBox}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search tickets by title, description, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')} 
                style={styles.clearSearchBtn}
              >
                ✕
              </button>
            )}
          </div>

          {searchQuery.trim() && (
            <div style={styles.searchDropdown} className="glass">
              {filteredSearchTickets.length === 0 ? (
                <div style={styles.searchNoResults}>No matching tickets found</div>
              ) : (
                filteredSearchTickets.map(t => (
                  <div 
                    key={t._id} 
                    onClick={() => {
                      onSelectTicket(t);
                      setSearchQuery('');
                    }}
                    style={styles.searchResultItem}
                    className="dropdown-option"
                  >
                    <div style={styles.searchResultHeader}>
                      <span style={styles.searchResultTitle}>{t.task}</span>
                      <span style={styles.searchResultId}>#{t._id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div style={styles.searchResultDesc}>
                      {t.description ? t.description.slice(0, 70) + '...' : 'No description'}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Payments & Financials: ONLY visible to PM and PC */}
          {['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 'CEO'].includes(currentUser?.role) && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setEditRevenue(project.totalRevenue || 0);
                  setEditReceived(project.paymentReceived || 0);
                  setEditPending(project.pendingPayment || 0);
                  setIsEditingFinancials(!isEditingFinancials);
                }}
                style={styles.paymentsHeaderBtn}
                className="payments-header-btn"
                title="Click to view and update project payments"
              >
                <span style={{ fontSize: '15px' }}>💳</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                  <div style={styles.paymentsBtnLabel}>PAYMENTS</div>
                  <div style={styles.paymentsBtnValue}>
                    <span style={{ color: '#059669', fontWeight: '700' }}>
                      ${(project.paymentReceived || 0).toLocaleString()}
                    </span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 3px' }}>/</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                      ${(project.totalRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: '2px' }}>▼</span>
              </button>

              {isEditingFinancials && (
                <>
                  <div 
                    style={styles.dropdownOverlayClose} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingFinancials(false);
                    }} 
                  />
                  <div 
                    style={styles.financialsPopover} 
                    className="fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={styles.financialsPopoverHeader}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                          Project Payments
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Track revenue, received payments, and pending dues
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingFinancials(false);
                        }}
                        style={styles.closeMiniBtn}
                      >
                        ×
                      </button>
                    </div>

                    {/* Financial Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                      <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                          ${(project.totalRevenue || 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#059669', textTransform: 'uppercase' }}>Received</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#059669', marginTop: '2px' }}>
                          ${(project.paymentReceived || 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ background: (project.pendingPayment || 0) > 0 ? 'rgba(239, 68, 68, 0.08)' : '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: (project.pendingPayment || 0) > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: (project.pendingPayment || 0) > 0 ? '#dc2626' : 'var(--text-muted)', textTransform: 'uppercase' }}>Pending</div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: (project.pendingPayment || 0) > 0 ? '#dc2626' : 'var(--text-primary)', marginTop: '2px' }}>
                          ${(project.pendingPayment || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSaveFinancials} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={styles.modalInputGroup}>
                        <label style={styles.formFieldLabel}>Total Revenue ($)</label>
                        <input
                          type="number"
                          value={editRevenue}
                          onChange={(e) => setEditRevenue(e.target.value)}
                          placeholder="0"
                          min="0"
                          style={styles.financialInput}
                          required
                          autoFocus
                        />
                      </div>

                      <div style={styles.modalInputGroup}>
                        <label style={styles.formFieldLabel}>Payment Received ($)</label>
                        <input
                          type="number"
                          value={editReceived}
                          onChange={(e) => setEditReceived(e.target.value)}
                          placeholder="0"
                          min="0"
                          style={styles.financialInput}
                          required
                        />
                      </div>

                      <div style={styles.modalInputGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={styles.formFieldLabel}>Pending Payment ($)</label>
                          <button
                            type="button"
                            onClick={() => {
                              const autoPending = Math.max(0, (Number(editRevenue) || 0) - (Number(editReceived) || 0));
                              setEditPending(autoPending);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                          >
                            Auto Calculate
                          </button>
                        </div>
                        <input
                          type="number"
                          value={editPending}
                          onChange={(e) => setEditPending(e.target.value)}
                          placeholder="0"
                          min="0"
                          style={styles.financialInput}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingFinancials(false);
                          }} 
                          style={{
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            backgroundColor: 'var(--accent-blue)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 'CEO'].includes(currentUser?.role) && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="settings-btn"
                style={styles.settingsHeaderBtn}
                title="Project Settings"
              >
                ⚙️
              </button>
              
              {showSettingsMenu && (
                <>
                  <div style={styles.settingsMenuOverlay} onClick={() => setShowSettingsMenu(false)} />
                  <div style={styles.settingsMenu} className="glass fade-in">
                    <div 
                      style={styles.settingsMenuItem}
                      onClick={() => {
                        setShowSettingsMenu(false);
                        onEditProject(project);
                      }}
                      className="dropdown-option"
                    >
                      ✏️ Edit Project Details
                    </div>
                    <div 
                      style={styles.settingsMenuItem}
                      onClick={() => {
                        setShowSettingsMenu(false);
                        setShowEditColumns(true);
                      }}
                      className="dropdown-option"
                    >
                      ⚙️ Manage Board Columns
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {currentUser?.role !== 'Client' ? (
            <div style={styles.headerRight}>
              <div style={styles.dateLabel}>DELIVERY DEADLINE</div>
              <div style={styles.dateValue}>{formatDate(project.deliveryDate)}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-blue)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '12px',
                  flexShrink: 0
                }}>
                  {currentUser?.name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {currentUser?.name || 'Client'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    Client
                  </span>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 11px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'var(--transition-smooth)'
                  }}
                  title="Sign Out"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Menu Panel */}
      <div style={styles.tabsPanel} className="glass">
        <div style={styles.tabsList}>
          <div 
            onClick={() => setActiveTab('board')}
            className="tab-item"
            style={{ ...styles.tab, ...(activeTab === 'board' ? styles.tabActive : {}) }}
          >
            Tasks Board
          </div>
          {currentUser?.role !== 'Client' && (
            <>
              <div 
                onClick={() => setActiveTab('docs')}
                className="tab-item"
                style={{ ...styles.tab, ...(activeTab === 'docs' ? styles.tabActive : {}) }}
              >
                Important Docs/URL ({(project.documents?.length || 0) + (project.importantLinks?.length || 0)})
              </div>
              <div 
                onClick={() => setActiveTab('cr')}
                className="tab-item"
                style={{ ...styles.tab, ...(activeTab === 'cr' ? styles.tabActive : {}) }}
              >
                Change Requests ({project.changeRequests?.length || 0})
              </div>
            </>
          )}
        </div>

        {/* Right Actions: Filter & Add CR */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {activeTab === 'board' && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  if (isFilterMenuOpen) {
                    handleCloseFilterMenu();
                  } else {
                    handleOpenFilterMenu();
                  }
                }}
                style={{
                  ...styles.filterToggleBtn,
                  backgroundColor: activeFilterCount > 0 ? 'var(--accent-blue)' : '#ffffff',
                  color: activeFilterCount > 0 ? '#ffffff' : 'var(--text-primary)',
                  borderColor: activeFilterCount > 0 ? 'var(--accent-blue)' : 'rgba(15, 23, 42, 0.12)',
                }}
                className="filter-toggle-btn"
              >
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span style={styles.filterActiveCountBadge}>
                    {activeFilterCount}
                  </span>
                )}
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{isFilterMenuOpen ? '▲' : '▼'}</span>
              </button>

              {isFilterMenuOpen && (
                <>
                  <div 
                    style={styles.dropdownOverlayClose} 
                    onClick={handleCloseFilterMenu} 
                  />
                  <div 
                    style={styles.filterMenuPanel} 
                    className="fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={styles.filterMenuHeader}>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                        Filter Board Tickets
                      </span>
                      {(tempFilterTypes.length > 0 || tempFilterPriorities.length > 0 || tempFilterTechs.length > 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            setTempFilterTypes([]);
                            setTempFilterPriorities([]);
                            setTempFilterTechs([]);
                          }}
                          style={styles.clearFiltersBtn}
                        >
                          Reset Selections
                        </button>
                      )}
                    </div>

                    {/* Filter 1: Type */}
                    <div style={styles.filterGroup}>
                      <label style={styles.filterGroupLabel}>TYPE</label>
                      <div style={styles.filterOptionsGrid}>
                        {[
                          { value: 'All', label: 'All Types' },
                          { value: 'Feature', label: '✨ Feature' },
                          { value: 'Task', label: '📋 Task' },
                          { value: 'Bug', label: '🐞 Bug' }
                        ].map(opt => {
                          const isSelected = opt.value === 'All' 
                            ? tempFilterTypes.length === 0 
                            : tempFilterTypes.includes(opt.value);
                          return (
                            <div
                              key={opt.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTempFilterType(opt.value);
                              }}
                              style={{
                                ...styles.filterOptionPill,
                                backgroundColor: isSelected ? '#1e3a8a' : '#f8fafc',
                                color: isSelected ? '#ffffff' : '#1e293b',
                                borderColor: isSelected ? '#1e3a8a' : '#cbd5e1',
                                fontWeight: isSelected ? '700' : '600',
                                boxShadow: isSelected ? '0 2px 8px rgba(30, 58, 138, 0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
                                cursor: 'pointer',
                              }}
                              className="filter-pill-item"
                            >
                              {opt.label} {opt.value !== 'All' && isSelected && '✓'}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Filter 2: Priority */}
                    <div style={styles.filterGroup}>
                      <label style={styles.filterGroupLabel}>PRIORITY</label>
                      <div style={styles.filterOptionsGrid}>
                        {[
                          { value: 'All', label: 'All Priorities', color: '#1e3a8a' },
                          { value: 'High', label: '🔴 High', color: '#dc2626' },
                          { value: 'Medium', label: '🟡 Medium', color: '#d97706' },
                          { value: 'Low', label: '🟢 Low', color: '#059669' }
                        ].map(opt => {
                          const isSelected = opt.value === 'All' 
                            ? tempFilterPriorities.length === 0 
                            : tempFilterPriorities.includes(opt.value);
                          return (
                            <div
                              key={opt.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTempFilterPriority(opt.value);
                              }}
                              style={{
                                ...styles.filterOptionPill,
                                backgroundColor: isSelected ? opt.color : '#f8fafc',
                                color: isSelected ? '#ffffff' : '#1e293b',
                                borderColor: isSelected ? opt.color : '#cbd5e1',
                                fontWeight: isSelected ? '700' : '600',
                                boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 1px 2px rgba(0,0,0,0.03)',
                                cursor: 'pointer',
                              }}
                              className="filter-pill-item"
                            >
                              {opt.label} {opt.value !== 'All' && isSelected && '✓'}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Filter 3: Tech Stack */}
                    <div style={styles.filterGroup}>
                      <label style={styles.filterGroupLabel}>TECH / TEAM</label>
                      <div style={{ ...styles.filterOptionsGrid, maxHeight: '130px', overflowY: 'auto' }}>
                        {['All', 'android', 'ios', 'backend', 'angular', 'design', 'qa', 'react', 'flutter', 'python'].map(tech => {
                          const isSelected = tech === 'All' 
                            ? tempFilterTechs.length === 0 
                            : tempFilterTechs.includes(tech.toLowerCase());
                          const label = tech === 'All' ? 'All Teams' : tech === 'ios' ? 'iOS' : tech === 'qa' ? 'QA' : tech.charAt(0).toUpperCase() + tech.slice(1);
                          return (
                            <div
                              key={tech}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTempFilterTech(tech);
                              }}
                              style={{
                                ...styles.filterOptionPill,
                                backgroundColor: isSelected ? '#1e3a8a' : '#f8fafc',
                                color: isSelected ? '#ffffff' : '#1e293b',
                                borderColor: isSelected ? '#1e3a8a' : '#cbd5e1',
                                fontWeight: isSelected ? '700' : '600',
                                boxShadow: isSelected ? '0 2px 8px rgba(30, 58, 138, 0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
                                cursor: 'pointer',
                              }}
                              className="filter-pill-item"
                            >
                              {label} {tech !== 'All' && isSelected && '✓'}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Filter 4: Ticket Origin / Source (Only for internal team) */}
                    {currentUser?.role !== 'Client' && (
                      <div style={styles.filterGroup}>
                        <label style={styles.filterGroupLabel}>SOURCE / ORIGIN</label>
                        <div style={styles.filterOptionsGrid}>
                          {[
                            { value: 'all', label: 'All Sources' },
                            { value: 'client', label: '👤 Client Issues' },
                            { value: 'internal', label: '🛠️ Internal / QA' }
                          ].map(opt => {
                            const isSelected = tempFilterSource === opt.value;
                            return (
                              <div
                                key={opt.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTempFilterSource(opt.value);
                                }}
                                style={{
                                  ...styles.filterOptionPill,
                                  backgroundColor: isSelected ? '#1e3a8a' : '#f8fafc',
                                  color: isSelected ? '#ffffff' : '#1e293b',
                                  borderColor: isSelected ? '#1e3a8a' : '#cbd5e1',
                                  fontWeight: isSelected ? '700' : '600',
                                  boxShadow: isSelected ? '0 2px 8px rgba(30, 58, 138, 0.25)' : '0 1px 2px rgba(0,0,0,0.03)',
                                  cursor: 'pointer',
                                }}
                                className="filter-pill-item"
                              >
                                {opt.label} {isSelected && '✓'}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Filter Footer with Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(15, 23, 42, 0.08)' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearAllFilters();
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          padding: '4px 0'
                        }}
                      >
                        Clear All
                      </button>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseFilterMenu();
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyFilters();
                          }}
                          style={{
                            padding: '6px 16px',
                            fontSize: '12px',
                            fontWeight: '700',
                            borderRadius: '8px',
                            backgroundColor: 'var(--accent-blue)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(30, 58, 138, 0.3)'
                          }}
                        >
                          Apply Filters { (tempFilterTypes.length + tempFilterPriorities.length + tempFilterTechs.length + (tempFilterSource !== 'all' ? 1 : 0)) > 0 ? `(${tempFilterTypes.length + tempFilterPriorities.length + tempFilterTechs.length + (tempFilterSource !== 'all' ? 1 : 0)})` : '' }
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'cr' && ['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)'].includes(currentUser.role) && (
            <button onClick={() => setShowAddCR(true)} style={styles.headerAddBtn}>
              + Add CR
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'board' && (
          <div 
            style={{ 
              ...styles.kanbanGrid, 
              gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` 
            }}
          >
            {columns.map(col => {
              const colTickets = tickets
                .filter(t => {
                  if (t.status !== col.title) return false;
                  if (appliedFilterTypes.length > 0 && !appliedFilterTypes.includes(t.ticketType || 'Task')) return false;
                  if (appliedFilterPriorities.length > 0 && !appliedFilterPriorities.includes(t.priority || 'Medium')) return false;
                  if (appliedFilterTechs.length > 0) {
                    const ticketTags = (t.tags || []).map(tg => tg.toLowerCase());
                    const hasMatch = appliedFilterTechs.some(tech => ticketTags.includes(tech));
                    if (!hasMatch) return false;
                  }
                  if (appliedFilterSource === 'client' && !t.isClientTicket && t.reportedByRole !== 'Client') return false;
                  if (appliedFilterSource === 'internal' && (t.isClientTicket || t.reportedByRole === 'Client')) return false;
                  return true;
                })
                .sort((a, b) => {
                  const pA = PRIORITY_ORDER[a.priority] || 2;
                  const pB = PRIORITY_ORDER[b.priority] || 2;
                  if (pA !== pB) return pA - pB;
                  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                });
              return (
                <div 
                  key={col._id || col.title} 
                  style={styles.column}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, col.title)}
                >
                  <div style={styles.columnHeader}>
                    <span style={styles.columnTitle}>{col.title}</span>
                    <div style={styles.columnMeta}>
                      {((['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 'QA', 'Quality Analyst (QA)'].includes(currentUser.role)) || 
                        (currentUser.role === 'Client' && (col.sequence === 1 || col.title.toLowerCase().includes('started') || columns[0]?._id === col._id || columns[0]?.title === col.title))) && (
                        <button
                          onClick={() => {
                            setTicketStatus(col.title);
                            setShowAddTicket(true);
                          }}
                          className="column-add-btn"
                          style={styles.columnAddBtn}
                          title={`Add ticket to ${col.title}`}
                        >
                          +
                        </button>
                      )}
                      <span style={styles.columnCount}>{colTickets.length}</span>
                    </div>
                  </div>
                  
                  <div style={styles.ticketsContainer}>
                    {colTickets.map(ticket => (
                      <div 
                        key={ticket._id} 
                        style={{ ...styles.ticketCard, cursor: 'grab' }} 
                        className="ticket-card"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', ticket._id)}
                      >
                        <div onClick={() => onSelectTicket(ticket)} style={styles.ticketCardBody}>
                          {/* Top Row: Type Logo & Client Tag on Left, Ticket ID & Priority Dot on Extreme Right */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span 
                                title={`Type: ${ticket.ticketType || 'Task'}`} 
                                style={{ 
                                  fontSize: '14px', 
                                  lineHeight: 1, 
                                  cursor: 'default',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                {getTicketTypeStyle(ticket.ticketType).icon}
                              </span>
                              {Boolean(ticket.isClientTicket || ticket.reportedByRole === 'Client') && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  color: '#2563eb',
                                  backgroundColor: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '4px',
                                  padding: '1px 5px',
                                  letterSpacing: '0.3px',
                                  textTransform: 'uppercase'
                                }}>
                                  Client
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={styles.ticketCardId}>#{ticket._id.slice(-6).toUpperCase()}</span>
                              <span 
                                title={`Priority: ${ticket.priority || 'Medium'}`}
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: getPriorityDotColor(ticket.priority),
                                  display: 'inline-block',
                                  flexShrink: 0,
                                }}
                              />
                            </div>
                          </div>

                          {/* Full-width Ticket Title */}
                          <h4 style={styles.ticketTask}>{ticket.task}</h4>

                          {/* Tech Tags Row */}
                          <div style={styles.tagRow}>
                            {ticket.tags?.map(tag => {
                              const label = tag === 'ios' ? 'iOS' : tag === 'qa' ? 'QA' : tag.charAt(0).toUpperCase() + tag.slice(1);
                              return (
                                <span key={tag} style={{
                                  ...styles.tag,
                                  ...styles[`tag_${tag.toLowerCase()}`]
                                }}>
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'docs' && (
          <div style={styles.docsContainer}>
            {/* Top Action Tiles: Upload Document & Important Links */}
            <div style={styles.docsTopGrid}>
              {/* Document Upload Tile */}
              <div style={styles.uploadBox} className="glass">
                <input
                  type="file"
                  ref={docFileInputRef}
                  onChange={handleFileSelected}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📄</span>
                  <h3 style={styles.uploadTitle}>Project Documents</h3>
                </div>
                {['BA', 'Business Analyst (BA)', 'PC', 'Project Coordinator (PC)', 'Sales', 'Sales Rep', 'PM', 'Project Manager (PM)', 'CEO', 'Delivery Head'].includes(currentUser.role) && (
                  <button 
                    type="button"
                    onClick={() => docFileInputRef.current?.click()}
                    disabled={loading}
                    style={styles.uploadSubmitBtn}
                  >
                    {loading ? 'Uploading...' : '+ Upload Document'}
                  </button>
                )}
              </div>

              {/* Important Links & Credentials Tile */}
              <div style={styles.linksActionBox} className="glass">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🔑</span>
                  <h3 style={styles.uploadTitle}>Important Links & Credentials</h3>
                </div>
                {['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 'BA', 'Business Analyst (BA)', 'CEO', 'Delivery Head', 'Product Owner'].includes(currentUser.role) && (
                  <button 
                    type="button"
                    onClick={handleOpenAddLinkModal}
                    style={styles.addLinkTileBtn}
                    className="add-link-btn"
                  >
                    + Add Link / Creds
                  </button>
                )}
              </div>
            </div>

            {/* Section 1: Important Links & Credentials */}
            <div style={styles.docsList}>
              {/* Links Grid */}
              {filteredLinks.length === 0 ? (
                <div style={styles.emptyStateBox} className="glass">
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔗</div>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {linkSearchQuery || linkCategoryFilter !== 'All' 
                      ? 'No matching links or credentials found'
                      : 'No important links or credentials added yet'}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.4' }}>
                    {linkSearchQuery || linkCategoryFilter !== 'All' 
                      ? 'Try adjusting your search query or category filter.' 
                      : 'No links or credentials have been added yet.'}
                  </p>
                </div>
              ) : (
                <div style={styles.linksGrid}>
                  {filteredLinks.map(link => {
                    const catStyle = CATEGORY_STYLES[link.category] || CATEGORY_STYLES['Other'];
                    const isPasswordVisible = !!visiblePasswords[link._id];
                    const canManage = ['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 'BA', 'Business Analyst (BA)', 'CEO', 'Delivery Head', 'Product Owner'].includes(currentUser.role);
                    
                    return (
                      <div key={link._id} style={styles.linkCard} className="glass glass-hover">
                        {/* Header: Category Badge + Actions */}
                        <div style={styles.linkCardHeader}>
                          <span style={{
                            ...styles.categoryBadge,
                            backgroundColor: catStyle.bg,
                            color: catStyle.color,
                            border: `1px solid ${catStyle.border}`
                          }}>
                            <span style={{ marginRight: '4px' }}>{catStyle.icon}</span>
                            {link.category}
                          </span>

                          {canManage && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditLinkModal(link)}
                                style={styles.smallIconBtn}
                                title="Edit Details"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(link._id)}
                                style={{ ...styles.smallIconBtn, color: '#ef4444' }}
                                title="Delete Entry"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <div style={styles.linkCardTitle}>{link.title}</div>

                        {/* URL row */}
                        {link.url && (
                          <div style={styles.linkItemRow}>
                            <div style={styles.linkItemLabel}>URL:</div>
                            <div style={styles.linkItemValue}>
                              <a 
                                href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={styles.linkItemAnchor}
                                title={link.url}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {link.url}
                                </span>
                                <span style={{ fontSize: '11px', marginLeft: '4px', opacity: 0.7 }}>↗</span>
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(link.url, `${link._id}-url`)}
                              style={{
                                ...styles.copyBtn,
                                ...(copiedKey === `${link._id}-url` ? styles.copyBtnSuccess : {})
                              }}
                              title="Copy URL"
                            >
                              {copiedKey === `${link._id}-url` ? '✓ Copied' : '📋 Copy'}
                            </button>
                          </div>
                        )}

                        {/* Credentials Container */}
                        {(link.username || link.password) && (
                          <div style={styles.credentialsBox}>
                            {link.username && (
                              <div style={styles.credRow}>
                                <div style={styles.credLabel}>User:</div>
                                <div style={styles.credValue} title={link.username}>
                                  {link.username}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(link.username, `${link._id}-user`)}
                                  style={{
                                    ...styles.credCopyBtn,
                                    ...(copiedKey === `${link._id}-user` ? styles.credCopyBtnSuccess : {})
                                  }}
                                  title="Copy Username"
                                >
                                  {copiedKey === `${link._id}-user` ? '✓ Copied' : '📋 Copy'}
                                </button>
                              </div>
                            )}

                            {link.password && (
                              <div style={styles.credRow}>
                                <div style={styles.credLabel}>Pass:</div>
                                <div style={{ 
                                  ...styles.credValue, 
                                  fontFamily: isPasswordVisible ? 'inherit' : 'monospace', 
                                  letterSpacing: isPasswordVisible ? 'normal' : '2px',
                                  fontWeight: isPasswordVisible ? '600' : 'normal'
                                }}>
                                  {isPasswordVisible ? link.password : '••••••••'}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility(link._id)}
                                    style={styles.credEyeBtn}
                                    title={isPasswordVisible ? 'Hide Password' : 'Show Password'}
                                  >
                                    {isPasswordVisible ? '🙈' : '👁️'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(link.password, `${link._id}-pass`)}
                                    style={{
                                      ...styles.credCopyBtn,
                                      ...(copiedKey === `${link._id}-pass` ? styles.credCopyBtnSuccess : {})
                                    }}
                                    title="Copy Password"
                                  >
                                    {copiedKey === `${link._id}-pass` ? '✓ Copied' : '📋 Copy'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {link.notes && (
                          <div style={styles.linkNotesBox}>
                            <span style={{ fontWeight: '600', marginRight: '4px', color: 'var(--text-primary)' }}>Note:</span>
                            {link.notes}
                          </div>
                        )}

                        {/* Footer */}
                        <div style={styles.linkCardFooter}>
                          <span>Added by <strong>{link.addedBy}</strong></span>
                          <span>{formatDate(link.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Project Documentation */}
            <div style={styles.docsList}>
              <div style={styles.sectionHeaderRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={styles.sectionHeader}>Project Documentation Files</h3>
                  <span style={styles.countBadge}>{project.documents?.length || 0}</span>
                </div>
              </div>

              {project.documents?.length === 0 ? (
                <div style={styles.emptyState}>No project documentation uploaded yet.</div>
              ) : (
                <div style={styles.filesGrid}>
                  {project.documents.map(doc => (
                    <div key={doc._id} style={styles.fileCard} className="glass glass-hover">
                      <div style={styles.fileIcon}>📄</div>
                      <div style={styles.fileDetails}>
                        <div style={styles.fileName}>{doc.name}</div>
                        <div style={styles.fileMeta}>
                          Uploaded by <strong>{doc.uploadedBy}</strong> on {formatDate(doc.uploadedAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <a 
                          href={`${SERVER_BASE}${doc.path}`} 
                          download 
                          target="_blank" 
                          rel="noreferrer" 
                          className="secondary" 
                          style={styles.downloadBtn}
                        >
                          Download
                        </a>
                        {['BA', 'Business Analyst (BA)', 'PC', 'Project Coordinator (PC)', 'Sales', 'Sales Rep', 'PM', 'Project Manager (PM)'].includes(currentUser.role) && (
                          <button
                            onClick={() => handleDeleteDoc(doc._id)}
                            style={styles.deleteFileBtn}
                            className="delete-doc-btn"
                            title="Delete Document"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cr' && (
          <div style={styles.docsContainer}>
            {/* List CRs */}
            <div style={styles.docsList}>
              <h3 style={styles.sectionHeader}>Change Requests (CRs)</h3>
              <p style={styles.crHint}>
                Note: Creating a CR will automatically spawn a corresponding ticket in the "To be started" column.
              </p>
              {project.changeRequests?.length === 0 ? (
                <div style={styles.emptyState}>No change requests filed yet.</div>
              ) : (
                <div style={styles.filesGrid}>
                  {project.changeRequests.map((cr, idx) => (
                    <div 
                      key={cr._id} 
                      onClick={() => handleSelectCR(cr)}
                      style={{ ...styles.fileCard, cursor: 'pointer' }} 
                      className="glass glass-hover"
                    >
                      <div style={styles.crNumberIcon}>{idx + 1}</div>
                      <div style={styles.fileDetails}>
                        <div style={styles.fileName}>{cr.title}</div>
                        <div style={styles.fileMeta}>
                          Filed by <strong>{cr.uploadedBy}</strong> on {formatDate(cr.uploadedAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {cr.path && (
                          <a 
                            href={`${SERVER_BASE}${cr.path}`} 
                            download 
                            target="_blank" 
                            rel="noreferrer"
                            className="secondary" 
                            onClick={(e) => e.stopPropagation()}
                            style={styles.downloadBtn}
                          >
                            Attachment
                          </a>
                        )}

                        {['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)'].includes(currentUser.role) && (
                          <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              type="button"
                              onClick={() => handleEditCR(cr._id, cr.title)} 
                              style={styles.smallCRActionBtn}
                              title="Edit CR Title"
                            >
                              ✏️
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteCR(cr._id)} 
                              style={{ ...styles.smallCRActionBtn, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.15)' }}
                              className="delete-doc-btn"
                              title="Delete CR"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL (CENTERED) */}
      {showAddTicket && (
        <div style={styles.overlay} onClick={() => setShowAddTicket(false)}>
          <div 
            className="fade-in" 
            style={{ ...styles.modal, maxHeight: '90vh', overflowY: 'auto' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Create Ticket</h3>
              <button onClick={() => setShowAddTicket(false)} style={styles.closeBtn}>×</button>
            </div>
            {error && <div style={styles.modalError}>{error}</div>}
            <form onSubmit={handleCreateTicket} style={styles.modalForm}>
              <div style={styles.modalInputGroup}>
                <label style={styles.formFieldLabel}>Title</label>
                <input
                  type="text"
                  placeholder=""
                  value={ticketTask}
                  onChange={(e) => setTicketTask(e.target.value)}
                  maxLength={80}
                  style={{ ...styles.compactInput }}
                  required
                />
              </div>

              {/* 3-Column Row: Type + Priority + Tech */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '10px', alignItems: 'flex-start' }}>
                <div style={styles.modalInputGroup}>
                  <label style={styles.formFieldLabel}>Type</label>
                  <select
                    value={ticketType}
                    onChange={(e) => handleTicketTypeChange(e.target.value)}
                    style={{ ...styles.selectInput, minHeight: '38px', borderRadius: '8px', padding: '6px 10px' }}
                  >
                    <option value="Feature">✨ Feature</option>
                    <option value="Task">📋 Task</option>
                    <option value="Bug">🐞 Bug</option>
                  </select>
                </div>

                <div style={styles.modalInputGroup}>
                  <label style={styles.formFieldLabel}>Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    style={{ ...styles.selectInput, minHeight: '38px', borderRadius: '8px', padding: '6px 10px' }}
                  >
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                  </select>
                </div>

                <div style={styles.modalInputGroup}>
                  <label style={styles.formFieldLabel}>Tech</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <div 
                      onClick={() => setIsTicketTagsOpen(!isTicketTagsOpen)}
                      style={styles.dropdownTrigger}
                    >
                      {ticketTags.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>Select teams...</span>
                      ) : (
                        <div style={styles.selectedTagsContainer}>
                          {ticketTags.map(tag => (
                            <span 
                              key={tag} 
                              style={{
                                ...styles.selectedTagBadge,
                                ...styles[`tag_${tag.toLowerCase()}`]
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTag(tag);
                              }}
                            >
                              {tag === 'ios' ? 'iOS' : tag === 'qa' ? 'QA' : tag.charAt(0).toUpperCase() + tag.slice(1)}
                              <span style={styles.removeTagX}>×</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <span style={{ fontSize: '10px', opacity: 0.6 }}>
                        {isTicketTagsOpen ? '▲' : '▼'}
                      </span>
                    </div>

                    {isTicketTagsOpen && (
                      <>
                        <div 
                          style={styles.dropdownOverlayClose} 
                          onClick={() => setIsTicketTagsOpen(false)} 
                        />
                        <div style={styles.dropdownMenuPanel} className="glass fade-in">
                          {['android', 'ios', 'backend', 'angular', 'design', 'react', 'flutter', 'python'].map(tag => {
                            const isSelected = ticketTags.includes(tag);
                            return (
                              <div
                                key={tag}
                                onClick={() => handleToggleTag(tag)}
                                style={{
                                  ...styles.dropdownMenuItem,
                                  backgroundColor: isSelected ? 'rgba(30, 58, 138, 0.05)' : 'transparent',
                                  color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                                }}
                                className="dropdown-option"
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  readOnly
                                  style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
                                />
                                <span style={{ fontWeight: isSelected ? '600' : '500', fontSize: '13px' }}>
                                  {tag === 'ios' ? 'iOS' : tag === 'qa' ? 'QA' : tag.charAt(0).toUpperCase() + tag.slice(1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.modalInputGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={styles.formFieldLabel}>Description</label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Paste (Ctrl+V) or drop photos / media
                  </span>
                </div>

                {/* Integrated Description & Media Container */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverTicketDropzone(true);
                  }}
                  onDragLeave={() => setIsDragOverTicketDropzone(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverTicketDropzone(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleProcessIncomingTicketFiles(e.dataTransfer.files);
                    }
                  }}
                  style={{
                    position: 'relative',
                    border: isDragOverTicketDropzone ? '2px dashed var(--accent-blue, #2563eb)' : '1px solid #cbd5e1',
                    backgroundColor: isDragOverTicketDropzone ? 'rgba(37, 99, 235, 0.04)' : '#ffffff',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: isDragOverTicketDropzone ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none'
                  }}
                >
                  <RichTextEditorInput
                    value={ticketDesc}
                    onChange={setTicketDesc}
                    onPasteFiles={handleProcessIncomingTicketFiles}
                    minHeight="140px"
                    placeholder="Provide ticket details, paste photos/videos directly, or paste Figma/Loom links..."
                  />

                  {/* Attached Image Previews Inside Description */}
                  {ticketImages.length > 0 && (
                    <div style={{ padding: '0 12px 10px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {ticketImages.map((imgObj, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            width: '68px',
                            height: '68px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f1f5f9',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                          }}
                        >
                          <img
                            src={imgObj.previewUrl}
                            alt={`Attachment ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {imgObj.isCompressed && (
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
                              title={`Compressed from ${formatFileSize(imgObj.originalSize)} to ${formatFileSize(imgObj.compressedSize)}`}
                            >
                              ~1MB
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTicketImage(idx);
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
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isCompressingImages && (
                    <div style={{ padding: '0 12px 8px 12px', fontSize: '11.5px', color: 'var(--accent-blue)', fontWeight: '500' }}>
                      ⏳ Optimizing and compressing image...
                    </div>
                  )}

                  {/* Description Box Bottom Toolbar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="file"
                        ref={ticketFileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleProcessIncomingTicketFiles(e.target.files);
                            e.target.value = '';
                          }
                        }}
                        accept="image/*,video/*"
                        multiple
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => ticketFileInputRef.current?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
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
                        <span>{ticketImages.length > 0 ? `Add Photos (${ticketImages.length}/7)` : 'Attach Photo / Video'}</span>
                      </button>

                      {isDragOverTicketDropzone && (
                        <span style={{ fontSize: '11.5px', color: 'var(--accent-blue)', fontWeight: '600' }}>
                          Drop files here to attach
                        </span>
                      )}
                    </div>

                    <span style={{ 
                      fontSize: '11.5px', 
                      color: getWordCountFromHtml(ticketDesc) > 400 ? '#ef4444' : '#64748b', 
                      fontWeight: getWordCountFromHtml(ticketDesc) > 400 ? '700' : '500' 
                    }}>
                      Words: {getWordCountFromHtml(ticketDesc)}/400
                    </span>
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowAddTicket(false)} className="secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading || isCompressingImages}>
                  {loading ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CR DRAWER */}
      {showAddCR && (
        <>
          <div style={styles.drawerOverlay} onClick={() => setShowAddCR(false)} />
          <div className="slide-in-right" style={styles.drawerPanel}>
            <div style={styles.modalHeader}>
              <h3>Add Change Request</h3>
              <button onClick={() => setShowAddCR(false)} style={styles.closeBtn}>×</button>
            </div>
            <form onSubmit={handleUploadCR} style={styles.modalForm}>
              <div style={styles.modalInputGroup}>
                <label>Change Request Title</label>
                <input
                  type="text"
                  placeholder="e.g. Add dark mode switch to settings page (max 80 chars)"
                  value={crTitle}
                  onChange={(e) => setCrTitle(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>

              <div style={styles.modalInputGroup}>
                <label>Description</label>
                <textarea
                  placeholder="Provide change request details..."
                  value={crDesc}
                  onChange={(e) => setCrDesc(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div style={styles.modalInputGroup}>
                <label>Figma Design Reference Link</label>
                <input
                  type="url"
                  placeholder="https://figma.com/file/..."
                  value={crFigma}
                  onChange={(e) => setCrFigma(e.target.value)}
                />
              </div>

              <div style={styles.modalInputGroup}>
                <label>Task Deadline</label>
                <input
                  type="date"
                  value={crDeadline}
                  onChange={(e) => setCrDeadline(e.target.value)}
                />
              </div>

              <div style={styles.modalInputGroup}>
                <label>Tech Tags (Allocated Teams)</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div 
                    onClick={() => setIsCrTagsOpen(!isCrTagsOpen)}
                    style={styles.dropdownTrigger}
                  >
                    {crTags.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)' }}>Select teams...</span>
                    ) : (
                      <div style={styles.selectedTagsContainer}>
                        {crTags.map(tag => (
                          <span 
                            key={tag} 
                            style={{
                              ...styles.selectedTagBadge,
                              ...styles[`tag_${tag.toLowerCase()}`]
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCRTag(tag);
                            }}
                          >
                            {tag === 'ios' ? 'iOS' : tag === 'qa' ? 'QA' : tag.charAt(0).toUpperCase() + tag.slice(1)}
                            <span style={styles.removeTagX}>×</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <span style={{ fontSize: '10px', opacity: 0.6 }}>
                      {isCrTagsOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {isCrTagsOpen && (
                    <>
                      <div 
                        style={styles.dropdownOverlayClose} 
                        onClick={() => setIsCrTagsOpen(false)} 
                      />
                      <div style={styles.dropdownMenuPanel} className="glass fade-in">
                        {['android', 'ios', 'backend', 'angular', 'design', 'qa', 'react', 'flutter', 'python'].map(tag => {
                          const isSelected = crTags.includes(tag);
                          return (
                            <div
                              key={tag}
                              onClick={() => handleToggleCRTag(tag)}
                              style={{
                                ...styles.dropdownMenuItem,
                                backgroundColor: isSelected ? 'rgba(30, 58, 138, 0.05)' : 'transparent',
                                color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                              }}
                              className="dropdown-option"
                            >
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                readOnly
                                style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
                              />
                              <span style={{ fontWeight: isSelected ? '600' : '500', fontSize: '13px' }}>
                                {tag === 'ios' ? 'iOS' : tag === 'qa' ? 'QA' : tag.charAt(0).toUpperCase() + tag.slice(1)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={styles.modalInputGroup}>
                <label>Upload Reference Document (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setCrFile(e.target.files[0])}
                  style={styles.fileInput}
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowAddCR(false)} className="secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Change Request'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* MANAGE COLUMNS DRAWER */}
      {showEditColumns && (
        <>
          <div style={styles.drawerOverlay} onClick={() => setShowEditColumns(false)} />
          <div className="slide-in-right" style={styles.drawerPanel}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Manage Project Columns</h3>
              <button onClick={() => setShowEditColumns(false)} style={styles.closeBtn}>×</button>
            </div>

            <form onSubmit={handleSaveColumns} style={styles.modalForm}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
                Define the stages of your Kanban task board. Give them sequence numbers (e.g. 1, 2, 3...) to order them left-to-right.
              </p>

              <div style={styles.columnsEditorList}>
                {localColumns.map((col, idx) => (
                  <div key={idx} style={styles.columnEditorRow}>
                    <input
                      type="text"
                      placeholder="Column Name (e.g. In Progress)"
                      value={col.title}
                      onChange={(e) => handleLocalColumnChange(idx, 'title', e.target.value)}
                      required
                      style={styles.columnEditorInput}
                    />
                    <input
                      type="number"
                      placeholder="Seq"
                      value={col.sequence}
                      onChange={(e) => handleLocalColumnChange(idx, 'sequence', e.target.value)}
                      required
                      style={styles.columnEditorSeqInput}
                      min="1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLocalColumn(idx)}
                      className="column-editor-delete-btn"
                      style={styles.columnEditorDeleteBtn}
                      title="Remove column"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddLocalColumn}
                className="add-column-btn"
                style={styles.addColumnBtn}
              >
                + Add Column
              </button>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowEditColumns(false)} className="secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ADD / EDIT IMPORTANT LINK DRAWER */}
      {showAddLinkModal && (
        <>
          <div style={styles.drawerOverlay} onClick={handleCloseLinkModal} />
          <div className="slide-in-right" style={styles.drawerPanel}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingLinkId ? 'Edit Link & Credential' : 'Add Important Link & Credential'}
              </h3>
              <button onClick={handleCloseLinkModal} style={styles.closeBtn}>×</button>
            </div>

            <form onSubmit={handleSaveLink} style={styles.modalForm}>
              <div style={styles.modalInputGroup}>
                <label>Title / Identifier *</label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  required
                />
              </div>

              <div style={styles.modalInputGroup}>
                <label>Category *</label>
                <select
                  value={linkCategory}
                  onChange={(e) => setLinkCategory(e.target.value)}
                  style={styles.selectInput}
                >
                  {LINK_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={styles.modalInputGroup}>
                <label>URL / Web Address (Optional)</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.modalInputGroup}>
                  <label>Username / Email (Optional)</label>
                  <input
                    type="text"
                    value={linkUsername}
                    onChange={(e) => setLinkUsername(e.target.value)}
                  />
                </div>

                <div style={styles.modalInputGroup}>
                  <label>Password / Token (Optional)</label>
                  <input
                    type="text"
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                  />
                </div>
              </div>

              <div style={styles.modalInputGroup}>
                <label>Notes / Instructions (Optional)</label>
                <textarea
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={handleCloseLinkModal} className="secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingLinkId ? 'Save Changes' : 'Add Link / Credential'}
                </button>
              </div>
            </form>
          </div>
        </>
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
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.02)',
    backdropFilter: 'none',
    zIndex: 900,
  },
  drawerPanel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '450px',
    backgroundColor: '#ffffff',
    borderLeft: '1px solid var(--panel-border)',
    boxShadow: '-10px 0 40px rgba(15, 23, 42, 0.08)',
    padding: '40px 30px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  boardContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '20px 24px',
    overflowY: 'auto',
    overflowX: 'auto',
  },
  boardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '24px',
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    maxWidth: '480px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    borderRadius: '10px',
    padding: '8px 14px',
    gap: '10px',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
    transition: 'var(--transition-smooth)',
  },
  searchIcon: {
    fontSize: '14px',
    opacity: 0.5,
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '13px',
    color: 'var(--text-primary)',
    width: '100%',
    padding: 0,
  },
  clearSearchBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '11px',
    padding: '2px 4px',
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '6px',
    background: '#ffffff',
    border: '1px solid var(--panel-border)',
    borderRadius: '12px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 999,
    padding: '6px',
  },
  searchNoResults: {
    padding: '16px',
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  searchResultItem: {
    padding: '12px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    transition: 'var(--transition-smooth)',
  },
  searchResultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  searchResultTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  searchResultId: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    opacity: 0.7,
    fontFamily: 'monospace',
  },
  searchResultDesc: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  projectBadge: {
    alignSelf: 'flex-start',
    fontSize: '10px',
    fontWeight: '700',
    background: 'rgba(48, 209, 88, 0.15)',
    color: 'var(--accent-green)',
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.8px',
  },
  projectTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  projectDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    maxWidth: '600px',
    lineHeight: '1.4',
  },
  headerRight: {
    textAlign: 'right',
  },
  dateLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    letterSpacing: '1px',
    marginBottom: '4px',
  },
  dateValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--accent-red)',
  },
  tabsPanel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    marginBottom: '24px',
    background: 'rgba(255, 255, 255, 0.03)',
  },
  tabsList: {
    display: 'flex',
    gap: '12px',
  },
  tab: {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    background: 'transparent',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    transition: 'var(--transition-smooth)',
  },
  tabActive: {
    background: 'var(--accent-blue)',
    color: '#ffffff',
    borderColor: 'var(--accent-blue)',
    fontWeight: '600',
  },
  headerAddBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  },
  tabContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  kanbanGrid: {
    display: 'grid',
    gap: '12px',
    height: '100%',
    minHeight: '420px',
    alignItems: 'stretch',
    width: '100%',
  },
  column: {
    padding: '14px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#ffffff',
    border: '1px solid var(--panel-border)',
    borderRadius: '14px',
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
    minWidth: 0,
    height: '100%',
    overflowY: 'auto',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--panel-border)',
    minHeight: '32px',
  },
  columnMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  columnTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
    wordBreak: 'break-word',
  },
  columnCount: {
    fontSize: '11px',
    fontWeight: '700',
    background: 'rgba(15, 23, 42, 0.05)',
    padding: '2px 8px',
    borderRadius: '10px',
    color: 'var(--text-secondary)',
  },
  ticketsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    flex: 1,
  },
  ticketCard: {
    padding: '12px',
    cursor: 'default',
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    borderRadius: '10px',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
    transition: 'var(--transition-smooth)',
  },
  ticketCardBody: {
    cursor: 'pointer',
  },
  ticketCardId: {
    fontSize: '9px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    opacity: 0.65,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
    marginTop: '2px',
  },
  ticketTask: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '8px',
    lineHeight: '1.4',
    wordBreak: 'break-word',
    width: '100%',
    display: 'block',
  },
  tagRow: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
    marginBottom: '4px',
  },
  tag: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  tag_frontend: {
    backgroundColor: 'rgba(0, 113, 227, 0.15)',
    color: 'var(--accent-blue)',
  },
  tag_backend: {
    backgroundColor: 'rgba(111, 66, 193, 0.12)',
    color: '#5a3791',
  },
  tag_devops: {
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    color: 'var(--accent-orange)',
  },
  tag_android: {
    backgroundColor: 'rgba(52, 168, 83, 0.12)',
    color: '#1e7e34',
  },
  tag_ios: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    color: '#0056b3',
  },
  tag_angular: {
    backgroundColor: 'rgba(220, 53, 69, 0.12)',
    color: '#bd2130',
  },
  tag_design: {
    backgroundColor: 'rgba(232, 62, 140, 0.12)',
    color: '#b21f66',
  },
  tag_qa: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    color: '#b57a00',
  },
  tag_react: {
    backgroundColor: 'rgba(23, 162, 184, 0.12)',
    color: '#117a8b',
  },
  tag_flutter: {
    backgroundColor: 'rgba(2, 137, 240, 0.12)',
    color: '#01579b',
  },
  tag_python: {
    backgroundColor: 'rgba(255, 218, 121, 0.25)',
    color: '#d35400',
  },
  ticketDeadline: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  moverRow: {
    marginTop: '8px',
    borderTop: '1px solid var(--panel-border)',
    paddingTop: '6px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  moverSelect: {
    padding: '4px 6px',
    fontSize: '10px',
    width: '100%',
    borderRadius: '6px',
    background: 'rgba(15, 23, 42, 0.02)',
    border: '1px solid rgba(15, 23, 42, 0.06)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-main)',
  },
  docsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  docsTopGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
  },
  uploadBox: {
    padding: '14px 20px',
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid var(--panel-border)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '64px',
  },
  linksActionBox: {
    padding: '14px 20px',
    background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.04) 0%, rgba(16, 185, 129, 0.04) 100%)',
    border: '1px solid rgba(30, 58, 138, 0.12)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '64px',
  },
  addLinkTileBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    background: 'var(--accent-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)',
  },
  uploadSubmitBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    background: 'var(--accent-blue)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)',
  },
  uploadTitle: {
    fontSize: '15px',
    fontWeight: '600',
    margin: 0,
  },
  uploadFields: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginTop: '0px',
    flexWrap: 'wrap',
  },
  fileInput: {
    background: 'transparent',
    border: 'none',
    padding: '4px 0',
    width: 'auto',
    fontSize: '13px',
  },
  docsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  sectionHeader: {
    fontSize: '16px',
    fontWeight: '600',
  },
  countBadge: {
    fontSize: '12px',
    fontWeight: '700',
    background: 'rgba(30, 58, 138, 0.08)',
    color: 'var(--accent-blue)',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  linkFiltersContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  linkSearchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIconSmall: {
    position: 'absolute',
    left: '10px',
    fontSize: '12px',
    opacity: 0.5,
    pointerEvents: 'none',
  },
  linkSearchInput: {
    padding: '7px 28px 7px 28px',
    fontSize: '12px',
    borderRadius: '8px',
    border: '1px solid rgba(15, 23, 42, 0.1)',
    background: '#ffffff',
    width: '220px',
    outline: 'none',
    fontFamily: 'var(--font-main)',
    color: 'var(--text-primary)',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    background: 'transparent',
    border: 'none',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 0,
  },
  categoryPillsRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  categoryPill: {
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: '500',
    borderRadius: '20px',
    background: 'rgba(15, 23, 42, 0.04)',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    display: 'inline-flex',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    borderColor: 'var(--accent-blue)',
    fontWeight: '600',
  },
  emptyStateBox: {
    padding: '36px 20px',
    textAlign: 'center',
    borderRadius: 'var(--border-radius)',
    border: '1.5px dashed rgba(15, 23, 42, 0.12)',
  },
  linksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  linkCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    position: 'relative',
    border: '1px solid var(--panel-border)',
    borderRadius: '12px',
  },
  linkCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '3px 8px',
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  smallIconBtn: {
    background: 'transparent',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    borderRadius: '6px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'var(--transition-smooth)',
  },
  linkCardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.3',
  },
  linkItemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(15, 23, 42, 0.02)',
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1px solid rgba(15, 23, 42, 0.04)',
  },
  linkItemLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    width: '32px',
    flexShrink: 0,
  },
  linkItemValue: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  linkItemAnchor: {
    fontSize: '13px',
    color: 'var(--accent-blue)',
    textDecoration: 'none',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    maxWidth: '100%',
  },
  copyBtn: {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '600',
    background: 'rgba(30, 58, 138, 0.08)',
    color: 'var(--accent-blue)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'var(--transition-smooth)',
    display: 'inline-flex',
    alignItems: 'center',
  },
  copyBtnSuccess: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#059669',
  },
  credentialsBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    background: 'rgba(15, 23, 42, 0.03)',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(15, 23, 42, 0.06)',
  },
  credRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  credLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    width: '36px',
    flexShrink: 0,
  },
  credValue: {
    flex: 1,
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  credEyeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '2px 4px',
    opacity: 0.75,
    transition: 'opacity 0.2s',
  },
  credCopyBtn: {
    background: 'transparent',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    padding: '2px 6px',
    color: 'var(--text-secondary)',
    transition: 'var(--transition-smooth)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
  },
  projectBadge: {
    alignSelf: 'flex-start',
    padding: '4px 8px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#059669',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  backDashboardBtn: {
    padding: '3px 8px',
    backgroundColor: '#ffffff',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(30, 58, 138, 0.2)',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  credCopyBtnSuccess: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#059669',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  linkNotesBox: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    background: 'rgba(245, 158, 11, 0.08)',
    borderLeft: '3px solid var(--accent-orange)',
    padding: '6px 10px',
    borderRadius: '0 6px 6px 0',
    lineHeight: '1.4',
  },
  linkCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    color: 'var(--text-muted)',
    borderTop: '1px solid rgba(15, 23, 42, 0.06)',
    paddingTop: '8px',
    marginTop: 'auto',
  },
  selectInput: {
    padding: '10px 12px',
    fontSize: '13px',
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-main)',
    width: '100%',
    outline: 'none',
  },
  crHint: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '-8px',
    marginBottom: '8px',
  },
  emptyState: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    padding: '24px 0',
  },
  filesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    gap: '12px',
  },
  fileIcon: {
    fontSize: '28px',
  },
  crNumberIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(30, 58, 138, 0.05)',
    border: '1px solid rgba(30, 58, 138, 0.15)',
    color: 'var(--accent-blue)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0,
  },
  fileDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  fileName: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileMeta: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  downloadBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    textDecoration: 'none',
  },
  deleteFileBtn: {
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    padding: 0,
  },
  smallCRActionBtn: {
    background: 'transparent',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    color: 'var(--text-secondary)',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    padding: 0,
  },
  filterToggleBtn: {
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '10px',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'var(--transition-smooth)',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
  },
  filterActiveCountBadge: {
    backgroundColor: '#ffffff',
    color: 'var(--accent-blue)',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '10px',
    padding: '1px 6px',
    lineHeight: 1.2,
  },
  filterMenuPanel: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: '320px',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1px solid rgba(15, 23, 42, 0.1)',
    boxShadow: '0 16px 36px rgba(15, 23, 42, 0.15)',
    padding: '16px',
    zIndex: 1050,
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  filterMenuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
    paddingBottom: '8px',
  },
  clearFiltersBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-blue)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterGroupLabel: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#334155',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    marginBottom: '2px',
  },
  filterOptionsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  filterOptionPill: {
    padding: '6px 12px',
    fontSize: '12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
  },
  dropdownOverlayClose: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 900,
    background: 'transparent',
    cursor: 'default',
  },
  paymentsHeaderBtn: {
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'var(--transition-smooth)',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
  },
  paymentsBtnLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
    lineHeight: 1.1,
  },
  paymentsBtnValue: {
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '2px',
    lineHeight: 1.1,
  },
  financialInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: '600',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    border: '1px solid rgba(15, 23, 42, 0.2)',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'text',
  },
  financialsPopover: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: '320px',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
    padding: '16px',
    zIndex: 1000,
  },
  financialsPopoverHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
  },
  closeMiniBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
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
    zIndex: 1100,
  },
  modal: {
    width: '100%',
    maxWidth: '1150px',
    padding: '24px 30px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: '0 20px 45px rgba(15, 23, 42, 0.18)',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    color: 'var(--text-primary)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    borderBottom: '1px solid var(--panel-border)',
    paddingBottom: '14px',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: 1.2,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '26px',
    lineHeight: 1,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '0 6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalError: {
    background: 'rgba(255, 69, 58, 0.1)',
    border: '1px solid rgba(255, 69, 58, 0.2)',
    borderRadius: '8px',
    color: 'var(--accent-red)',
    padding: '8px 12px',
    fontSize: '12px',
    marginBottom: '10px',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  modalInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  formFieldLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '2px',
  },
  compactInput: {
    padding: '8px 12px',
    fontSize: '13px',
    borderRadius: '8px',
    minHeight: '38px',
  },
  wordCount: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    textAlign: 'right',
    marginTop: '2px',
  },
  dropdownTrigger: {
    padding: '6px 12px',
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: '38px',
    width: '100%',
    transition: 'var(--transition-smooth)',
  },
  selectedTagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    flex: 1,
    marginRight: '8px',
  },
  selectedTagBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    userSelect: 'none',
  },
  removeTagX: {
    fontSize: '13px',
    fontWeight: 'bold',
    marginLeft: '4px',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
  dropdownOverlayClose: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 990,
    background: 'transparent',
  },
  dropdownMenuPanel: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    background: '#ffffff',
    border: '1px solid var(--panel-border)',
    borderRadius: '12px',
    padding: '6px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
    zIndex: 1000,
    maxHeight: '260px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  dropdownMenuItem: {
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'var(--transition-smooth)',
    userSelect: 'none',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  columnAddBtn: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    borderRadius: '6px',
    width: '20px',
    height: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: 0,
    transition: 'var(--transition-smooth)',
  },
  editProjectBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    background: 'rgba(30, 58, 138, 0.05)',
    border: '1px solid rgba(30, 58, 138, 0.15)',
    borderRadius: '6px',
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    height: 'fit-content',
    transition: 'var(--transition-smooth)',
  },
  settingsHeaderBtn: {
    background: 'transparent',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(30, 58, 138, 0.15)',
    borderRadius: '8px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
  },
  settingsMenuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  settingsMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: '#ffffff',
    border: '1px solid var(--panel-border)',
    borderRadius: '10px',
    padding: '6px',
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)',
    zIndex: 100,
    minWidth: '180px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  settingsMenuItem: {
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '500',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'var(--transition-smooth)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  },
  columnsModal: {
    width: '100%',
    maxWidth: '480px',
    padding: '30px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
  },
  columnsEditorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '240px',
    overflowY: 'auto',
    marginBottom: '14px',
    paddingRight: '4px',
  },
  columnEditorRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  columnEditorInput: {
    flex: 1,
    padding: '10px',
    fontSize: '13px',
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-main)',
  },
  columnEditorSeqInput: {
    width: '60px',
    padding: '10px',
    fontSize: '13px',
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-main)',
    textAlign: 'center',
  },
  columnEditorDeleteBtn: {
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    padding: '8px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    transition: 'var(--transition-smooth)',
  },
  addColumnBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '13px',
    background: 'transparent',
    border: '1.5px dashed rgba(15, 23, 42, 0.12)',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'var(--transition-smooth)',
    marginBottom: '16px',
    textAlign: 'center',
  },
};
