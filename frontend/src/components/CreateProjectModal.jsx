import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config';

function CustomDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatDateString = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatUserDisplay = (dateStr) => {
    if (!dateStr) return 'Select Delivery Date';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const startDayOffset = (firstDayIndex + 6) % 7; // Monday start
  const totalDays = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const days = [];
  for (let i = 0; i < startDayOffset; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month, d));
  }

  const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleSelectDay = (dayObj) => {
    if (!dayObj) return;
    onChange(formatDateString(dayObj));
    setIsOpen(false);
  };

  const isSelected = (dayObj) => {
    if (!dayObj || !value) return false;
    return formatDateString(dayObj) === value;
  };

  const isToday = (dayObj) => {
    if (!dayObj) return false;
    return formatDateString(dayObj) === formatDateString(new Date());
  };

  return (
    <div style={{ position: 'relative' }}>
      {isOpen && (
        <div 
          style={styles.dateOverlay} 
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        />
      )}

      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={styles.dateTrigger}
      >
        <span style={{ color: value ? 'inherit' : 'var(--text-secondary)' }}>📅 {formatUserDisplay(value)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: 'rgba(15, 23, 42, 0.06)'
              }}
              title="Clear date"
            >
              ✕ Clear
            </span>
          )}
          <span style={styles.caret}>{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {isOpen && (
        <div style={styles.calendarCard} className="glass fade-in" onClick={(e) => e.stopPropagation()}>
          <div style={styles.calendarHeader}>
            <button type="button" onClick={handlePrevMonth} style={styles.calendarNavBtn}>‹</button>
            <div style={styles.calendarMonthYear}>
              {monthNames[month]} {year}
            </div>
            <button type="button" onClick={handleNextMonth} style={styles.calendarNavBtn}>›</button>
          </div>

          <div style={styles.weekdaysRow}>
            {weekdays.map(w => (
              <span key={w} style={styles.weekdayItem}>{w}</span>
            ))}
          </div>

          <div style={styles.daysGrid}>
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} style={styles.emptyDay} />;
              const active = isSelected(day);
              const today = isToday(day);
              return (
                <div
                  key={day.getTime()}
                  onClick={() => handleSelectDay(day)}
                  className="dropdown-option"
                  style={{
                    ...styles.dayItem,
                    ...(today ? styles.todayDay : {}),
                    ...(active ? styles.activeDay : {})
                  }}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleMultiSelect({ role, availableUsers = [], selectedIds = [], onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleUser = (userId) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter(id => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    onChange(availableUsers.map(u => u._id));
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedUsers = availableUsers.filter(u => selectedIds.includes(u._id));
  const filteredUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div ref={containerRef} style={styles.multiSelectContainer}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.multiSelectTrigger,
          borderColor: isOpen ? 'var(--accent-blue)' : 'rgba(15, 23, 42, 0.12)',
          boxShadow: isOpen ? '0 0 0 2px rgba(30, 58, 138, 0.08)' : 'none',
        }}
      >
        <div style={styles.triggerTextWrapper}>
          {selectedUsers.length === 0 ? (
            <span style={styles.placeholderText}>Select member...</span>
          ) : (
            <div style={styles.triggerSelectedSummary}>
              <span style={styles.selectedNamesPreview}>
                {selectedUsers.map(u => u.name).join(', ')}
              </span>
              <span style={styles.selectedCountBadge}>
                {selectedUsers.length}
              </span>
            </div>
          )}
        </div>
        <span style={styles.caret}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div style={styles.dropdownMenuCard} className="fade-in" onClick={(e) => e.stopPropagation()}>
          {availableUsers.length > 3 && (
            <div style={styles.searchBoxWrapper}>
              <input
                type="text"
                placeholder={`Search ${role}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchBoxInput}
                autoFocus
              />
            </div>
          )}

          {availableUsers.length > 1 && (
            <div style={styles.bulkActionsRow}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={styles.bulkActionButton}
              >
                Select All ({availableUsers.length})
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                style={styles.bulkActionButton}
              >
                Clear
              </button>
            </div>
          )}

          <div style={styles.optionsList}>
            {availableUsers.length === 0 ? (
              <div style={styles.emptyRoleNotice}>No members registered in this role</div>
            ) : filteredUsers.length === 0 ? (
              <div style={styles.emptyRoleNotice}>No members match "{searchTerm}"</div>
            ) : (
              filteredUsers.map(u => {
                const isSelected = selectedIds.includes(u._id);
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleUser(u._id)}
                    style={{
                      ...styles.userOptionItem,
                      backgroundColor: isSelected ? 'rgba(30, 58, 138, 0.08)' : 'transparent',
                    }}
                    className="dropdown-option"
                  >
                    <div style={{
                      ...styles.checkboxBox,
                      backgroundColor: isSelected ? 'var(--accent-blue)' : '#ffffff',
                      borderColor: isSelected ? 'var(--accent-blue)' : 'rgba(15, 23, 42, 0.25)',
                    }}>
                      {isSelected && <span style={styles.checkboxCheck}>✓</span>}
                    </div>
                    <div style={styles.userOptionTextGroup}>
                      <span style={{
                        ...styles.userOptionName,
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)'
                      }}>
                        {u.name}
                      </span>
                      {u.email && (
                        <span style={styles.userOptionEmail}>{u.email}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected Member Tag Pills for immediate visibility & fast removal */}
      {selectedUsers.length > 0 && (
        <div style={styles.selectedTagsRow}>
          {selectedUsers.map(u => (
            <span key={u._id} style={styles.selectedTagPill}>
              <span style={styles.selectedTagLabel}>{u.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleUser(u._id);
                }}
                style={styles.removeTagCross}
                title={`Remove ${u.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const ROLES_LIST = [
  'Android Developer', 'iOS Developer', 'Flutter Developer', 'Python Developer',
  'Full Stack Developer', 'Angular Developer', 'Frontend Designer', 'Backend Developer',
  'Delivery Head', 'QA', 'BA', 'PC', 'Sales', 'PM', 'CEO', 'Developer', 'Designer', 'Product Owner'
];

const normalizeRoleName = (role) => {
  if (!role) return 'Developer';
  if (role === 'Quality Analyst (QA)' || role === 'QA') return 'QA';
  if (role === 'Project Manager (PM)' || role === 'PM') return 'PM';
  if (role === 'Business Analyst (BA)' || role === 'BA') return 'BA';
  if (role === 'Project Coordinator (PC)' || role === 'PC') return 'PC';
  if (role === 'Sales Rep' || role === 'Sales') return 'Sales';
  return role;
};

const createEmptyAssignments = () => {
  const obj = {};
  ROLES_LIST.forEach(r => {
    obj[r] = [];
  });
  return obj;
};

export default function CreateProjectModal({ onClose, onSuccess, projectToEdit, currentUser, onDeleteProject }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');
  const [paymentReceived, setPaymentReceived] = useState('');
  const [pendingPayment, setPendingPayment] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState(createEmptyAssignments);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch users for member assignment
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/users`);
        if (!res.ok) throw new Error('Failed to fetch team members');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (projectToEdit && users.length > 0) {
      setName(projectToEdit.name || '');
      setDescription(projectToEdit.description || '');
      setTotalRevenue(projectToEdit.totalRevenue !== undefined ? projectToEdit.totalRevenue : '');
      setPaymentReceived(projectToEdit.paymentReceived !== undefined ? projectToEdit.paymentReceived : '');
      setPendingPayment(projectToEdit.pendingPayment !== undefined ? projectToEdit.pendingPayment : '');
      
      if (projectToEdit.clientUsers && projectToEdit.clientUsers.length > 0) {
        const cUser = projectToEdit.clientUsers[0];
        const cUserObj = typeof cUser === 'object' ? cUser : users.find(u => u._id === cUser);
        if (cUserObj) {
          setClientName(cUserObj.name || '');
          setClientEmail(cUserObj.email || '');
        }
      }

      if (projectToEdit.deliveryDate) {
        const d = new Date(projectToEdit.deliveryDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setDeliveryDate(`${yyyy}-${mm}-${dd}`);
      }
      
      const newAssignments = createEmptyAssignments();

      if (projectToEdit.teamMembers && Array.isArray(projectToEdit.teamMembers)) {
        projectToEdit.teamMembers.forEach(member => {
          const memberId = typeof member === 'object' ? member._id : member;
          const memberObj = users.find(u => u._id === memberId);
          if (memberObj) {
            const catRole = normalizeRoleName(memberObj.role);
            if (!newAssignments[catRole]) {
              newAssignments[catRole] = [];
            }
            if (!newAssignments[catRole].includes(memberId)) {
              newAssignments[catRole].push(memberId);
            }
          }
        });
      }
      setAssignments(newAssignments);
    }
  }, [projectToEdit, users]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Flatten all selected IDs across all roles into an array of unique user IDs
      const teamMembers = Array.from(
        new Set(
          Object.values(assignments).flat().filter(Boolean)
        )
      );

      const url = projectToEdit ? `${API_BASE}/projects/${projectToEdit._id}` : `${API_BASE}/projects`;
      const method = projectToEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || '',
          deliveryDate: deliveryDate || null,
          totalRevenue: Number(totalRevenue) || 0,
          paymentReceived: Number(paymentReceived) || 0,
          pendingPayment: Number(pendingPayment) || 0,
          teamMembers,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPassword: clientPassword.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save project');
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const userRoleLower = (currentUser?.role || '').toLowerCase();
  const canDeleteProject = userRoleLower.includes('pm') || 
                           userRoleLower.includes('project manager') || 
                           userRoleLower.includes('pc') || 
                           userRoleLower.includes('project coordinator') || 
                           userRoleLower.includes('delivery head') || 
                           userRoleLower.includes('dl') || 
                           userRoleLower.includes('ceo') || 
                           userRoleLower.includes('product owner') || 
                           userRoleLower.includes('po');

  const handleDeleteProject = async () => {
    if (!projectToEdit?._id) return;
    const confirmMsg = `Are you sure you want to permanently delete "${projectToEdit.name}"?\n\nAll tasks, board columns, documents, and comments associated with this project will be deleted permanently. This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/projects/${projectToEdit._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRole: currentUser?.role })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete project');
      }
      if (onDeleteProject) {
        onDeleteProject(projectToEdit._id);
      } else {
        onSuccess(null);
      }
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  // Group users by normalized role
  const groupedUsers = ROLES_LIST.reduce((acc, r) => {
    acc[r] = users.filter(u => normalizeRoleName(u.role) === r);
    return acc;
  }, {});

  const totalAssignedMembers = Array.from(
    new Set(Object.values(assignments).flat().filter(Boolean))
  ).length;

  return (
    <div style={styles.overlay}>
      <div className="fade-in" style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>{projectToEdit ? 'Edit Project Details' : 'Create New Project'}</h3>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Close">×</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Delivery Date</label>
            <CustomDatePicker
              value={deliveryDate}
              onChange={setDeliveryDate}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Total Revenue</label>
              <input
                type="number"
                value={totalRevenue}
                onChange={(e) => setTotalRevenue(e.target.value)}
                min="0"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Received</label>
              <input
                type="number"
                value={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.value)}
                min="0"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Pending</label>
              <input
                type="number"
                value={pendingPayment}
                onChange={(e) => setPendingPayment(e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Client Portal Access Credentials Card */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ ...styles.teamSectionLabel, margin: 0, color: 'var(--accent-blue)' }}>
                CLIENT PORTAL ACCESS
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr 1.1fr', gap: '10px' }}>
              <div style={styles.inputGroup}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Client Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{ fontSize: '12.5px', padding: '7px 10px' }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Client Work Email
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  style={{ fontSize: '12.5px', padding: '7px 10px' }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showClientPassword ? 'text' : 'password'}
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    placeholder={projectToEdit ? "Leave blank to keep current password" : "Enter password (default: Tunix@5494)"}
                    style={{ fontSize: '12.5px', padding: '7px 30px 7px 10px', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientPassword(!showClientPassword)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: 0,
                      opacity: 0.7
                    }}
                    title={showClientPassword ? 'Hide password' : 'Show password'}
                  >
                    {showClientPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {projectToEdit && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    Type a new password to reset it, or leave blank to keep existing.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={styles.teamSection}>
            <div style={styles.teamSectionHeader}>
              <label style={styles.teamSectionLabel}>ASSIGN TEAM MEMBERS</label>
              <span style={styles.teamCountBadge}>
                {totalAssignedMembers} {totalAssignedMembers === 1 ? 'member' : 'members'} assigned
              </span>
            </div>
            <div style={styles.assignmentsGrid}>
              {ROLES_LIST.map(r => {
                const roleUsers = groupedUsers[r] || [];
                const roleSelectedIds = assignments[r] || [];
                return (
                  <div key={r} style={styles.assignmentGroup}>
                    <div style={styles.roleHeaderRow}>
                      <label style={styles.roleLabel}>{r}</label>
                      {roleSelectedIds.length > 0 && (
                        <span style={styles.roleCountPill}>
                          {roleSelectedIds.length}
                        </span>
                      )}
                    </div>
                    <RoleMultiSelect
                      role={r}
                      availableUsers={roleUsers}
                      selectedIds={roleSelectedIds}
                      onChange={(newIds) => setAssignments(prev => ({ ...prev, [r]: newIds }))}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...styles.footerBtns, justifyContent: (projectToEdit && canDeleteProject) ? 'space-between' : 'flex-end' }}>
            {projectToEdit && canDeleteProject && (
              <button 
                type="button" 
                onClick={handleDeleteProject} 
                disabled={loading || isDeleting}
                style={styles.deleteProjectBtn}
                title="Permanently delete this project"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onClose} className="secondary" style={styles.btn}>
                Cancel
              </button>
              <button type="submit" disabled={loading || isDeleting} style={styles.btn}>
                {loading ? 'Saving...' : projectToEdit ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </form>
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
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: '580px',
    padding: '28px 30px',
    boxShadow: '0 20px 45px rgba(15, 23, 42, 0.16)',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    color: 'var(--text-primary)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '18px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    margin: '4px 0 0 0',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: '1',
  },
  error: {
    background: 'rgba(255, 69, 58, 0.1)',
    border: '1px solid rgba(255, 69, 58, 0.2)',
    borderRadius: '8px',
    color: 'var(--accent-red)',
    padding: '12px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  teamSection: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '4px',
  },
  teamSectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  teamSectionLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
  },
  teamCountBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  assignmentsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
    maxHeight: '260px',
    overflowY: 'auto',
    paddingRight: '6px',
    paddingBottom: '6px',
  },
  assignmentGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  roleHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
  },
  roleLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  roleCountPill: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    borderRadius: '10px',
    padding: '1px 6px',
  },
  multiSelectContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  multiSelectTrigger: {
    minHeight: '38px',
    padding: '7px 10px',
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-main)',
    transition: 'var(--transition-smooth)',
  },
  triggerTextWrapper: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  triggerSelectedSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
  },
  selectedNamesPreview: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  selectedCountBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: 'var(--accent-blue)',
    borderRadius: '10px',
    padding: '1px 5px',
    flexShrink: 0,
  },
  dropdownMenuCard: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.15)',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  searchBoxWrapper: {
    padding: '8px 10px',
    borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
    backgroundColor: '#f8fafc',
  },
  searchBoxInput: {
    width: '100%',
    padding: '6px 10px',
    fontSize: '12px',
    borderRadius: '6px',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    outline: 'none',
  },
  bulkActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 10px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
  },
  bulkActionButton: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-blue)',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '2px 4px',
    width: 'auto',
  },
  optionsList: {
    maxHeight: '160px',
    overflowY: 'auto',
    padding: '4px 0',
  },
  emptyRoleNotice: {
    padding: '12px 10px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  userOptionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  checkboxBox: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: '1.5px solid rgba(15, 23, 42, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  checkboxCheck: {
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '700',
    lineHeight: '1',
  },
  userOptionTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  userOptionName: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userOptionEmail: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  selectedTagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '2px',
  },
  selectedTagPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(30, 58, 138, 0.15)',
    borderRadius: '6px',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: '500',
  },
  selectedTagLabel: {
    maxWidth: '120px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  removeTagCross: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    padding: 0,
    fontSize: '13px',
    lineHeight: '1',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '12px',
    height: '12px',
  },
  footerBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '10px',
  },
  deleteProjectBtn: {
    padding: '9px 14px',
    fontSize: '12.5px',
    fontWeight: '600',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: '#dc2626',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  btn: {
    padding: '10px 20px',
  },
  dateOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  dateTrigger: {
    padding: '12px 16px',
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: 'var(--text-primary)',
    transition: 'var(--transition-smooth)',
  },
  caret: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    marginLeft: '6px',
  },
  calendarCard: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--panel-border)',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  calendarMonthYear: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  calendarNavBtn: {
    background: 'transparent',
    padding: '4px 8px',
    border: 'none',
    fontSize: '18px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    width: 'auto',
  },
  weekdaysRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center',
    marginBottom: '8px',
  },
  weekdayItem: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    rowGap: '6px',
    columnGap: '6px',
    justifyItems: 'center',
  },
  dayItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    fontSize: '12px',
    borderRadius: '50%',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'var(--transition-smooth)',
  },
  emptyDay: {
    width: '30px',
    height: '30px',
  },
  todayDay: {
    border: '1.5px solid var(--accent-blue)',
    color: 'var(--accent-blue)',
    fontWeight: '600',
  },
  activeDay: {
    background: 'var(--accent-blue) !important',
    color: '#ffffff !important',
    fontWeight: '600',
  },
};
