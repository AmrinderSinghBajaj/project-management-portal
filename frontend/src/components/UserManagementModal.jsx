import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

const rolesList = [
  { value: 'CEO', label: 'CEO' },
  { value: 'Delivery Head', label: 'Delivery Head' },
  { value: 'PM', label: 'Project Manager (PM)' },
  { value: 'PC', label: 'Project Coordinator (PC)' },
  { value: 'QA', label: 'Quality Analyst (QA)' },
  { value: 'BA', label: 'Business Analyst (BA)' },
  { value: 'Developer', label: 'Developer (General)' },
  { value: 'Full Stack Developer', label: 'Full Stack Developer' },
  { value: 'Backend Developer', label: 'Backend Developer' },
  { value: 'Angular Developer', label: 'Angular Developer' },
  { value: 'Android Developer', label: 'Android Developer' },
  { value: 'iOS Developer', label: 'iOS Developer' },
  { value: 'Flutter Developer', label: 'Flutter Developer' },
  { value: 'Python Developer', label: 'Python Developer' },
  { value: 'Frontend Designer', label: 'Frontend Designer' },
  { value: 'Designer', label: 'Designer (UI/UX)' },
  { value: 'Sales', label: 'Sales Rep' },
  { value: 'Product Owner', label: 'Product Owner' },
  { value: 'Client', label: 'Client' }
];

