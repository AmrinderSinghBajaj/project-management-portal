import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../config';

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

const isPMRole = (role) => {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes('pm') || r.includes('project manager') || r.includes('pc') || r.includes('project coordinator');
};

const isQARole = (role) => {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes('qa') || r.includes('quality') || r.includes('tester');
};

const PAGE_SIZE = 8;

export default function UserPerformanceModal({ userId, userEmail, userName, currentUser, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCard, setActiveCard] = useState(null); // null = compact, or 'allocated', 'resolved', etc.
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);
      setError('');
      try {
        const identifier = userId || userEmail || userName;
        if (!identifier) throw new Error('No user identifier provided.');

        const token = localStorage.getItem('pm_token') || localStorage.getItem('token');
        const auth = currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pm_user') || localStorage.getItem('user') || '{}') : {});
        const reqEmail = auth?.email || '';
        const reqRole = auth?.role || '';

        const headers = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        if (reqEmail) {
          headers['x-requester-email'] = reqEmail;
        }
        if (reqRole) {
          headers['x-requester-role'] = reqRole;
        }

        const queryParams = new URLSearchParams();
        if (reqEmail) queryParams.append('requesterEmail', reqEmail);
        if (reqRole) queryParams.append('requesterRole', reqRole);

        const queryString = queryParams.toString();
        const url = `${API_BASE}/users/${encodeURIComponent(identifier)}/performance${queryString ? `?${queryString}` : ''}`;

        const res = await fetch(url, { headers });
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
  }, [userId, userEmail, userName, currentUser]);

  // Reset page & filters when active card changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setSelectedProject('ALL');
  }, [activeCard]);

  const member = data?.user || { name: userName, email: userEmail, role: 'Member' };
  const isPM = isPMRole(member.role);
  const isQA = isQARole(member.role);
  const authUser = currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pm_user') || localStorage.getItem('user') || '{}') : {});
  const userRole = (authUser?.role || '').toLowerCase();
  const canViewAvgTime = Boolean(userRole.includes('delivery') || userRole.includes('ceo'));
  const isDeliveryHead = canViewAvgTime;
  const metrics = data?.metrics || {};

  const managerMetrics = metrics.manager || {
    ticketsCreatedCount: 0,
    totalRevenueGenerated: 0,
    paymentReceived: 0,
    pendingRevenue: 0,
    createdTickets: [],
    projects: []
  };

  const qaMetrics = metrics.qa || {
    score: 100,
    defectCatchingRate: 100,
    signOffAccuracy: 100,
    testingVelocity: 100,
    testedCount: 0,
    bugsCaughtCount: 0,
    sentBackCount: 0,
    leakedBugsCount: 0,
    postReleaseReopensCount: 0,
    readyQueueCount: 0,
    details: {
      tested: [],
      bugsCaught: [],
      sentBack: [],
      leakedBugs: [],
      postReleaseReopens: []
    }
  };
  const qaDetails = qaMetrics.details || {};

  const scorecard = metrics.scorecard || {
    totalAllocated: metrics.developer?.deliveredCount || 0,
    totalResolved: metrics.developer?.deliveredCount || 0,
    totalReopened: metrics.developer?.reopenedCount || 0,
    totalMissedDeadlines: 0,
    reopenedPercentage: 0,
    details: {}
  };

  const details = scorecard.details || {
    allocated: [],
    resolved: [],
    reopened: [],
    missedDeadlines: []
  };

  const reopenedRate = scorecard.reopenedPercentage ?? 0;
  const missedCount = scorecard.totalMissedDeadlines ?? 0;
  const totalAllocated = scorecard.totalAllocated || 0;
  const totalResolved = scorecard.totalResolved || 0;
  const totalReopened = scorecard.totalReopened || 0;

  // Calculate Performance Percentage & Breakdown Formula
  const perfData = useMemo(() => {
    if (isPM) {
      const totalRev = Number(managerMetrics.totalRevenueGenerated || 0);
      const paidRev = Number(managerMetrics.paymentReceived || 0);
      const score = totalRev <= 0 ? 100 : Math.min(100, Math.max(0, Math.round((paidRev / totalRev) * 100)));
      return {
        score,
        totalRev,
        paidRev
      };
    }

    if (isQA) {
      const tested = qaMetrics.testedCount || 0;
      const bugs = qaMetrics.bugsCaughtCount || 0;
      const leaked = qaMetrics.leakedBugsCount || 0;
      const reopens = qaMetrics.postReleaseReopensCount || 0;
      const readyQueue = qaMetrics.readyQueueCount || 0;

      const totalBugs = bugs + leaked;
      const defectCatching = totalBugs > 0 ? Math.round((bugs / totalBugs) * 100) : 100;
      const signOffAcc = tested > 0 ? Math.max(0, Math.round((1 - (reopens / tested)) * 100)) : 100;
      const totalDemand = tested + readyQueue;
      const velocity = totalDemand > 0 ? Math.round((tested / totalDemand) * 100) : 100;

      const score = qaMetrics.score !== undefined ? qaMetrics.score : Math.round((0.40 * defectCatching) + (0.35 * signOffAcc) + (0.25 * velocity));

      return {
        score,
        defectCatchingRate: defectCatching,
        signOffAccuracy: signOffAcc,
        testingVelocity: velocity,
        testedCount: tested,
        bugsCaughtCount: bugs,
        leakedBugsCount: leaked,
        postReleaseReopensCount: reopens,
        totalBugs,
        totalDemand
      };
    }

    if (totalAllocated === 0) {
      return {
        score: 100,
        completionRate: 100,
        qualityRate: 100,
        onTimeRate: 100
      };
    }

    const completionRate = Math.min(100, Math.max(0, Math.round((totalResolved / totalAllocated) * 100)));
    const qualityRate = Math.min(100, Math.max(0, Math.round((1 - (totalReopened / totalAllocated)) * 100)));
    const onTimeRate = Math.min(100, Math.max(0, Math.round((1 - (missedCount / totalAllocated)) * 100)));

    const calculated = (0.40 * completionRate) + (0.35 * qualityRate) + (0.25 * onTimeRate);
    const score = Math.min(100, Math.max(0, Math.round(calculated)));

    return {
      score,
      completionRate,
      qualityRate,
      onTimeRate
    };
  }, [isPM, isQA, managerMetrics, qaMetrics, totalAllocated, totalResolved, totalReopened, missedCount]);

  const roleStyle = getRoleBadgeStyle(member.role);

  const getTicketIdLabel = (id) => {
    if (!id) return '';
    const str = id.toString();
    return '#' + (str.length > 6 ? str.slice(-6).toUpperCase() : str.toUpperCase());
  };

  const handleCardClick = (cardKey) => {
    setActiveCard(prev => prev === cardKey ? null : cardKey);
  };

  // Determine active raw list based on selected card
  const activeRawList = useMemo(() => {
    if (!activeCard) return [];

    if (isPM) {
      if (activeCard === 'pmProjects') {
        return managerMetrics.projects || [];
      }
      return managerMetrics.createdTickets || [];
    }

    if (isQA) {
      switch (activeCard) {
        case 'qaTested':
          return qaDetails.tested || [];
        case 'qaBugsCaught':
          return qaDetails.bugsCaught || [];
        case 'qaSentBack':
          return qaDetails.sentBack || [];
        case 'qaLeakedBugs':
          return qaDetails.leakedBugs || [];
        case 'qaPostReleaseReopens':
          return qaDetails.postReleaseReopens || [];
        default:
          return [];
      }
    }

    switch (activeCard) {
      case 'resolved':
        return details.resolved || [];
      case 'reopened':
      case 'reopenedRate':
        return details.reopened || [];
      case 'missedDeadlines':
        return details.missedDeadlines || [];
      case 'timeSpent':
      case 'avgTime': {
        if (!canViewAvgTime) return [];
        const list = [...(details.timeSpent || [])];
        list.sort((a, b) => (b.totalSeconds || 0) - (a.totalSeconds || 0));
        return list.slice(0, 5);
      }
      case 'allocated':
      default:
        return details.allocated || [];
    }
  }, [activeCard, isPM, isQA, canViewAvgTime, details, managerMetrics, qaDetails]);

  // Extract all unique project names for dropdown
  const projectOptions = useMemo(() => {
    const set = new Set();
    activeRawList.forEach(t => {
      if (t.projectName) set.add(t.projectName);
      else if (t.name) set.add(t.name);
    });
    return Array.from(set).sort();
  }, [activeRawList]);

  // Filtered and searched list
  const filteredList = useMemo(() => {
    let list = activeRawList;

    if (selectedProject !== 'ALL') {
      list = list.filter(t => (t.projectName || t.name) === selectedProject);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(t => {
        const idStr = t.ticketId ? t.ticketId.toString().toLowerCase() : '';
        const taskStr = (t.task || t.name || '').toLowerCase();
        const projStr = (t.projectName || t.name || '').toLowerCase();
        const statusStr = (t.status || '').toLowerCase();
        const repStr = (t.reportedBy || '').toLowerCase();
        return idStr.includes(q) || taskStr.includes(q) || projStr.includes(q) || statusStr.includes(q) || repStr.includes(q);
      });
    }

    return list;
  }, [activeRawList, selectedProject, searchQuery]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  const activeCardTitles = {
    allocated: 'Tickets Received',
    resolved: 'Total Done / Resolved',
    reopened: 'Total Reopened',
    reopenedRate: 'Reopened Tickets',
    missedDeadlines: 'Tickets Missed Deadline',
    timeSpent: isQA ? 'Top 5 Longest QA Testing & Verification Tickets' : 'Top 5 Longest Resolution Tickets',
    avgTime: isQA ? 'Top 5 Longest QA Testing & Verification Tickets' : 'Top 5 Longest Resolution Tickets',
    pmTickets: 'Tickets Created by PM',
    pmProjects: 'Managed Projects Portfolio',
    qaTested: 'Tested & Delivered Tickets',
    qaBugsCaught: 'Bugs Caught by QA',
    qaSentBack: 'Tickets Returned to Devs for Fixes',
    qaLeakedBugs: 'Leaked Bugs (Missed by QA - Reported by PM/Client)',
    qaPostReleaseReopens: 'Post-Release Reopens (Escaped Defects)'
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div 
        style={{
          ...styles.modal,
          maxWidth: activeCard ? '1000px' : '880px',
          maxHeight: activeCard ? '88vh' : 'auto'
        }} 
        className="fade-in" 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* CLEAN TOP HEADER BAR */}
        <div style={styles.header}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={styles.userNameTitle}>{member.name || 'Team Member'}</h2>
              <span style={{ ...styles.roleBadge, backgroundColor: roleStyle.bg, color: roleStyle.color, borderColor: roleStyle.border }}>
                {member.role || 'Member'}
              </span>
            </div>
            {member.email && (
              <div style={styles.userSubText}>
                <span>{member.email}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="perf-score-tooltip-wrapper" style={styles.scoreContainer}>
              <span style={styles.scoreLabel}>PERFORMANCE</span>
              <span style={styles.scoreNumber}>{perfData.score}%</span>
              <span style={styles.infoCircle}>ⓘ</span>

              {/* Premium Light-Glass Tooltip Box */}
              <div className="perf-score-tooltip-box">
                <div className="perf-tt-header">
                  <div className="perf-tt-title-group">
                    <span className="perf-tt-title">
                      {isPM ? 'PM Formula Breakdown' : isQA ? 'QA Formula Breakdown' : 'Score Formula Breakdown'}
                    </span>
                    <span className="perf-tt-score-pill">{perfData.score}% Total</span>
                  </div>
                </div>
                
                {isPM ? (
                  <div className="perf-tt-body">
                    <div className="perf-tt-card">
                      <div className="perf-tt-card-top">
                        <span className="perf-tt-badge badge-blue">100% Weight</span>
                        <span className="perf-tt-metric-name">Payment Realization</span>
                        <span className="perf-tt-val">{perfData.score}%</span>
                      </div>
                      <div className="perf-tt-formula">(${perfData.paidRev?.toLocaleString() || 0} / ${perfData.totalRev?.toLocaleString() || 0}) × 100</div>
                    </div>
                  </div>
                ) : isQA ? (
                  <div className="perf-tt-body">
                    {/* QA Metric 1: Defect Catching */}
                    <div className="perf-tt-card">
                      <div className="perf-tt-card-top">
                        <span className="perf-tt-badge badge-blue">40% Weight</span>
                        <span className="perf-tt-metric-name">Defect Gatekeeping</span>
                        <span className="perf-tt-val">{perfData.defectCatchingRate}%</span>
                      </div>
                      <div className="perf-tt-formula">({perfData.bugsCaughtCount} Caught / {perfData.totalBugs} Total Bugs) × 100</div>
                    </div>

                    {/* QA Metric 2: Sign-off Accuracy */}
                    <div className="perf-tt-card">
                      <div className="perf-tt-card-top">
                        <span className="perf-tt-badge badge-green">35% Weight</span>
                        <span className="perf-tt-metric-name">Sign-Off Accuracy</span>
                        <span className="perf-tt-val">{perfData.signOffAccuracy}%</span>
                      </div>
                      <div className="perf-tt-formula">(1 - {perfData.postReleaseReopensCount} Reopened / {perfData.testedCount} Tested) × 100</div>
                    </div>

                    {/* QA Metric 3: Testing Velocity */}
                    <div className="perf-tt-card">
                      <div className="perf-tt-card-top">
                        <span className="perf-tt-badge badge-amber">25% Weight</span>
                        <span className="perf-tt-metric-name">Testing Velocity</span>
                        <span className="perf-tt-val">{perfData.testingVelocity}%</span>
                      </div>
                      <div className="perf-tt-formula">({perfData.testedCount} Tested / {perfData.totalDemand} Demand) × 100</div>
                    </div>
                  </div>
                ) : (
                  <div className="perf-tt-body">
                    {/* Metric 1 */}
                    <div className="perf-tt-card">
                      <div className="perf-tt-card-top">
                        <span className="perf-tt-badge badge-blue">40% Weight</span>
                        <span className="perf-tt-metric-name">Task Completion</span>
                        <span className="perf-tt-val">{perfData.completionRate}%</span>
                      </div>
                      <div className="perf-tt-formula">({totalResolved} Done / {totalAllocated} Received) × 100</div>
                    </div>

                    {/* Metric 2 */}
                    <div className="perf-tt-card">
                      <div className="perf-tt-card-top">
                        <span className="perf-tt-badge badge-green">35% Weight</span>
                        <span className="perf-tt-metric-name">Quality & Stability</span>
                        <span className="perf-tt-val">{perfData.qualityRate}%</span>
                      </div>
                      <div className="perf-tt-formula">(1 - {totalReopened} Reopened / {totalAllocated} Received) × 100</div>
                    </div>

                    {/* Metric 3 */}
                    <div className="perf-tt-card">
                      <div className="perf-tt-card-top">
                        <span className="perf-tt-badge badge-amber">25% Weight</span>
                        <span className="perf-tt-metric-name">On-Time Delivery</span>
                        <span className="perf-tt-val">{perfData.onTimeRate}%</span>
                      </div>
                      <div className="perf-tt-formula">(1 - {missedCount} Missed / {totalAllocated} Received) × 100</div>
                    </div>
                  </div>
                )}

                <div className="perf-tt-footer">
                  <div className="perf-tt-footer-label">Weighted Calculation Formula</div>
                  <div className="perf-tt-equation-box">
                    {isPM 
                      ? `(${perfData.paidRev} / ${perfData.totalRev}) × 100 = ${perfData.score}%`
                      : isQA
                      ? `(0.40 × ${perfData.defectCatchingRate}%) + (0.35 × ${perfData.signOffAccuracy}%) + (0.25 × ${perfData.testingVelocity}%) = ${perfData.score}%`
                      : `(0.40 × ${perfData.completionRate}%) + (0.35 × ${perfData.qualityRate}%) + (0.25 × ${perfData.onTimeRate}%) = ${perfData.score}%`
                    }
                  </div>
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} style={styles.closeBtn} title="Close">×</button>
          </div>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
              Calculating performance scorecard...
            </div>
          </div>
        ) : error ? (
          <div style={styles.errorContainer}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
            <div style={{ fontWeight: '600', color: '#dc2626', fontSize: '14px' }}>Unable to load metrics</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{error}</div>
          </div>
        ) : (
          <div style={styles.bodyContent}>
            
            {/* CLICKABLE EXECUTIVE METRIC BUTTONS / HERO CARDS */}
            {isPM ? (
              /* PM HERO CARDS (3 CARDS) */
              <div style={styles.heroGridPM}>
                {/* PM Card 1: Total Tickets Created */}
                <div 
                  style={{ 
                    ...styles.heroCard, 
                    borderColor: activeCard === 'pmTickets' ? '#1e3a8a' : '#bae6fd',
                    backgroundColor: activeCard === 'pmTickets' ? '#eff6ff' : '#ffffff',
                    boxShadow: activeCard === 'pmTickets' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                    transform: activeCard === 'pmTickets' ? 'translateY(-2px)' : 'none'
                  }}
                  onClick={() => handleCardClick('pmTickets')}
                  className="interactive-metric-card"
                  title="Click to view created tickets"
                >
                  <div style={styles.heroTitleRow}>
                    <span style={styles.heroTitle}>TOTAL TICKETS CREATED</span>
                    <span style={styles.cardClickHint}>{activeCard === 'pmTickets' ? '▲ Collapse' : '▼ View'}</span>
                  </div>
                  <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                    {managerMetrics.ticketsCreatedCount || 0}
                  </div>
                </div>

                {/* PM Card 2: Total Revenue Generated */}
                <div 
                  style={{ 
                    ...styles.heroCard, 
                    borderColor: activeCard === 'pmProjects' ? '#1e3a8a' : '#bae6fd',
                    backgroundColor: activeCard === 'pmProjects' ? '#eff6ff' : '#ffffff',
                    boxShadow: activeCard === 'pmProjects' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                    transform: activeCard === 'pmProjects' ? 'translateY(-2px)' : 'none'
                  }}
                  onClick={() => handleCardClick('pmProjects')}
                  className="interactive-metric-card"
                  title="Click to view managed projects financial breakdown"
                >
                  <div style={styles.heroTitleRow}>
                    <span style={styles.heroTitle}>TOTAL REVENUE GENERATED</span>
                    <span style={styles.cardClickHint}>{activeCard === 'pmProjects' ? '▲ Collapse' : '▼ View'}</span>
                  </div>
                  <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                    ${Number(managerMetrics.totalRevenueGenerated || 0).toLocaleString()}
                  </div>
                </div>

                {/* PM Card 3: Pending Revenue */}
                <div 
                  style={{ 
                    ...styles.heroCard, 
                    borderColor: activeCard === 'pmProjects' ? '#1e3a8a' : '#bae6fd',
                    backgroundColor: activeCard === 'pmProjects' ? '#eff6ff' : '#ffffff',
                    boxShadow: activeCard === 'pmProjects' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                    transform: activeCard === 'pmProjects' ? 'translateY(-2px)' : 'none'
                  }}
                  onClick={() => handleCardClick('pmProjects')}
                  className="interactive-metric-card"
                  title="Click to view pending collections"
                >
                  <div style={styles.heroTitleRow}>
                    <span style={styles.heroTitle}>PENDING REVENUE</span>
                    <span style={styles.cardClickHint}>{activeCard === 'pmProjects' ? '▲ Collapse' : '▼ View'}</span>
                  </div>
                  <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                    ${Number(managerMetrics.pendingRevenue || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : isQA ? (
              /* QA HERO CARDS (5 CARDS, 6 FOR DELIVERY HEAD / CEO) */
              <div style={{ ...styles.heroGridQA, gridTemplateColumns: canViewAvgTime ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)' }}>
                {/* QA Card 1: Tested & Delivered */}
                <div 
                  style={{ 
                    ...styles.heroCard, 
                    borderColor: activeCard === 'qaTested' ? '#1e3a8a' : '#bae6fd',
                    backgroundColor: activeCard === 'qaTested' ? '#eff6ff' : '#ffffff',
                    boxShadow: activeCard === 'qaTested' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                    transform: activeCard === 'qaTested' ? 'translateY(-2px)' : 'none'
                  }}
                  onClick={() => handleCardClick('qaTested')}
                  className="interactive-metric-card"
                  title="Click to view tested & delivered tickets"
                >
                  <div style={styles.heroTitleRow}>
                    <span style={styles.heroTitle}>TESTED & DELIVERED</span>
                    <span style={styles.cardClickHint}>{activeCard === 'qaTested' ? '▲' : '▼'}</span>
                  </div>
                  <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                    {qaMetrics.testedCount || 0}
                  </div>
                </div>

                {/* QA Card 2: Bugs Caught by QA */}
                <div 
                  style={{ 
                    ...styles.heroCard, 
                    borderColor: activeCard === 'qaBugsCaught' ? '#1e3a8a' : '#bae6fd',
                    backgroundColor: activeCard === 'qaBugsCaught' ? '#eff6ff' : '#ffffff',
                    boxShadow: activeCard === 'qaBugsCaught' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                    transform: activeCard === 'qaBugsCaught' ? 'translateY(-2px)' : 'none'
                  }}
                  onClick={() => handleCardClick('qaBugsCaught')}
                  className="interactive-metric-card"
                  title="Click to view bugs reported by QA"
                >
                  <div style={styles.heroTitleRow}>
                    <span style={styles.heroTitle}>BUGS CAUGHT</span>
                    <span style={styles.cardClickHint}>{activeCard === 'qaBugsCaught' ? '▲' : '▼'}</span>
                  </div>
                  <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                    {qaMetrics.bugsCaughtCount || 0}
                  </div>
                </div>

                {/* QA Card 3: Returned to Devs */}
                <div 
                  style={{ 
                    ...styles.heroCard, 
                    borderColor: activeCard === 'qaSentBack' ? '#1e3a8a' : '#bae6fd',
                    backgroundColor: activeCard === 'qaSentBack' ? '#eff6ff' : '#ffffff',
                    boxShadow: activeCard === 'qaSentBack' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                    transform: activeCard === 'qaSentBack' ? 'translateY(-2px)' : 'none'
                  }}
                  onClick={() => handleCardClick('qaSentBack')}
                  className="interactive-metric-card"
                  title="Click to view tickets returned to dev for fixes"
                >
                  <div style={styles.heroTitleRow}>
                    <span style={styles.heroTitle}>RETURNED TO DEVS</span>
                    <span style={styles.cardClickHint}>{activeCard === 'qaSentBack' ? '▲' : '▼'}</span>
                  </div>
                  <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                    {qaMetrics.sentBackCount || 0}
                  </div>
                </div>

                {/* QA Card 4: Leaked Bugs (Missed by QA) */}
                <div 
                  style={{ 
                    ...styles.heroCard, 
                    borderColor: activeCard === 'qaLeakedBugs' ? '#1e3a8a' : '#bae6fd',
                    backgroundColor: activeCard === 'qaLeakedBugs' ? '#eff6ff' : '#ffffff',
                    boxShadow: activeCard === 'qaLeakedBugs' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                    transform: activeCard === 'qaLeakedBugs' ? 'translateY(-2px)' : 'none'
                  }}
                  onClick={() => handleCardClick('qaLeakedBugs')}
                  className="interactive-metric-card"
                  title="Click to view bugs reported by PM/Client on QA assigned projects"
                >
                  <div style={styles.heroTitleRow}>
                    <span style={styles.heroTitle}>LEAKED BUGS</span>
                    <span style={styles.cardClickHint}>{activeCard === 'qaLeakedBugs' ? '▲' : '▼'}</span>
                  </div>
                  <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                    {qaMetrics.leakedBugsCount || 0}
                  </div>
                </div>

                {/* QA Card 5: Post-Release Reopens */}
                <div 
                  style={{ 
                    ...styles.heroCard, 
                    borderColor: activeCard === 'qaPostReleaseReopens' ? '#1e3a8a' : '#bae6fd',
                    backgroundColor: activeCard === 'qaPostReleaseReopens' ? '#eff6ff' : '#ffffff',
                    boxShadow: activeCard === 'qaPostReleaseReopens' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                    transform: activeCard === 'qaPostReleaseReopens' ? 'translateY(-2px)' : 'none'
                  }}
                  onClick={() => handleCardClick('qaPostReleaseReopens')}
                  className="interactive-metric-card"
                  title="Click to view tickets reopened after QA approval"
                >
                  <div style={styles.heroTitleRow}>
                    <span style={styles.heroTitle}>POST-APPROVAL REOPENS</span>
                    <span style={styles.cardClickHint}>{activeCard === 'qaPostReleaseReopens' ? '▲' : '▼'}</span>
                  </div>
                  <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                    {qaMetrics.postReleaseReopensCount || 0}
                  </div>
                </div>

                {/* QA Card 6: Average Time / Ticket (Strictly Delivery Head / CEO only) */}
                {canViewAvgTime && (
                  <div 
                    style={{ 
                      ...styles.heroCard, 
                      borderColor: activeCard === 'timeSpent' ? '#1e3a8a' : '#bae6fd',
                      backgroundColor: activeCard === 'timeSpent' ? '#eff6ff' : '#ffffff',
                      boxShadow: activeCard === 'timeSpent' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                      transform: activeCard === 'timeSpent' ? 'translateY(-2px)' : 'none'
                    }}
                    onClick={() => handleCardClick('timeSpent')}
                    className="interactive-metric-card"
                    title="Click to view QA testing & resolution time log"
                  >
                    <div style={styles.heroTitleRow}>
                      <span style={styles.heroTitle}>AVG TIME / TICKET</span>
                      <span style={styles.cardClickHint}>{activeCard === 'timeSpent' ? '▲' : '▼'}</span>
                    </div>
                    <div style={{ ...styles.heroMainValue, color: '#1e3a8a', fontSize: '24px' }}>
                      {scorecard.formattedAvgTime || metrics.developer?.formattedAvgTime || '0m'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* DEVELOPER HERO CARDS (5 CARDS, 6 FOR DELIVERY HEAD / CEO) */
              <>
                <div style={{ ...styles.heroGridDev, gridTemplateColumns: canViewAvgTime ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)' }}>
                  {/* Dev Card 1: Tickets Received */}
                  <div 
                    style={{ 
                      ...styles.heroCard, 
                      borderColor: activeCard === 'allocated' ? '#1e3a8a' : '#bae6fd',
                      backgroundColor: activeCard === 'allocated' ? '#eff6ff' : '#ffffff',
                      boxShadow: activeCard === 'allocated' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                      transform: activeCard === 'allocated' ? 'translateY(-2px)' : 'none'
                    }}
                    onClick={() => handleCardClick('allocated')}
                    className="interactive-metric-card"
                    title="Click to view all received/allocated tickets"
                  >
                    <div style={styles.heroTitleRow}>
                      <span style={styles.heroTitle}>TICKETS RECEIVED</span>
                      <span style={styles.cardClickHint}>{activeCard === 'allocated' ? '▲' : '▼'}</span>
                    </div>
                    <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                      {scorecard.totalAllocated || 0}
                    </div>
                  </div>

                  {/* Dev Card 2: Total Done */}
                  <div 
                    style={{ 
                      ...styles.heroCard, 
                      borderColor: activeCard === 'resolved' ? '#1e3a8a' : '#bae6fd',
                      backgroundColor: activeCard === 'resolved' ? '#eff6ff' : '#ffffff',
                      boxShadow: activeCard === 'resolved' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                      transform: activeCard === 'resolved' ? 'translateY(-2px)' : 'none'
                    }}
                    onClick={() => handleCardClick('resolved')}
                    className="interactive-metric-card"
                    title="Click to view done/resolved tickets"
                  >
                    <div style={styles.heroTitleRow}>
                      <span style={styles.heroTitle}>TOTAL DONE</span>
                      <span style={styles.cardClickHint}>{activeCard === 'resolved' ? '▲' : '▼'}</span>
                    </div>
                    <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                      {scorecard.totalResolved || 0}
                    </div>
                  </div>

                  {/* Dev Card 3: Total Reopened */}
                  <div 
                    style={{ 
                      ...styles.heroCard, 
                      borderColor: activeCard === 'reopened' ? '#1e3a8a' : '#bae6fd',
                      backgroundColor: activeCard === 'reopened' ? '#eff6ff' : '#ffffff',
                      boxShadow: activeCard === 'reopened' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                      transform: activeCard === 'reopened' ? 'translateY(-2px)' : 'none'
                    }}
                    onClick={() => handleCardClick('reopened')}
                    className="interactive-metric-card"
                    title="Click to view reopened tickets"
                  >
                    <div style={styles.heroTitleRow}>
                      <span style={styles.heroTitle}>TOTAL REOPENED</span>
                      <span style={styles.cardClickHint}>{activeCard === 'reopened' ? '▲' : '▼'}</span>
                    </div>
                    <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                      {scorecard.totalReopened || 0}
                    </div>
                  </div>

                  {/* Dev Card 4: Reopened Rate */}
                  <div 
                    style={{ 
                      ...styles.heroCard, 
                      borderColor: activeCard === 'reopenedRate' ? '#1e3a8a' : '#bae6fd',
                      backgroundColor: activeCard === 'reopenedRate' ? '#eff6ff' : '#ffffff',
                      boxShadow: activeCard === 'reopenedRate' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                      transform: activeCard === 'reopenedRate' ? 'translateY(-2px)' : 'none'
                    }}
                    onClick={() => handleCardClick('reopenedRate')}
                    className="interactive-metric-card"
                    title="Click to view reopened tickets"
                  >
                    <div style={styles.heroTitleRow}>
                      <span style={styles.heroTitle}>REOPENED RATE</span>
                      <span style={styles.cardClickHint}>{activeCard === 'reopenedRate' ? '▲' : '▼'}</span>
                    </div>
                    <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                      {reopenedRate}<span style={{ fontSize: '15px', fontWeight: '700', marginLeft: '2px' }}>%</span>
                    </div>
                  </div>

                  {/* Dev Card 5: Missed Deadlines */}
                  <div 
                    style={{ 
                      ...styles.heroCard, 
                      borderColor: activeCard === 'missedDeadlines' ? '#1e3a8a' : '#bae6fd',
                      backgroundColor: activeCard === 'missedDeadlines' ? '#eff6ff' : '#ffffff',
                      boxShadow: activeCard === 'missedDeadlines' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                      transform: activeCard === 'missedDeadlines' ? 'translateY(-2px)' : 'none'
                    }}
                    onClick={() => handleCardClick('missedDeadlines')}
                    className="interactive-metric-card"
                    title="Click to view missed deadline / overdue tickets"
                  >
                    <div style={styles.heroTitleRow}>
                      <span style={styles.heroTitle}>MISSED DEADLINE</span>
                      <span style={styles.cardClickHint}>{activeCard === 'missedDeadlines' ? '▲' : '▼'}</span>
                    </div>
                    <div style={{ ...styles.heroMainValue, color: '#1e3a8a' }}>
                      {missedCount}
                    </div>
                  </div>

                  {/* Dev Card 6: Average Time / Ticket (Strictly Delivery Head / CEO only) */}
                  {canViewAvgTime && (
                    <div 
                      style={{ 
                        ...styles.heroCard, 
                        borderColor: activeCard === 'timeSpent' ? '#1e3a8a' : '#bae6fd',
                        backgroundColor: activeCard === 'timeSpent' ? '#eff6ff' : '#ffffff',
                        boxShadow: activeCard === 'timeSpent' ? '0 4px 14px rgba(30, 58, 138, 0.2)' : styles.heroCard.boxShadow,
                        transform: activeCard === 'timeSpent' ? 'translateY(-2px)' : 'none'
                      }}
                      onClick={() => handleCardClick('timeSpent')}
                      className="interactive-metric-card"
                      title="Click to view development resolution time & session log"
                    >
                      <div style={styles.heroTitleRow}>
                        <span style={styles.heroTitle}>AVG TIME / TICKET</span>
                        <span style={styles.cardClickHint}>{activeCard === 'timeSpent' ? '▲' : '▼'}</span>
                      </div>
                      <div style={{ ...styles.heroMainValue, color: '#1e3a8a', fontSize: '24px' }}>
                        {scorecard.formattedAvgTime || metrics.developer?.formattedAvgTime || '0m'}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* EXPANDABLE ITEMIZE RECORD VIEWER (OPENS ON CLICK) */}
            {activeCard && (
              <div style={styles.expandedRecordPanel} className="fade-in">
                
                {/* Header with Search & Filter Controls */}
                <div style={styles.inspectorHeader}>
                  <div>
                    <div style={styles.inspectorTitle}>
                      📋 {activeCardTitles[activeCard] || 'Ticket Records'}
                    </div>
                    <div style={styles.inspectorSub}>
                      {activeCard === 'timeSpent' || activeCard === 'avgTime'
                        ? isQA 
                          ? `Showing top ${filteredList.length} ticket(s) that took the most QA testing & verification time`
                          : `Showing top ${filteredList.length} ticket(s) that took the most dev time`
                        : `Showing ${filteredList.length} record(s) for this metric`
                      }
                    </div>
                  </div>

                  <div style={styles.filterControlsRow}>
                    {/* Search Input */}
                    <div style={styles.searchWrapper}>
                      <input 
                        type="text"
                        placeholder="Search ticket ID, title, project..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                      />
                      {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} style={styles.clearSearchBtn}>×</button>
                      )}
                    </div>

                    {/* Project Filter */}
                    {projectOptions.length > 1 && (
                      <select 
                        value={selectedProject} 
                        onChange={(e) => setSelectedProject(e.target.value)}
                        style={styles.projectSelect}
                      >
                        <option value="ALL">All Projects ({activeRawList.length})</option>
                        {projectOptions.map(pName => (
                          <option key={pName} value={pName}>{pName}</option>
                        ))}
                      </select>
                    )}

                    <button 
                      type="button" 
                      onClick={() => setActiveCard(null)} 
                      style={styles.collapseBtn}
                      title="Collapse records"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                {/* Records Scroll Area */}
                <div style={styles.recordsScrollContainer}>
                  {paginatedList.length === 0 ? (
                    <div style={styles.emptyInspectorState}>
                      <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔍</div>
                      <div style={{ fontWeight: '700', color: '#475569', fontSize: '13px' }}>No matching records found</div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                        {searchQuery ? 'Try adjusting your search query or project filter' : 'No records recorded under this metric'}
                      </div>
                    </div>
                  ) : isPM && activeCard === 'pmProjects' ? (
                    /* Project Financial Cards for PM */
                    <div style={styles.ticketCardGrid}>
                      {paginatedList.map((pItem, idx) => (
                        <div key={idx} style={styles.ticketInspectorCard}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={styles.ticketCardHeaderRow}>
                              <span style={styles.projectBadge}>{pItem.name}</span>
                              <span style={{
                                ...styles.statusBadge,
                                fontWeight: '700',
                                color: pItem.status === 'Live' ? '#059669' : pItem.status === 'Testing' ? '#2563eb' : '#d97706'
                              }}>
                                ● {pItem.status}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '14px', marginTop: '6px', flexWrap: 'wrap' }}>
                              <div style={styles.financialStatBox}>
                                <div style={styles.financialStatLabel}>Contract Revenue</div>
                                <div style={{ ...styles.financialStatVal, color: '#059669' }}>
                                  ${Number(pItem.totalRevenue || 0).toLocaleString()}
                                </div>
                              </div>
                              <div style={styles.financialStatBox}>
                                <div style={styles.financialStatLabel}>Payment Received</div>
                                <div style={{ ...styles.financialStatVal, color: '#2563eb' }}>
                                  ${Number(pItem.paymentReceived || 0).toLocaleString()}
                                </div>
                              </div>
                              <div style={styles.financialStatBox}>
                                <div style={styles.financialStatLabel}>Pending Revenue</div>
                                <div style={{ ...styles.financialStatVal, color: (pItem.pendingPayment || 0) > 0 ? '#d97706' : '#059669' }}>
                                  ${Number(pItem.pendingPayment || 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={styles.cardRightBadgeCol}>
                            <div style={styles.pmTicketCountBadge}>
                              🎟️ {pItem.pmTicketsCreated || 0} tickets by PM
                            </div>
                            {pItem.deliveryDate && (
                              <div style={styles.deadlineTag}>
                                📅 Delivery: {new Date(pItem.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Ticket Records for QA / Dev / PM Tickets */
                    <div style={styles.ticketCardGrid}>
                      {paginatedList.map((tItem, idx) => (
                        <div key={idx} style={styles.ticketInspectorCard}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={styles.ticketCardHeaderRow}>
                              <span style={styles.ticketIdBadge}>{getTicketIdLabel(tItem.ticketId)}</span>
                              <span style={styles.projectBadge}>{tItem.projectName || 'Project'}</span>
                              <span style={styles.statusBadge}>Status: <strong>{tItem.status}</strong></span>
                              {tItem.priority && (
                                <span style={{
                                  ...styles.priorityBadge,
                                  backgroundColor: tItem.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : tItem.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  color: tItem.priority === 'High' ? '#dc2626' : tItem.priority === 'Medium' ? '#d97706' : '#059669',
                                }}>
                                  {tItem.priority}
                                </span>
                              )}
                              {tItem.ticketType && (
                                <span style={styles.ticketTypeBadge}>
                                  {tItem.ticketType === 'Feature' ? '✨' : tItem.ticketType === 'Bug' ? '🐞' : '📋'} {tItem.ticketType}
                                </span>
                              )}
                            </div>
                            <div style={styles.ticketCardTitle} title={tItem.task}>
                              {tItem.task}
                            </div>
                          </div>

                          {/* Contextual Badges */}
                          <div style={styles.cardRightBadgeCol}>
                            {/* PM created tickets */}
                            {isPM && (
                              <div style={styles.createdDateBadge}>
                                📅 {tItem.createdAt ? new Date(tItem.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Created'}
                              </div>
                            )}

                            {/* QA Specific Badges */}
                            {isQA && activeCard === 'qaTested' && (
                              <div style={styles.resolvedBadge}>
                                ✅ Tested: {tItem.testedAt ? new Date(tItem.testedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Verified'}
                              </div>
                            )}

                            {isQA && activeCard === 'qaBugsCaught' && (
                              <div style={styles.reopenedBadge}>
                                🐞 Logged by QA: {tItem.createdAt ? new Date(tItem.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Reported'}
                              </div>
                            )}

                            {isQA && activeCard === 'qaSentBack' && (
                              <div style={styles.reopenedBadge}>
                                ↩️ Returned to Dev: {tItem.reopenedAt ? new Date(tItem.reopenedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Returned'}
                              </div>
                            )}

                            {isQA && activeCard === 'qaLeakedBugs' && (
                              <div style={{ ...styles.reopenedBadge, backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>
                                ⚠️ Missed by QA (By: <strong>{tItem.reportedBy}</strong>)
                              </div>
                            )}

                            {isQA && activeCard === 'qaPostReleaseReopens' && (
                              <div style={{ ...styles.reopenedBadge, backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}>
                                🚨 Reopened by {tItem.reopenedBy || 'PM/Client'}
                              </div>
                            )}

                            {/* Dev specific badges */}
                            {!isPM && !isQA && (activeCard === 'reopened' || activeCard === 'reopenedRate') && (
                              <div style={styles.reopenedBadge}>
                                🔄 Reopened by {tItem.reopenedBy || 'QA/PM'}
                              </div>
                            )}

                            {!isPM && !isQA && activeCard === 'missedDeadlines' && (
                              <div style={styles.missedDeadlineBadge}>
                                ⚠️ {tItem.missedReason || 'Missed deadline'}
                              </div>
                            )}

                            {!isPM && !isQA && activeCard === 'resolved' && (
                              <div style={styles.resolvedBadge}>
                                ✅ Approved by {tItem.approvedBy || 'QA'}
                              </div>
                            )}

                            {!isPM && !isQA && (activeCard === 'timeSpent' || activeCard === 'avgTime') && (
                              <div style={styles.timeSpentBadge}>
                                ⏱️ {tItem.formattedTime || '0m'} spent
                              </div>
                            )}

                            {!isPM && !isQA && (activeCard === 'timeSpent' || activeCard === 'avgTime') && tItem.lastActiveAt && (
                              <div style={styles.createdDateBadge}>
                                📅 {new Date(tItem.lastActiveAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}

                            {tItem.deadline && (activeCard === 'allocated' || activeCard === 'resolved') && (
                              <div style={styles.deadlineTag}>
                                📅 {new Date(tItem.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                  <div style={styles.paginationFooter}>
                    <div style={styles.paginationInfoText}>
                      Showing <strong>{((currentPage - 1) * PAGE_SIZE) + 1}</strong> - <strong>{Math.min(filteredList.length, currentPage * PAGE_SIZE)}</strong> of <strong>{filteredList.length}</strong> records
                    </div>

                    <div style={styles.paginationBtnGroup}>
                      <button 
                        type="button" 
                        onClick={() => setCurrentPage(1)} 
                        disabled={currentPage === 1}
                        style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}
                      >
                        «
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                        style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}
                      >
                        ‹ Prev
                      </button>

                      <div style={styles.pageIndicator}>
                        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                      </div>

                      <button 
                        type="button" 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages}
                        style={{ ...styles.pageBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}
                      >
                        Next ›
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setCurrentPage(totalPages)} 
                        disabled={currentPage === totalPages}
                        style={{ ...styles.pageBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '20px',
  },
  modal: {
    width: '90vw',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(15, 23, 42, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'visible',
    position: 'relative',
    transition: 'all 0.25s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    flexShrink: 0,
  },
  userNameTitle: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.2,
  },
  roleBadge: {
    fontSize: '10.5px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid transparent',
    letterSpacing: '0.3px',
    textTransform: 'uppercase',
  },
  scoreContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '10px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    position: 'relative',
    cursor: 'help',
    userSelect: 'none',
  },
  scoreLabel: {
    fontSize: '10.5px',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.4px',
  },
  scoreNumber: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#0f172a',
  },
  infoCircle: {
    fontSize: '13px',
    color: '#000000',
    fontWeight: '900',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipHeader: {
    fontWeight: '700',
    marginBottom: '6px',
    color: '#0f172a',
    fontSize: '12px',
  },
  tooltipBody: {
    lineHeight: '1.6',
    color: '#334155',
    fontSize: '11.5px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  tooltipFooter: {
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px dashed #cbd5e1',
    color: '#0f172a',
    fontSize: '11px',
  },
  closeBtn: {
    background: '#f1f5f9',
    border: 'none',
    fontSize: '20px',
    color: '#64748b',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'all 0.15s ease',
  },
  loadingContainer: {
    padding: '50px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    borderBottomLeftRadius: '24px',
    borderBottomRightRadius: '24px',
    backgroundColor: '#ffffff',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#1e3a8a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    padding: '40px 20px',
    textAlign: 'center',
    borderBottomLeftRadius: '24px',
    borderBottomRightRadius: '24px',
    backgroundColor: '#ffffff',
  },
  bodyContent: {
    padding: '18px 22px 20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: '24px',
    borderBottomRightRadius: '24px',
    overflowY: 'auto',
  },
  heroGridPM: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  heroGridQA: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
  },
  heroGridDev: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '10px',
  },
  heroCard: {
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.18s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },
  heroTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  heroTitle: {
    fontSize: '9.5px',
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardClickHint: {
    fontSize: '9.5px',
    color: '#94a3b8',
    fontWeight: '700',
  },
  heroMainValue: {
    fontSize: '24px',
    fontWeight: '900',
    lineHeight: 1,
  },
  deliveryHeadTimeBanner: {
    padding: '10px 16px',
    backgroundColor: '#f0f9ff',
    border: '1.5px solid #bae6fd',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 2px 8px rgba(30, 58, 138, 0.06)',
  },
  inspectTimeBtn: {
    padding: '5px 12px',
    fontSize: '11px',
    fontWeight: '800',
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  expandedRecordPanel: {
    border: '1.5px solid #e2e8f0',
    borderRadius: '14px',
    padding: '14px 16px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inspectorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '10px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  inspectorTitle: {
    fontSize: '13.5px',
    fontWeight: '800',
    color: '#0f172a',
  },
  inspectorSub: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
  },
  filterControlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    padding: '5px 26px 5px 10px',
    fontSize: '11.5px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    width: '210px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '6px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
  },
  projectSelect: {
    padding: '5px 8px',
    fontSize: '11.5px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    cursor: 'pointer',
  },
  collapseBtn: {
    padding: '5px 10px',
    fontSize: '11.5px',
    fontWeight: '700',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  recordsScrollContainer: {
    maxHeight: '320px',
    overflowY: 'auto',
  },
  emptyInspectorState: {
    padding: '30px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  ticketCardGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  ticketInspectorCard: {
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  ticketCardHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  ticketIdBadge: {
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: '800',
    backgroundColor: '#f1f5f9',
    color: '#1e3a8a',
    padding: '1px 6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    flexShrink: 0,
  },
  projectBadge: {
    fontSize: '10.5px',
    fontWeight: '700',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    color: '#1e3a8a',
    padding: '1px 8px',
    borderRadius: '4px',
  },
  statusBadge: {
    fontSize: '11px',
    color: '#64748b',
  },
  ticketTypeBadge: {
    fontSize: '10.5px',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '4px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    color: '#334155',
  },
  ticketCardTitle: {
    fontSize: '12.5px',
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 1.3,
  },
  cardRightBadgeCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  },
  timeSpentBadge: {
    fontSize: '11px',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bae6fd',
    color: '#1e3a8a',
    whiteSpace: 'nowrap',
  },
  reopenedBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    whiteSpace: 'nowrap',
  },
  missedDeadlineBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    color: '#d97706',
    whiteSpace: 'nowrap',
  },
  resolvedBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#059669',
    whiteSpace: 'nowrap',
  },
  deadlineTag: {
    fontSize: '11px',
    color: '#d97706',
    fontWeight: '700',
  },
  createdDateBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    color: '#475569',
    whiteSpace: 'nowrap',
  },
  financialStatBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '4px 10px',
    minWidth: '110px',
  },
  financialStatLabel: {
    fontSize: '9.5px',
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: '0.2px',
    textTransform: 'uppercase',
  },
  financialStatVal: {
    fontSize: '13.5px',
    fontWeight: '900',
    marginTop: '2px',
  },
  pmTicketCountBadge: {
    fontSize: '11px',
    fontWeight: '800',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    color: '#0284c7',
    whiteSpace: 'nowrap',
  },
  paginationFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '8px',
    marginTop: '4px',
    flexShrink: 0,
  },
  paginationInfoText: {
    fontSize: '11px',
    color: '#64748b',
  },
  paginationBtnGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pageBtn: {
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    color: '#334155',
    cursor: 'pointer',
  },
  pageIndicator: {
    fontSize: '11px',
    color: '#475569',
    margin: '0 4px',
  },
};
