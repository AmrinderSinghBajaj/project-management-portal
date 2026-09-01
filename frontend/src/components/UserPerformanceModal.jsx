import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getRoleBadgeStyle = (role) => {
  if (!role) return { bg: 'rgba(148, 163, 184, 0.12)', color: '#475569', border: 'rgba(148, 163, 184, 0.25)' };
  const r = role.toLowerCase();
  if (r.includes('pm') || r.includes('pc') || r.includes('ceo') || r.includes('delivery')) {
    return { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: 'rgba(245, 158, 11, 0.25)' };
  }
  if (r.includes('qa') || r.includes('tester') || r.includes('quality')) {
    return { bg: 'rgba(16, 185, 129, 0.1)', color: '#047857', border: 'rgba(16, 185, 129, 0.25)' };
  }
  return { bg: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8', border: 'rgba(37, 99, 235, 0.25)' };
};

export default function UserPerformanceModal({ userId, userEmail, userName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);
      setError('');
      try {
        const identifier = userId || userEmail || userName;
        if (!identifier) throw new Error('No user identifier provided.');

        const res = await fetch(`${API_BASE}/users/${encodeURIComponent(identifier)}/performance`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to load performance scorecard.');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [userId, userEmail, userName]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const member = data?.user || { name: userName, email: userEmail, role: 'Member' };
  const metrics = data?.metrics || {};
  const roleLower = (member.role || '').toLowerCase();
  const isQA = roleLower.includes('qa') || roleLower.includes('quality') || roleLower.includes('tester');
  const isManager = roleLower.includes('pm') || roleLower.includes('pc') || roleLower.includes('ceo') || roleLower.includes('delivery') || roleLower.includes('manager');

  const roleStyle = getRoleBadgeStyle(member.role);

  const hasActivity = isQA 
    ? (metrics.qa?.verifiedCount > 0 || metrics.qa?.bugsCaughtCount > 0)
    : isManager 
      ? (metrics.manager?.ticketsCreatedCount > 0 || metrics.manager?.projectsCount > 0)
      : (metrics.developer?.deliveredCount > 0 || metrics.developer?.reopenedCount > 0);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} className="fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={styles.header}>
          <div style={styles.userProfileHeader}>
            <div style={styles.avatar}>
              {getInitials(member.name || member.email)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={styles.userNameTitle}>{member.name || 'Team Member'}</h2>
                <span 
                  style={{ 
                    ...styles.roleBadge, 
                    backgroundColor: roleStyle.bg, 
                    color: roleStyle.color,
                    border: `1px solid ${roleStyle.border}`
                  }}
                >
                  {member.role || 'Member'}
                </span>
              </div>
              <div style={styles.userEmailText}>{member.email || 'No email registered'}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} title="Close">×</button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
              Calculating performance metrics...
            </div>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
            <div style={{ fontWeight: '600', color: '#dc2626', fontSize: '14px' }}>Unable to load metrics</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{error}</div>
          </div>
        ) : (
          <div style={styles.bodyContent}>
            {/* Empty stats notice if no activity recorded yet */}
            {!hasActivity && (
              <div style={styles.emptyStateNotice}>
                <span style={{ fontSize: '20px' }}>🎯</span>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                    Ready for Active Assignments
                  </div>
                  <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', lineHeight: '1.4' }}>
                    Quality pass rate and velocity metrics will automatically track here as tickets are moved and reviewed.
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards Grid (3 High-Impact Stat Cards) */}
            <div style={styles.kpiGrid}>
              {isQA ? (
                <>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>QA ACCURACY</div>
                    <div style={{ ...styles.kpiValue, color: metrics.qa?.verifiedCount > 0 ? (metrics.qa?.accuracyPercent >= 90 ? '#059669' : '#d97706') : '#64748b' }}>
                      {metrics.qa?.verifiedCount > 0 ? `${metrics.qa.accuracyPercent}%` : '—'}
                    </div>
                    <div style={styles.kpiSub}>{metrics.qa?.verifiedCount > 0 ? 'Leakage-free rate' : 'No tickets tested yet'}</div>
                  </div>

                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>VERIFIED / PASSED</div>
                    <div style={{ ...styles.kpiValue, color: '#2563eb' }}>
                      {metrics.qa?.verifiedCount ?? 0}
                    </div>
                    <div style={styles.kpiSub}>Moved to Tested / Live</div>
                  </div>

                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>BUGS CAUGHT</div>
                    <div style={{ ...styles.kpiValue, color: '#7c3aed' }}>
                      {metrics.qa?.bugsCaughtCount ?? 0}
                    </div>
                    <div style={styles.kpiSub}>Returned to Devs</div>
                  </div>
                </>
              ) : isManager ? (
                <>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>TICKETS SCOPED</div>
                    <div style={{ ...styles.kpiValue, color: '#2563eb' }}>
                      {metrics.manager?.ticketsCreatedCount ?? 0}
                    </div>
                    <div style={styles.kpiSub}>Created across projects</div>
                  </div>

                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>PROJECTS MANAGED</div>
                    <div style={{ ...styles.kpiValue, color: '#059669' }}>
                      {metrics.manager?.projectsCount ?? 0}
                    </div>
                    <div style={styles.kpiSub}>{metrics.manager?.liveProjectsCount ?? 0} Live Deliveries</div>
                  </div>

                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>REVENUE MANAGED</div>
                    <div style={{ ...styles.kpiValue, color: '#059669' }}>
                      ${(metrics.manager?.totalRevenueManaged ?? 0).toLocaleString()}
                    </div>
                    <div style={styles.kpiSub}>Financial oversight</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>PASS RATE</div>
                    <div style={{ ...styles.kpiValue, color: metrics.developer?.deliveredCount > 0 ? (metrics.developer?.passRatePercent >= 90 ? '#059669' : '#d97706') : '#64748b' }}>
                      {metrics.developer?.deliveredCount > 0 ? `${metrics.developer.passRatePercent}%` : '—'}
                    </div>
                    <div style={styles.kpiSub}>{metrics.developer?.deliveredCount > 0 ? 'First-time QA pass' : 'No tickets delivered yet'}</div>
                  </div>

                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>DELIVERED TO QA</div>
                    <div style={{ ...styles.kpiValue, color: '#2563eb' }}>
                      {metrics.developer?.deliveredCount ?? 0}
                    </div>
                    <div style={styles.kpiSub}>Ready for Testing</div>
                  </div>

                  <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>QA REOPENS</div>
                    <div style={{ ...styles.kpiValue, color: (metrics.developer?.reopenedCount ?? 0) > 0 ? '#dc2626' : '#64748b' }}>
                      {metrics.developer?.reopenedCount ?? 0}
                    </div>
                    <div style={styles.kpiSub}>Bugs returned</div>
                  </div>
                </>
              )}
            </div>

            {/* Quality Health Meter */}
            {!isManager && hasActivity && (
              <div style={styles.healthMeterBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={styles.sectionHeading}>
                    {isQA ? 'QA Testing Accuracy' : 'Code Quality & First-Time Pass Rate'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: (isQA ? (metrics.qa?.accuracyPercent ?? 100) : (metrics.developer?.passRatePercent ?? 100)) >= 90 ? '#059669' : '#d97706' }}>
                    {(isQA ? (metrics.qa?.accuracyPercent ?? 100) : (metrics.developer?.passRatePercent ?? 100))}%
                  </span>
                </div>
                <div style={styles.progressBarTrack}>
                  <div 
                    style={{
                      ...styles.progressBarFill,
                      width: `${Math.min(100, Math.max(5, isQA ? (metrics.qa?.accuracyPercent ?? 100) : (metrics.developer?.passRatePercent ?? 100)))}%`,
                      backgroundColor: (isQA ? (metrics.qa?.accuracyPercent ?? 100) : (metrics.developer?.passRatePercent ?? 100)) >= 90 ? '#10b981' : '#f59e0b'
                    }} 
                  />
                </div>
              </div>
            )}

            {/* Recent Activity Feed */}
            <div style={styles.activitySection}>
              <div style={styles.sectionHeading}>Recent Movement & Activity Logs</div>
              <div style={styles.activityList}>
                {(data.recentActivities || []).length === 0 ? (
                  <div style={styles.emptyActivityText}>No recent movements logged for this member yet.</div>
                ) : (
                  data.recentActivities.map((act, idx) => (
                    <div key={idx} style={styles.activityRow}>
                      <div style={styles.activityDot} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={styles.activityTaskTitle}>{act.ticketTask}</span>
                          <span style={styles.activityTime}>{formatDate(act.timestamp)}</span>
                        </div>
                        <div style={styles.activityActionText}>
                          <span style={styles.activityProjectBadge}>{act.projectName}</span>
                          <span>{act.action}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    width: '600px',
    maxWidth: '92vw',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85vh',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#ffffff',
  },
  userProfileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    minWidth: 0,
  },
  avatar: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '17px',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)',
  },
  userNameTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    lineHeight: '1.2',
  },
  roleBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 10px',
    borderRadius: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
  },
  userEmailText: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '3px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    lineHeight: 1,
  },
  loadingContainer: {
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: 'var(--accent-blue)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    padding: '50px 20px',
    textAlign: 'center',
  },
  bodyContent: {
    padding: '20px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  emptyStateNotice: {
    padding: '14px 16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px',
  },
  kpiCard: {
    padding: '14px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  kpiLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.5px',
  },
  kpiValue: {
    fontSize: '22px',
    fontWeight: '800',
    lineHeight: '1.2',
  },
  kpiSub: {
    fontSize: '10px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  healthMeterBox: {
    padding: '14px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
  },
  sectionHeading: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#334155',
  },
  progressBarTrack: {
    width: '100%',
    height: '7px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.4s ease',
  },
  activitySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  activityList: {
    maxHeight: '190px',
    overflowY: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
  },
  activityRow: {
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid #f1f5f9',
  },
  activityDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    flexShrink: 0,
  },
  activityTaskTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '320px',
  },
  activityTime: {
    fontSize: '10px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  activityActionText: {
    fontSize: '11px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '2px',
  },
  activityProjectBadge: {
    fontSize: '10px',
    fontWeight: '700',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    color: 'var(--accent-blue)',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  emptyActivityText: {
    padding: '24px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
};
