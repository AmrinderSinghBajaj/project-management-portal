import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'Live':
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.3)' };
    case 'Testing':
      return { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: 'rgba(245, 158, 11, 0.3)' };
    case 'On Hold':
      return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' };
    case 'In Progress':
    default:
      return { bg: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', border: 'rgba(37, 99, 235, 0.3)' };
  }
};

const TECH_TAG_STYLES = {
  android: { bg: 'rgba(16, 185, 129, 0.1)', color: '#047857', border: 'rgba(16, 185, 129, 0.25)' },
  ios: { bg: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8', border: 'rgba(59, 130, 246, 0.25)' },
  backend: { bg: 'rgba(124, 58, 237, 0.1)', color: '#6d28d9', border: 'rgba(124, 58, 237, 0.25)' },
  angular: { bg: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: 'rgba(239, 68, 68, 0.25)' },
  react: { bg: 'rgba(6, 182, 212, 0.1)', color: '#0e7490', border: 'rgba(6, 182, 212, 0.25)' },
  design: { bg: 'rgba(236, 72, 153, 0.1)', color: '#be185d', border: 'rgba(236, 72, 153, 0.25)' },
  flutter: { bg: 'rgba(2, 132, 199, 0.1)', color: '#0369a1', border: 'rgba(2, 132, 199, 0.25)' },
  python: { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: 'rgba(245, 158, 11, 0.25)' },
  qa: { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)' },
  frontend: { bg: 'rgba(6, 182, 212, 0.1)', color: '#0e7490', border: 'rgba(6, 182, 212, 0.25)' },
};

export default function DeliveryHeadDashboard({
  currentUser,
  onSelectProject,
  onOpenScorecard,
  onTriggerCreateProject,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pmRevenue'); // 'pmRevenue' | 'teamMatrix'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [expandedPMIds, setExpandedPMIds] = useState(new Set());

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/delivery-head/summary`);
      if (!res.ok) throw new Error('Failed to load executive delivery dashboard.');
      const json = await res.json();
      setData(json);
      // Auto-expand the top PM by default
      if (json.pmLeaderboard && json.pmLeaderboard.length > 0) {
        setExpandedPMIds(new Set([json.pmLeaderboard[0]._id]));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const togglePMExpanded = (pmId) => {
    setExpandedPMIds(prev => {
      const next = new Set(prev);
      if (next.has(pmId)) next.delete(pmId);
      else next.add(pmId);
      return next;
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredProjects = (data?.projects || []).filter(proj => {
    const matchesSearch = proj.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj.leadPM?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (proj.techTeams || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatusFilter === 'All' || proj.status === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTeamMembers = (data?.teamMembersMatrix || []).filter(member => {
    const matchesSearch = member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedDeptFilter === 'All') return matchesSearch;
    const r = (member.role || '').toLowerCase();
    const matchesDept = selectedDeptFilter === 'QA' ? r.includes('qa') || r.includes('quality') || r.includes('tester')
      : selectedDeptFilter === 'PM' ? r.includes('pm') || r.includes('pc') || r.includes('manager') || r.includes('coordinator')
      : selectedDeptFilter === 'Android' ? r.includes('android')
      : selectedDeptFilter === 'iOS' ? r.includes('ios')
      : selectedDeptFilter === 'Backend' ? r.includes('backend') || r.includes('node') || r.includes('python')
      : selectedDeptFilter === 'Design' ? r.includes('design')
      : true;

    return matchesSearch && matchesDept;
  });

  const kpis = data?.globalKPIs || {};

  return (
    <div style={styles.container} className="fade-in">
      {/* 1. Executive Operations Header */}
      <div style={styles.headerCard} className="glass">
        <div style={styles.headerLeft}>
          <h1 style={styles.headerTitle}>Operations & Revenue Command</h1>
        </div>

        <div style={styles.headerRight}>
          <button 
            type="button" 
            onClick={fetchSummary}
            style={styles.refreshBtn}
            title="Refresh Live Metrics"
          >
            🔄 Sync Data
          </button>
          {['PM', 'Project Manager (PM)', 'CEO', 'Delivery Head'].includes(currentUser?.role) && (
            <button 
              type="button" 
              onClick={onTriggerCreateProject}
              style={styles.createProjectBtn}
            >
              + New Project
            </button>
          )}
        </div>
      </div>

      {/* 2. 3D Floating KPI Summary Cards */}
      <div style={styles.kpiGrid}>
        {/* KPI 1: Active Portfolio */}
        <div style={styles.kpiCard} className="hover-card">
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTag}>PORTFOLIO</span>
          </div>
          <div style={styles.kpiValue}>{kpis.totalProjects ?? 0}</div>
          <div style={styles.kpiSub}>
            <span style={{ color: '#059669', fontWeight: '700' }}>{kpis.liveProjectsCount ?? 0} Live</span>
            <span style={{ margin: '0 6px', color: '#cbd5e1' }}>•</span>
            <span style={{ color: '#2563eb', fontWeight: '600' }}>{kpis.inProgressProjectsCount ?? 0} In Progress</span>
          </div>
        </div>

        {/* KPI 2: Revenue Pipeline */}
        <div style={styles.kpiCard} className="hover-card">
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTag}>PIPELINE REVENUE</span>
          </div>
          <div style={{ ...styles.kpiValue, color: '#059669' }}>
            ${(kpis.totalRevenuePipeline ?? 0).toLocaleString()}
          </div>
          <div style={styles.kpiSub}>Contracted across all running projects</div>
        </div>

        {/* KPI 3: Financial Health */}
        <div style={styles.kpiCard} className="hover-card">
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTag}>COLLECTIONS</span>
          </div>
          <div style={{ ...styles.kpiValue, color: '#2563eb' }}>
            ${(kpis.totalPaymentReceived ?? 0).toLocaleString()}
          </div>
          <div style={styles.kpiSub}>
            Pending Balance: <strong style={{ color: '#dc2626' }}>${(kpis.totalPendingPayment ?? 0).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* 3. Interactive View Switcher Tabs */}
      <div style={styles.tabsBar}>
        <button
          type="button"
          onClick={() => setActiveTab('pmRevenue')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'pmRevenue' ? styles.tabBtnActive : {})
          }}
        >
          PM Revenue & Project Leaderboard ({data?.pmLeaderboard?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teamMatrix')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'teamMatrix' ? styles.tabBtnActive : {})
          }}
        >
          Cross-Project Team Matrix ({data?.teamMembersMatrix?.length || 0})
        </button>
      </div>

      {/* 4. Tab Content Area */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>
            Aggregating executive operations & financial data...
          </div>
        </div>
      ) : error ? (
        <div style={styles.errorBox}>
          <span style={{ fontSize: '28px' }}>⚠️</span>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#dc2626' }}>{error}</div>
        </div>
      ) : (
        <>
          {/* TAB 1: PM REVENUE LEADERBOARD */}
          {activeTab === 'pmRevenue' && (
            <div style={styles.tabContent}>
              <div style={styles.pmLeaderboardList}>
                {(data?.pmLeaderboard || []).map((pm, idx) => {
                  const isExpanded = expandedPMIds.has(pm._id);
                  const paidPct = pm.totalRevenue > 0 ? Math.round((pm.paymentReceived / pm.totalRevenue) * 100) : 0;

                  return (
                    <div key={pm._id} style={styles.pmLeaderCard} className="hover-card">
                      {/* PM Header Row */}
                      <div style={styles.pmHeaderRow} onClick={() => togglePMExpanded(pm._id)}>
                        <div style={styles.pmRankBadge}>#{idx + 1}</div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={styles.pmLeadName}>{pm.name}</h3>
                            <span style={styles.pmRoleTag}>{pm.role}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {pm.email} • <strong>{pm.projectsCount}</strong> Projects ({pm.liveCount} Live)
                          </div>
                        </div>

                        {/* Revenue Metrics Row */}
                        <div style={styles.pmRevenueMetrics}>
                          <div style={styles.pmRevCol}>
                            <div style={styles.pmRevLabel}>TOTAL REVENUE</div>
                            <div style={styles.pmRevVal}>${pm.totalRevenue.toLocaleString()}</div>
                          </div>
                          <div style={styles.pmRevCol}>
                            <div style={styles.pmRevLabel}>COLLECTED</div>
                            <div style={{ ...styles.pmRevVal, color: '#059669' }}>${pm.paymentReceived.toLocaleString()}</div>
                          </div>
                          <div style={styles.pmRevCol}>
                            <div style={styles.pmRevLabel}>PENDING</div>
                            <div style={{ ...styles.pmRevVal, color: pm.pendingPayment > 0 ? '#dc2626' : '#64748b' }}>
                              ${pm.pendingPayment.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenScorecard) onOpenScorecard(pm);
                            }}
                            style={styles.pmScorecardBtn}
                            title="View PM Performance Scorecard"
                          >
                            Scorecard ↗
                          </button>
                          <button
                            type="button"
                            style={styles.accordionToggleBtn}
                            title={isExpanded ? "Collapse Projects" : "Expand Projects"}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>

                      {/* Expanding Project Breakdown Drawer */}
                      {isExpanded && (
                        <div style={styles.pmProjectsDrawer}>
                          <div style={styles.drawerTitle}>
                            Projects Generating Revenue for {pm.name}:
                          </div>

                          {(pm.projects || []).length === 0 ? (
                            <div style={{ padding: '12px', color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>
                              No active projects currently assigned to this PM.
                            </div>
                          ) : (
                            <div style={styles.drawerTable}>
                              <div style={styles.drawerTableHead}>
                                <div style={{ flex: 2 }}>PROJECT</div>
                                <div style={{ flex: 1 }}>STATUS</div>
                                <div style={{ flex: 1.2 }}>TARGET DELIVERY</div>
                                <div style={{ flex: 1.2, textAlign: 'right' }}>REVENUE</div>
                                <div style={{ flex: 1.2, textAlign: 'right' }}>COLLECTED</div>
                                <div style={{ flex: 1.2, textAlign: 'right' }}>PENDING</div>
                                <div style={{ flex: 1.2, textAlign: 'right' }}>ACTION</div>
                              </div>

                              {pm.projects.map(proj => {
                                const stStyle = getStatusBadgeStyle(proj.status);
                                return (
                                  <div key={proj._id} style={styles.drawerTableRow}>
                                    <div style={{ flex: 2, fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{proj.name}</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <span 
                                        style={{ 
                                          ...styles.statusBadgeSmall,
                                          backgroundColor: stStyle.bg,
                                          color: stStyle.color,
                                          border: `1px solid ${stStyle.border}`
                                        }}
                                      >
                                        {proj.status}
                                      </span>
                                    </div>
                                    <div style={{ flex: 1.2, fontSize: '12px', color: '#64748b' }}>
                                      {formatDate(proj.deliveryDate)}
                                    </div>
                                    <div style={{ flex: 1.2, textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                                      ${(proj.totalRevenue || 0).toLocaleString()}
                                    </div>
                                    <div style={{ flex: 1.2, textAlign: 'right', color: '#059669', fontWeight: '600' }}>
                                      ${(proj.paymentReceived || 0).toLocaleString()}
                                    </div>
                                    <div style={{ flex: 1.2, textAlign: 'right', color: (proj.pendingPayment || 0) > 0 ? '#dc2626' : '#64748b' }}>
                                      ${(proj.pendingPayment || 0).toLocaleString()}
                                    </div>
                                    <div style={{ flex: 1.2, textAlign: 'right' }}>
                                      <button
                                        type="button"
                                        onClick={() => onSelectProject(proj._id)}
                                        style={styles.openBoardBtnTiny}
                                      >
                                        Open Board ↗
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TEAM PERFORMANCE MATRIX */}
          {activeTab === 'teamMatrix' && (
            <div style={styles.tabContent}>
              {/* Department Filter Bar */}
              <div style={styles.controlsBar}>
                <div style={styles.searchBox}>
                  <span style={{ color: '#94a3b8' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search member by name, role, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>

                <div style={styles.filterGroup}>
                  {['All', 'PM', 'QA', 'Android', 'iOS', 'Backend', 'Design'].map(dept => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setSelectedDeptFilter(dept)}
                      style={{
                        ...styles.filterPill,
                        ...(selectedDeptFilter === dept ? styles.filterPillActive : {})
                      }}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Members Matrix Grid */}
              <div style={styles.matrixGrid}>
                {filteredTeamMembers.length === 0 ? (
                  <div style={styles.emptyState}>No team members match the search query or department filter.</div>
                ) : (
                  filteredTeamMembers.map(member => (
                    <div 
                      key={member._id} 
                      style={styles.memberMatrixCard}
                      className="hover-card"
                      onClick={() => onOpenScorecard && onOpenScorecard(member)}
                      title="Click to view detailed Performance Scorecard"
                    >
                      <div style={styles.matrixCardTop}>
                        <div style={styles.matrixAvatar}>
                          {getInitials(member.name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={styles.matrixMemberName}>{member.name}</h4>
                          <div style={styles.matrixMemberRole}>{member.role}</div>
                          <div style={styles.matrixMemberEmail}>{member.email}</div>
                        </div>
                      </div>

                      <div style={styles.matrixAssignedSection}>
                        <div style={styles.matrixProjectsLabel}>
                          ASSIGNED TO ({member.projectsCount} {member.projectsCount === 1 ? 'PROJECT' : 'PROJECTS'}):
                        </div>
                        <div style={styles.matrixProjectsList}>
                          {(member.projects || []).length === 0 ? (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No active projects</span>
                          ) : (
                            (member.projects || []).map(p => (
                              <span key={p._id} style={styles.matrixProjBadge}>
                                {p.name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div style={styles.matrixCardFooter}>
                        <span style={styles.viewScorecardLink}>
                          View Full Scorecard & Pass Rate ➔
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '28px 36px 60px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '1600px',
    margin: '0 auto',
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  headerCard: {
    padding: '16px 24px',
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: '0 8px 24px -8px rgba(15, 23, 42, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  refreshBtn: {
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  createProjectBtn: {
    padding: '6px 14px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: 'var(--accent-blue)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(30, 58, 138, 0.2)',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  kpiCard: {
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: '0 8px 20px -6px rgba(15, 23, 42, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  kpiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  kpiTag: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.5px',
  },
  kpiValue: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: '1.2',
  },
  kpiSub: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '1px',
  },
  tabsBar: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '8px',
  },
  tabBtn: {
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    fontWeight: '700',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  controlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '6px 12px',
    width: '320px',
    maxWidth: '100%',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '12px',
    width: '100%',
    color: '#0f172a',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  filterGroup: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  filterPill: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterPillActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderColor: '#0f172a',
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '18px',
  },
  projectCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: '0 10px 25px -8px rgba(15, 23, 42, 0.06)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  projCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
  },
  projPriorityBadge: {
    fontSize: '10px',
    fontWeight: '800',
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  projName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    lineHeight: '1.3',
  },
  projDeadline: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  statusBadgeSmall: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'inline-flex',
    alignItems: 'center',
    textTransform: 'uppercase',
  },
  livePulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    animation: 'pulse 1.5s infinite',
  },
  fieldLabel: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  pmLeadRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  pmBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 8px',
    borderRadius: '6px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    flex: 1,
  },
  pmAvatarTiny: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pmNameText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#0f172a',
  },
  techTagsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  tagBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 7px',
    borderRadius: '5px',
    letterSpacing: '0.3px',
  },
  teamMembersSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  teamAvatarsList: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  },
  memberAvatarCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px solid #ffffff',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  moreMembersCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #ffffff',
  },
  financialSection: {
    backgroundColor: '#f8fafc',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #f1f5f9',
  },
  finProgressTrack: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  finProgressFill: {
    height: '100%',
    borderRadius: '3px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '10px',
    borderTop: '1px solid #f1f5f9',
  },
  ticketsSummaryText: {
    fontSize: '11px',
    color: '#64748b',
  },
  openBoardBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    border: '1px solid rgba(30, 58, 138, 0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  openBoardBtnTiny: {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    border: '1px solid rgba(30, 58, 138, 0.2)',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  pmIntroNotice: {
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  pmLeaderboardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  pmLeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: '0 10px 25px -8px rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
  },
  pmHeaderRow: {
    padding: '18px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
    flexWrap: 'wrap',
  },
  pmRankBadge: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#94a3b8',
    width: '28px',
  },
  pmAvatarMed: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pmLeadName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  pmRoleTag: {
    fontSize: '10px',
    fontWeight: '700',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#b45309',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  pmRevenueMetrics: {
    display: 'flex',
    gap: '24px',
    marginLeft: 'auto',
  },
  pmRevCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: '100px',
  },
  pmRevLabel: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: '0.5px',
  },
  pmRevVal: {
    fontSize: '16px',
    fontWeight: '800',
    color: '#0f172a',
  },
  pmScorecardBtn: {
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--accent-blue)',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    border: '1px solid rgba(30, 58, 138, 0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  accordionToggleBtn: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
  },
  pmProjectsDrawer: {
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #f1f5f9',
    padding: '16px 24px',
  },
  drawerTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569',
    marginBottom: '10px',
  },
  drawerTable: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  drawerTableHead: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    backgroundColor: '#f1f5f9',
    fontSize: '10px',
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #e2e8f0',
  },
  drawerTableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '13px',
  },
  matrixGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  memberMatrixCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: '0 8px 20px -6px rgba(15, 23, 42, 0.05)',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  matrixCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  matrixAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixMemberName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  matrixMemberRole: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  matrixMemberEmail: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  matrixAssignedSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  matrixProjectsLabel: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: '0.4px',
  },
  matrixProjectsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  matrixProjBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(30, 58, 138, 0.06)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(30, 58, 138, 0.15)',
  },
  matrixCardFooter: {
    paddingTop: '8px',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  viewScorecardLink: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--accent-blue)',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#94a3b8',
    fontStyle: 'italic',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    gridColumn: '1 / -1',
  },
  loadingBox: {
    padding: '80px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e2e8f0',
    borderTopColor: 'var(--accent-blue)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorBox: {
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fecaca',
  },
};
