import React, { useState } from 'react';
import UserPerformanceModal from './UserPerformanceModal';
import { API_BASE } from '../config';

const STATUS_CONFIG = {
  'In Progress': { label: 'In Progress', dotColor: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)', color: '#1d4ed8' },
  'Live': { label: 'Live', dotColor: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', color: '#047857' },
  'On Hold': { label: 'On Hold', dotColor: '#64748b', bg: 'rgba(100, 116, 139, 0.08)', color: '#475569' },
};

const normalizeStatus = (status) => {
  if (['In Progress', 'Live', 'On Hold'].includes(status)) {
    return status;
  }
  return 'In Progress';
};

export default function PMProjectsDashboard({
  projects,
  currentUser,
  onSelectProject,
  onTriggerCreateProject,
  onEditProject,
  onRefresh,
  onOpenScorecard,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  
  // Financials popover state
  const [activeFinanceProjId, setActiveFinanceProjId] = useState(null);
  const [editRevenue, setEditRevenue] = useState(0);
  const [editReceived, setEditReceived] = useState(0);
  const [editPending, setEditPending] = useState(0);

  // Team popover state
  const [activeTeamProjId, setActiveTeamProjId] = useState(null);
  const [inspectedMember, setInspectedMember] = useState(null);

  // Status dropdown state
  const [activeStatusProjId, setActiveStatusProjId] = useState(null);

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const pStatus = normalizeStatus(p.status);
    const matchesStatus = selectedStatusFilter === 'All' || pStatus === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary Metrics
  const totalRevenueSum = projects.reduce((acc, p) => acc + (p.totalRevenue || 0), 0);
  const totalReceivedSum = projects.reduce((acc, p) => acc + (p.paymentReceived || 0), 0);
  const totalPendingSum = projects.reduce((acc, p) => acc + (p.pendingPayment || 0), 0);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleUpdateStatus = async (projectId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update project status');
      setActiveStatusProjId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveFinancials = async (e, projectId) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalRevenue: Number(editRevenue) || 0,
          paymentReceived: Number(editReceived) || 0,
          pendingPayment: Number(editPending) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update financials');
      setActiveFinanceProjId(null);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container} className="fade-in">
      {/* Clean Top Header */}
      <div style={styles.topHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={styles.pageTitle}>Projects</h1>
        </div>

        {/* Minimal Financial Summary Strip */}
        <div style={styles.metricStrip}>
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>TOTAL REVENUE</span>
            <span style={styles.metricVal}>{totalRevenueSum.toLocaleString()}</span>
          </div>
          <div style={styles.metricDivider} />
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>RECEIVED</span>
            <span style={{ ...styles.metricVal, color: '#059669' }}>{totalReceivedSum.toLocaleString()}</span>
          </div>
          <div style={styles.metricDivider} />
          <div style={styles.metricItem}>
            <span style={styles.metricLabel}>PENDING</span>
            <span style={{ ...styles.metricVal, color: totalPendingSum > 0 ? '#dc2626' : '#64748b' }}>
              {totalPendingSum.toLocaleString()}
            </span>
          </div>
          {['PM', 'Project Manager (PM)', 'CEO'].includes(currentUser?.role) && (
            <button 
              onClick={onTriggerCreateProject}
              style={styles.newProjectBtn}
            >
              + New Project
            </button>
          )}
        </div>
      </div>

      {/* Clean Controls: Search + Filter Tabs */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...styles.searchInput, paddingLeft: '12px' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={styles.clearSearchBtn}>×</button>
          )}
        </div>

        <div style={styles.statusTabs}>
          {['All', 'In Progress', 'Live', 'On Hold'].map(status => {
            const isSelected = selectedStatusFilter === status;
            const count = status === 'All' 
              ? projects.length 
              : projects.filter(p => normalizeStatus(p.status) === status).length;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatusFilter(status)}
                style={{
                  ...styles.tabBtn,
                  ...(isSelected ? styles.tabBtnActive : {})
                }}
              >
                {status} <span style={{ opacity: isSelected ? 0.9 : 0.6, fontSize: '11px', marginLeft: '3px' }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Crisp, Clean Executive Projects Table */}
      <div style={styles.tableContainer}>
        {/* Table Column Headers */}
        <div style={styles.tableHeaderRow}>
          <div style={{ ...styles.th, flex: 2.2 }}>PROJECT</div>
          <div style={{ ...styles.th, flex: 1.2 }}>STATUS</div>
          <div style={{ ...styles.th, flex: 1.2 }}>DELIVERY</div>
          <div style={{ ...styles.th, flex: 1.6 }}>PAYMENTS</div>
          <div style={{ ...styles.th, flex: 1.2 }}>TEAM</div>
          <div style={{ ...styles.th, flex: 1.2, textAlign: 'right' }}>ACTION</div>
        </div>

        {filteredProjects.length === 0 ? (
          <div style={styles.emptyState}>
            No matching projects found.
          </div>
        ) : (
          filteredProjects.map((project, idx) => {
            const priorityNumber = idx + 1;
            const currentStatus = normalizeStatus(project.status);
            const statusConf = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['In Progress'];
            const teamMembers = project.teamMembers || [];

            return (
              <div key={project._id} style={styles.tableRow} className="dashboard-table-row">
                {/* 1. Project Info */}
                <div style={{ ...styles.td, flex: 2.2, alignItems: 'flex-start' }}>
                  <div style={styles.priorityPill}>P{priorityNumber}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span 
                      style={styles.projectNameLink}
                      onClick={() => onSelectProject(project._id)}
                      title={`Open ${project.name}`}
                    >
                      {project.name}
                    </span>
                    <span style={styles.projectDescText}>
                      {project.description || 'No description'}
                    </span>
                  </div>
                </div>

                {/* 2. Status Dropdown */}
                <div style={{ ...styles.td, flex: 1.2 }}>
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => setActiveStatusProjId(activeStatusProjId === project._id ? null : project._id)}
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: statusConf.bg,
                        color: statusConf.color,
                      }}
                      className="hover-card"
                      title="Click to update status"
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusConf.dotColor }} />
                      <span>{statusConf.label}</span>
                      <span style={{ fontSize: '8px', opacity: 0.6, marginLeft: '2px' }}>▼</span>
                    </div>

                    {activeStatusProjId === project._id && (
                      <>
                        <div style={styles.popoverBackdrop} onClick={() => setActiveStatusProjId(null)} />
                        <div style={styles.dropdownMenu} className="fade-in">
                          {Object.keys(STATUS_CONFIG).map(sKey => {
                            const conf = STATUS_CONFIG[sKey];
                            return (
                              <div
                                key={sKey}
                                onClick={() => handleUpdateStatus(project._id, sKey)}
                                style={{
                                  ...styles.dropdownItem,
                                  backgroundColor: currentStatus === sKey ? conf.bg : 'transparent',
                                  color: conf.color,
                                }}
                                className="dropdown-option"
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: conf.dotColor }} />
                                <span>{conf.label}</span>
                                {currentStatus === sKey && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Delivery Deadline */}
                <div style={{ ...styles.td, flex: 1.2 }}>
                  <span style={styles.dateText}>
                    {formatDate(project.deliveryDate)}
                  </span>
                </div>

                {/* 4. Payments Breakdown */}
                <div style={{ ...styles.td, flex: 1.6 }}>
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => {
                        setEditRevenue(project.totalRevenue || 0);
                        setEditReceived(project.paymentReceived || 0);
                        setEditPending(project.pendingPayment || 0);
                        setActiveFinanceProjId(activeFinanceProjId === project._id ? null : project._id);
                      }}
                      style={styles.paymentCell}
                      className="hover-card"
                      title="Click to view & edit financials"
                    >
                      <div style={styles.paymentNumbers}>
                        <span style={{ color: '#059669', fontWeight: '700' }}>
                          {(project.paymentReceived || 0).toLocaleString()}
                        </span>
                        <span style={{ color: '#94a3b8', margin: '0 3px' }}>/</span>
                        <span style={{ color: '#1e293b', fontWeight: '600' }}>
                          {(project.totalRevenue || 0).toLocaleString()}
                        </span>
                      </div>
                      {(project.pendingPayment || 0) > 0 && (
                        <div style={styles.pendingDueText}>
                          Due: {(project.pendingPayment || 0).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Financials Quick Popover */}
                    {activeFinanceProjId === project._id && (
                      <>
                        <div style={styles.popoverBackdrop} onClick={() => setActiveFinanceProjId(null)} />
                        <div style={styles.popoverModal} className="fade-in" onClick={(e) => e.stopPropagation()}>
                          <div style={styles.popoverHeader}>
                            <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                              Financials: {project.name}
                            </span>
                            <button 
                              type="button" 
                              onClick={() => setActiveFinanceProjId(null)}
                              style={styles.closeBtn}
                            >
                              ×
                            </button>
                          </div>

                          <form onSubmit={(e) => handleSaveFinancials(e, project._id)} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div>
                              <label style={styles.inputLabel}>Total Revenue</label>
                              <input
                                type="number"
                                value={editRevenue}
                                onChange={(e) => setEditRevenue(e.target.value)}
                                min="0"
                                style={styles.inputField}
                                required
                                autoFocus
                              />
                            </div>

                            <div>
                              <label style={styles.inputLabel}>Payment Received</label>
                              <input
                                type="number"
                                value={editReceived}
                                onChange={(e) => setEditReceived(e.target.value)}
                                min="0"
                                style={styles.inputField}
                                required
                              />
                            </div>

                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                <label style={styles.inputLabel}>Pending Payment</label>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const rev = Number(editRevenue) || 0;
                                    const rec = Number(editReceived) || 0;
                                    setEditPending(Math.max(0, rev - rec));
                                  }}
                                  style={{
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    color: '#2563eb',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ⚡ Auto Calculate
                                </button>
                              </div>
                              <input
                                type="number"
                                value={editPending}
                                onChange={(e) => setEditPending(e.target.value)}
                                min="0"
                                style={styles.inputField}
                                required
                              />
                            </div>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                              <button 
                                type="button" 
                                onClick={() => setActiveFinanceProjId(null)} 
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  borderRadius: '6px',
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
                                  padding: '6px 14px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  borderRadius: '6px',
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
                </div>

                {/* 5. Team Members */}
                <div style={{ ...styles.td, flex: 1.2 }}>
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTeamProjId(activeTeamProjId === project._id ? null : project._id)}
                      style={styles.teamPill}
                      title="View assigned team members"
                    >
                      <span style={{ fontWeight: '600' }}>{teamMembers.length} members</span>
                      <span style={{ fontSize: '8px', opacity: 0.6 }}>▼</span>
                    </button>

                    {/* Team Popover */}
                    {activeTeamProjId === project._id && (
                      <>
                        <div style={styles.popoverBackdrop} onClick={() => setActiveTeamProjId(null)} />
                        <div style={styles.popoverModal} className="fade-in" onClick={(e) => e.stopPropagation()}>
                          <div style={styles.popoverHeader}>
                            <span style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                              Assigned Team ({teamMembers.length})
                            </span>
                            <button 
                              type="button" 
                              onClick={() => setActiveTeamProjId(null)}
                              style={styles.closeBtn}
                            >
                              ×
                            </button>
                          </div>

                          {teamMembers.length === 0 ? (
                            <div style={{ padding: '12px 0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                              No team members assigned yet.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                              {teamMembers.map(member => {
                                const memberName = member.name || member.email || 'Member';
                                const memberRole = member.role || 'Member';
                                const canInspect = ['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)', 'CEO', 'Delivery Head'].includes(currentUser?.role);

                                return (
                                  <div 
                                    key={member._id || member.email} 
                                    style={{
                                      ...styles.teamItem,
                                      cursor: canInspect ? 'pointer' : 'default',
                                    }}
                                    className={canInspect ? "hover-card" : ""}
                                    onClick={() => {
                                      if (canInspect && onOpenScorecard) {
                                        onOpenScorecard(member);
                                        setActiveTeamProjId(null);
                                      }
                                    }}
                                    title={canInspect ? `Click to view ${memberName}'s Performance Scorecard` : ''}
                                  >
                                    <div style={styles.avatarTiny}>
                                      {memberName.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>{memberName}</span>
                                        {canInspect && <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: '700' }}>Scorecard ↗</span>}
                                      </div>
                                      <div style={{ fontSize: '11px', color: '#64748b' }}>{memberRole}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 6. Action: Open Board */}
                <div style={{ ...styles.td, flex: 1.2, justifyContent: 'flex-end', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onSelectProject(project._id)}
                    style={styles.openBoardBtn}
                  >
                    Open Board →
                  </button>
                  {(() => {
                    const r = (currentUser?.role || '').toLowerCase();
                    const canManage = r.includes('pm') || r.includes('project manager') ||
                                      r.includes('pc') || r.includes('project coordinator') ||
                                      r.includes('delivery head') || r.includes('dl') ||
                                      r.includes('ceo') || r.includes('product owner') || r.includes('po');
                    return canManage ? (
                      <button
                        type="button"
                        onClick={() => onEditProject(project)}
                        style={styles.settingsIconBtn}
                        title="Edit / Manage Project"
                      >
                        ⚙️
                      </button>
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Member Performance Scorecard Modal */}
      {inspectedMember && (
        <UserPerformanceModal
          userId={inspectedMember._id}
          userEmail={inspectedMember.email}
          userName={inspectedMember.name}
          onClose={() => setInspectedMember(null)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 32px 40px',
    height: '100%',
    overflowY: 'auto',
    backgroundColor: '#ffffff',
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '18px',
    borderBottom: '1px solid #f1f5f9',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.4px',
  },
  countBadge: {
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '700',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    borderRadius: '12px',
  },
  metricStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  metricItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  metricLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.4px',
  },
  metricVal: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#0f172a',
  },
  metricDivider: {
    width: '1px',
    height: '14px',
    backgroundColor: '#e2e8f0',
  },
  newProjectBtn: {
    padding: '7px 14px',
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    marginLeft: '8px',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    width: '260px',
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
    fontSize: '14px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0,
  },
  statusTabs: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  tabBtn: {
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    borderColor: '#e2e8f0',
  },
  tableContainer: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    overflow: 'visible',
  },
  tableHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 18px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  th: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.6px',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s ease',
  },
  td: {
    display: 'flex',
    alignItems: 'center',
  },
  emptyState: {
    padding: '36px 20px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#64748b',
  },
  priorityPill: {
    fontSize: '11px',
    fontWeight: '800',
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    padding: '2px 6px',
    borderRadius: '4px',
    marginRight: '10px',
    flexShrink: 0,
  },
  projectNameLink: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0f172a',
    cursor: 'pointer',
  },
  projectDescText: {
    fontSize: '12px',
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '240px',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '14px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  dateText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
  },
  paymentCell: {
    cursor: 'pointer',
    padding: '3px 6px',
    borderRadius: '6px',
  },
  paymentNumbers: {
    fontSize: '12px',
    lineHeight: 1.2,
  },
  pendingDueText: {
    fontSize: '10px',
    color: '#dc2626',
    fontWeight: '600',
  },
  teamPill: {
    padding: '4px 10px',
    backgroundColor: '#f8fafc',
    color: '#334155',
    borderRadius: '6px',
    fontSize: '12px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  openBoardBtn: {
    padding: '6px 12px',
    backgroundColor: '#f8fafc',
    color: 'var(--accent-blue)',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  settingsIconBtn: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
  },
  popoverBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 900,
    background: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    width: '140px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
    padding: '4px',
    zIndex: 1000,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 8px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  popoverModal: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    width: '280px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid rgba(15, 23, 42, 0.15)',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.2)',
    padding: '16px',
    zIndex: 1000,
  },
  popoverHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    paddingBottom: '6px',
    borderBottom: '1px solid #f1f5f9',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0,
  },
  inputLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#64748b',
    display: 'block',
    marginBottom: '2px',
  },
  inputField: {
    width: '100%',
    padding: '6px 8px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  autoBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent-blue)',
    fontSize: '10px',
    fontWeight: '700',
    cursor: 'pointer',
    padding: 0,
  },
  btnSecondary: {
    padding: '5px 10px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '6px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
  },
  btnPrimary: {
    padding: '5px 12px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '6px',
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
  },
  teamItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 6px',
    borderRadius: '6px',
    backgroundColor: '#f8fafc',
  },
  avatarTiny: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