// Clean Modern SVG Icons
const EyeIcon = ({ size = 15, color = '#475569' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ display: 'block' }}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ size = 15, color = '#1e3a8a' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ display: 'block' }}
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const EditIcon = ({ size = 14, color = '#1e3a8a' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ display: 'block' }}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CopyIcon = ({ size = 14, color = '#1e3a8a' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ display: 'block' }}
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const TrashIcon = ({ size = 14, color = '#dc2626' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{ display: 'block' }}
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export default function UserManagementModal({ currentUser, onClose, onUserCreated }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // New User Creation Form toggle & fields
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Developer');
  const [newPassword, setNewPassword] = useState('Tunix@5494');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Eye Visibility State: Set of userIds that are currently unmasked/revealed
  const [visiblePasswordUserIds, setVisiblePasswordUserIds] = useState(new Set());

  // Inline Password Editing State
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingPasswordVal, setEditingPasswordVal] = useState('');
  const [savingPasswordId, setSavingPasswordId] = useState(null);

  const filteredRoles = rolesList.filter(r =>
    r.label.toLowerCase().includes(roleSearch.toLowerCase()) ||
    r.value.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const adminEmailParam = encodeURIComponent(currentUser?.email || '');
      const res = await fetch(`${API_BASE}/users?adminEmail=${adminEmailParam}`);
      if (!res.ok) throw new Error('Failed to load user directory.');
      const data = await res.json();
      setUsersList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswordUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleStartEditPassword = (user) => {
    setEditingUserId(user._id);
    setEditingPasswordVal(user.plainPassword || 'Tunix@5494');
    // Also make visible when editing
    setVisiblePasswordUserIds(prev => new Set(prev).add(user._id));
  };

  const handleCancelEditPassword = () => {
    setEditingUserId(null);
    setEditingPasswordVal('');
  };

  const handleSavePassword = async (user) => {
    if (!editingPasswordVal || editingPasswordVal.trim().length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setSavingPasswordId(user._id);

    try {
      const res = await fetch(`${API_BASE}/users/${user._id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: editingPasswordVal.trim(),
          adminEmail: currentUser?.email
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      setSuccessMsg(`✓ Password for ${user.name} (${user.email}) updated.`);
      
      // Update local state
      setUsersList(prev => prev.map(u => u._id === user._id ? { ...u, plainPassword: editingPasswordVal.trim() } : u));
      setEditingUserId(null);
      setEditingPasswordVal('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPasswordId(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setCreatingUser(true);

    try {
      const res = await fetch(`${API_BASE}/users/admin-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          role: newRole,
          password: newPassword,
          adminEmail: currentUser?.email
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setSuccessMsg(`✓ User "${newName}" (${newEmail}) created successfully!`);
      
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewRole('Developer');
      setNewPassword('Tunix@5494');
      setShowCreateForm(false);

      fetchUsers();
      if (onUserCreated) onUserCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const isSelf = user.email?.toLowerCase() === currentUser?.email?.toLowerCase();
    if (isSelf) {
      alert('You cannot disable your own administrator account.');
      return;
    }

    const newActiveState = user.isActive === false ? true : false;
    const confirmText = newActiveState 
      ? `Enable login credentials for "${user.name}" (${user.email})?`
      : `Disable login credentials for "${user.name}" (${user.email})?\n\nThey will be immediately blocked from logging into the platform.`;

    if (!window.confirm(confirmText)) return;

    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE}/users/${user._id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: currentUser?.email,
          isActive: newActiveState
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');

      setSuccessMsg(data.message || `User status updated.`);
      setUsersList(prev => prev.map(u => u._id === user._id ? { ...u, isActive: newActiveState } : u));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    const isSelf = user.email?.toLowerCase() === currentUser?.email?.toLowerCase();
    if (isSelf) {
      alert('You cannot delete your own master admin account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently remove user "${user.name}" (${user.email})?`)) {
      return;
    }

    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/users/${user._id}?adminEmail=${encodeURIComponent(currentUser?.email || '')}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      setSuccessMsg(`✓ User "${user.name}" was permanently removed.`);
      setUsersList(prev => prev.filter(u => u._id !== user._id));
    } catch (err) {
      setError(err.message);
    }
  };

  const copyUserCredentials = (user) => {
    const pass = user.plainPassword || 'Tunix@5494';
    const text = `Apptunix Portal Access Credentials:\nURL: ${window.location.origin}\nName: ${user.name}\nEmail: ${user.email}\nPassword: ${pass}\nRole: ${user.role}`;
    navigator.clipboard.writeText(text);
    alert(`Credentials for ${user.name} copied to clipboard!\n(Password: ${pass})`);
  };

  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) ||
           (u.email || '').toLowerCase().includes(q) ||
           (u.role || '').toLowerCase().includes(q);
  });

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} className="fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header Section */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.headerTitle}>User & Access Management</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => { setShowCreateForm(!showCreateForm); setError(''); setSuccessMsg(''); }}
              style={showCreateForm ? styles.cancelCreateBtn : styles.createNewUserBtn}
            >
              {showCreateForm ? '✕ Close Form' : '+ Create New User'}
            </button>
            <button style={styles.closeBtn} onClick={onClose} title="Close">×</button>
          </div>
        </div>

        {/* Notifications */}
        {error && <div style={styles.errorBanner}>{error}</div>}
        {successMsg && <div style={styles.successBanner}>{successMsg}</div>}

        {/* INLINE CREATE USER FORM */}
        {showCreateForm && (
          <div style={styles.createFormContainer} className="fade-in">
            <h3 style={styles.formTitle}>✨ Provision New Team Member / Client</h3>
            <form onSubmit={handleCreateUser} style={styles.form}>
              <div style={styles.formGrid}>
                {/* Full Name */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>FULL NAME *</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                {/* Email */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>WORK EMAIL *</label>
                  <input
                    type="email"
                    placeholder="e.g. john@apptunix.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                {/* Role dropdown */}
                <div style={{ ...styles.inputGroup, position: 'relative' }}>
                  <label style={styles.label}>PLATFORM ROLE *</label>
                  <div 
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    style={styles.dropdownTrigger}
                  >
                    <span>{rolesList.find(r => r.value === newRole)?.label || newRole}</span>
                    <span style={styles.caret}>{isRoleDropdownOpen ? '▲' : '▼'}</span>
                  </div>

                  {isRoleDropdownOpen && (
                    <>
                      <div 
                        style={styles.dropdownOverlay} 
                        onClick={() => setIsRoleDropdownOpen(false)} 
                      />
                      <div style={styles.dropdownMenu}>
                        <input
                          type="text"
                          placeholder="Filter role..."
                          value={roleSearch}
                          onChange={(e) => setRoleSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={styles.dropdownSearch}
                          autoFocus
                        />
                        <div style={styles.dropdownList}>
                          {filteredRoles.map(r => (
                            <div
                              key={r.value}
                              onClick={() => {
                                setNewRole(r.value);
                                setIsRoleDropdownOpen(false);
                                setRoleSearch('');
                              }}
                              style={{
                                ...styles.dropdownOption,
                                ...(newRole === r.value ? styles.dropdownOptionActive : {})
                              }}
                            >
                              {r.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Password */}
                <div style={styles.inputGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={styles.label}>INITIAL PASSWORD *</label>
                    <button
                      type="button"
                      onClick={() => setNewPassword('Tunix@' + Math.floor(1000 + Math.random() * 9000))}
                      style={styles.genPassBtn}
                    >
                      🎲 Generate
                    </button>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ ...styles.input, width: '100%', paddingRight: '36px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeBtn}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={styles.formActionsRow}>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  style={styles.submitCreateBtn}
                >
                  {creatingUser ? 'Creating User...' : '✓ Add User to Platform'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User Search & Summary Controls */}
        <div style={styles.searchBarContainer}>
          <div style={styles.searchWrapper}>
            <span style={{ color: '#94a3b8', fontSize: '15px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
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
          <div style={styles.usersCountBadge}>
            Total: <strong>{usersList.length}</strong> users ({usersList.filter(u => u.isActive !== false).length} active)
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            style={styles.refreshBtn}
            title="Reload user list from database"
          >
            🔄 Sync
          </button>
        </div>

        {/* Users Table */}
        <div style={styles.tableWrapper}>
          {loading ? (
            <div style={styles.loadingBox}>Loading platform users...</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>USER</th>
                  <th style={styles.th}>EMAIL</th>
                  <th style={styles.th}>ROLE</th>
                  <th style={{ ...styles.th, minWidth: '190px' }}>PASSWORD</th>
                  <th style={styles.th}>STATUS</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={styles.emptyTd}>No users found matching "{searchQuery}"</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const isSelf = user.email?.toLowerCase() === currentUser?.email?.toLowerCase();
                    const isActive = user.isActive !== false;
                    const isRevealed = visiblePasswordUserIds.has(user._id);
                    const isEditingThisUser = editingUserId === user._id;
                    const plainPass = user.plainPassword || 'Tunix@5494';

                    return (
                      <tr 
                        key={user._id} 
                        style={{
                          ...styles.tr,
                          backgroundColor: isActive ? 'transparent' : 'rgba(239, 68, 68, 0.03)'
                        }}
                      >
                        {/* Name */}
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              ...styles.avatar,
                              backgroundColor: isActive ? '#1e3a8a' : '#94a3b8'
                            }}>
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', color: isActive ? '#0f172a' : '#64748b' }}>
                                {user.name}
                              </div>
                              {isSelf && <span style={styles.selfBadge}>Current User</span>}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={styles.td}>
                          <span style={{ color: '#475569', fontSize: '13px', fontFamily: 'monospace' }}>
                            {user.email}
                          </span>
                        </td>

                        {/* Role */}
                        <td style={styles.td}>
                          <span style={styles.roleBadge}>{user.role}</span>
                        </td>

                        {/* Password Column with Eye Toggle & Inline Editor */}
                        <td style={styles.td}>
                          {isEditingThisUser ? (
                            /* Inline Edit Mode */
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="text"
                                value={editingPasswordVal}
                                onChange={(e) => setEditingPasswordVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSavePassword(user);
                                  if (e.key === 'Escape') handleCancelEditPassword();
                                }}
                                style={styles.inlinePassInput}
                                autoFocus
                                placeholder="Enter password"
                              />
                              <button
                                type="button"
                                onClick={() => handleSavePassword(user)}
                                disabled={savingPasswordId === user._id}
                                style={styles.inlineSaveBtn}
                                title="Save (Enter)"
                              >
                                {savingPasswordId === user._id ? '⏳' : '✓'}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditPassword}
                                style={styles.inlineCancelBtn}
                                title="Cancel (Esc)"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            /* Display Mode with Eye Toggle and Edit Button */
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '12px',
                                fontFamily: isRevealed ? 'monospace' : 'inherit',
                                fontWeight: isRevealed ? '700' : '400',
                                color: isRevealed ? '#1e3a8a' : '#64748b',
                                backgroundColor: isRevealed ? 'rgba(30, 58, 138, 0.08)' : '#f1f5f9',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                letterSpacing: isRevealed ? '0.5px' : '2px',
                                minWidth: '85px',
                                display: 'inline-block',
                                textAlign: 'center'
                              }}>
                                {isRevealed ? plainPass : '••••••••'}
                              </span>

                              {/* Eye Button: Toggle reveal */}
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(user._id)}
                                style={{
                                  ...styles.iconActionBtn,
                                  backgroundColor: isRevealed ? 'rgba(30, 58, 138, 0.08)' : '#f8fafc',
                                  borderColor: isRevealed ? '#93c5fd' : '#cbd5e1'
                                }}
                                title={isRevealed ? 'Hide Password' : 'Show Password'}
                              >
                                {isRevealed ? <EyeOffIcon size={15} color="#1e3a8a" /> : <EyeIcon size={15} color="#475569" />}
                              </button>

                              {/* Inline Edit Trigger (Icon only) */}
                              <button
                                type="button"
                                onClick={() => handleStartEditPassword(user)}
                                style={styles.iconActionBtn}
                                title="Edit Password"
                              >
                                <EditIcon size={14} color="#1e3a8a" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Status (Enabled / Disabled) */}
                        <td style={styles.td}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            disabled={isSelf}
                            style={{
                              ...styles.statusToggleBtn,
                              backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: isActive ? '#059669' : '#dc2626',
                              borderColor: isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              opacity: isSelf ? 0.6 : 1
                            }}
                            title={isSelf ? 'Cannot disable self' : isActive ? 'Click to Disable account' : 'Click to Enable account'}
                          >
                            <span style={{ fontSize: '10px' }}>{isActive ? '●' : '○'}</span>
                            <span>{isActive ? 'Enabled' : 'Disabled'}</span>
                          </button>
                        </td>

                        {/* Actions (Icon Only) */}
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {/* Copy Credentials Button (Icon only) */}
                            <button
                              type="button"
                              onClick={() => copyUserCredentials(user)}
                              style={styles.iconActionBtn}
                              title="Copy Login Credentials"
                            >
                              <CopyIcon size={14} color="#1e3a8a" />
                            </button>

                            {/* Delete User Button (Clean Trash Icon) */}
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                style={styles.deleteIconBtn}
                                title="Delete User Permanently"
                              >
                                <TrashIcon size={14} color="#dc2626" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(6px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '960px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    overflow: 'hidden',
  },
  header: {
    padding: '18px 24px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafbfc',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  createNewUserBtn: {
    padding: '8px 16px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(30, 58, 138, 0.2)',
    transition: 'background-color 0.15s ease',
  },
  cancelCreateBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#94a3b8',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
  },
  errorBanner: {
    margin: '12px 24px 0 24px',
    padding: '10px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '13px',
  },
  successBanner: {
    margin: '12px 24px 0 24px',
    padding: '10px 16px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: '8px',
    color: '#059669',
    fontSize: '13px',
    fontWeight: '500',
  },
  createFormContainer: {
    margin: '16px 24px 0 24px',
    padding: '18px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  formTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 14px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.4px',
  },
  input: {
    padding: '9px 12px',
    fontSize: '13px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    boxSizing: 'border-box',
  },
  dropdownTrigger: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '13px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  caret: {
    fontSize: '10px',
    color: '#64748b',
  },
  dropdownOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99991,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
    zIndex: 99992,
    maxHeight: '220px',
    display: 'flex',
    flexDirection: 'column',
    padding: '6px',
  },
  dropdownSearch: {
    padding: '6px 10px',
    fontSize: '12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    marginBottom: '6px',
    outline: 'none',
  },
  dropdownList: {
    overflowY: 'auto',
    maxHeight: '150px',
  },
  dropdownOption: {
    padding: '6px 10px',
    fontSize: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#0f172a',
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    color: '#1e3a8a',
    fontWeight: '600',
  },
  genPassBtn: {
    background: 'none',
    border: 'none',
    fontSize: '11px',
    color: '#1e3a8a',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  },
  eyeBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '2px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formActionsRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  submitCreateBtn: {
    padding: '9px 18px',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '9px 16px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
  },
  searchBarContainer: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  searchWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '13px',
    color: '#0f172a',
    width: '100%',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    fontSize: '12px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0,
  },
  usersCountBadge: {
    fontSize: '13px',
    color: '#64748b',
    whiteSpace: 'nowrap',
  },
  refreshBtn: {
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
  },
  tableWrapper: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px 20px 24px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid #f1f5f9',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    backgroundColor: '#f8fafc',
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    borderBottom: '1px solid #e2e8f0',
    letterSpacing: '0.4px',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '10px 14px',
    fontSize: '13px',
    color: '#334155',
    verticalAlign: 'middle',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selfBadge: {
    fontSize: '10px',
    backgroundColor: 'rgba(30, 58, 138, 0.1)',
    color: '#1e3a8a',
    padding: '1px 5px',
    borderRadius: '4px',
    fontWeight: '700',
    display: 'inline-block',
    marginTop: '2px',
  },
  roleBadge: {
    padding: '3px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    color: '#1e3a8a',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  iconActionBtn: {
    width: '30px',
    height: '30px',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#475569',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  deleteIconBtn: {
    width: '30px',
    height: '30px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#dc2626',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  inlinePassInput: {
    padding: '5px 8px',
    fontSize: '12px',
    fontFamily: 'monospace',
    fontWeight: '600',
    borderRadius: '6px',
    border: '1.5px solid #1e3a8a',
    outline: 'none',
    width: '120px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  inlineSaveBtn: {
    width: '26px',
    height: '26px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCancelBtn: {
    width: '26px',
    height: '26px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusToggleBtn: {
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid',
    fontSize: '11px',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.15s ease',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '50px',
    color: '#64748b',
    fontSize: '14px',
  },
  emptyTd: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
    fontSize: '13px',
  },
};
