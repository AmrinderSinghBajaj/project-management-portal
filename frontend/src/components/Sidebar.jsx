import React, { useState } from 'react';
import UserPerformanceModal from './UserPerformanceModal';

const isDeveloperRole = (role) => {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes('developer') || r.includes('dev') || r.includes('designer');
};

export default function Sidebar({ 
  projects, 
  activeProject, 
  onSelectProject, 
  currentUser, 
  onLogout, 
  onTriggerCreateProject,
  onReorderProjects,
  onOpenScorecard
}) {
  const isPriorityManager = ['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)'].includes(currentUser?.role);

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    if (sourceIndexStr === '') return;
    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (sourceIndex === targetIndex) return;

    const reordered = [...projects];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, removed);
    
    onReorderProjects(reordered);
  };
  return (
    <div style={styles.sidebar} className="glass">
      {/* Branding Header - Click to return to Overview */}
      <div 
        style={{ ...styles.brand, cursor: 'pointer' }} 
        onClick={() => onSelectProject(null)}
        title="Apptunix Projects Overview"
      >
        <img src="/logo_icon.png" alt="Apptunix" style={styles.brandLogo} />
        <div style={styles.brandText}>Apptunix</div>
      </div>

      {/* Projects Navigation */}
      <div style={styles.navSection}>
        {/* All Projects Overview Link */}
        <div
          onClick={() => onSelectProject(null)}
          style={{
            ...styles.allProjectsBtn,
            ...(!activeProject ? styles.allProjectsBtnActive : {})
          }}
          className={`sidebar-all-projects-item ${!activeProject ? 'active' : ''}`}
          title="Executive Projects Dashboard"
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.allProjectsTitle}>All Projects</div>
            <div style={styles.allProjectsSub}>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} total
            </div>
          </div>
          {!activeProject && <div style={styles.activeDot} />}
        </div>

        <div style={styles.navHeader}>
          <span>PROJECTS</span>
          {(isPriorityManager || ['Delivery Head', 'CEO'].includes(currentUser?.role)) && (
            <button 
              className="sidebar-add-btn"
              onClick={onTriggerCreateProject}
              style={styles.addButton}
              title="Create New Project"
            >
              +
            </button>
          )}
        </div>
        
        <div style={styles.projectList}>
          {projects.length === 0 ? (
            <div style={styles.emptyState}>No projects assigned</div>
          ) : (
            projects.map((proj, idx) => {
              const isActive = activeProject?._id === proj._id;
              return (
                <div
                  key={proj._id}
                  onClick={() => onSelectProject(proj._id)}
                  draggable={isPriorityManager}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  style={{
                    ...styles.projectItem,
                    ...(isActive ? styles.projectItemActive : {}),
                  }}
                  className={`sidebar-project-item ${isActive ? 'active' : ''}`}
                >
                  <div style={styles.projectInfo}>
                    <div style={styles.projectName}>{proj.name}</div>
                    <div style={styles.projectDetails}>
                      {isDeveloperRole(currentUser?.role)
                        ? `${proj.developerPendingCount || 0} pending tickets`
                        : `${proj.readyForTestingCount || 0} pending tickets`}
                    </div>
                  </div>

                  {/* Visual Priority Badge (P1, P2...) with Tooltip */}
                  <div 
                    style={styles.priorityBadge}
                    title={isPriorityManager ? "Drag to reorder project priority across company" : "Executive priority ranking"}
                  >
                    P{idx + 1}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>


      {/* User Footer Profile */}
      <div style={styles.footer}>
        <div 
          style={{ ...styles.userInfo, cursor: 'pointer' }}
          onClick={() => onOpenScorecard && onOpenScorecard(currentUser)}
          title="Click to view My Performance Scorecard"
          className="user-profile-btn"
        >
          <div style={styles.userAvatar}>
            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={styles.userDetails}>
            <div style={styles.userName}>{currentUser?.name || 'User'}</div>
            <div style={styles.userRole}>{currentUser?.role || 'Role'}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} style={styles.logoutBtn} title="Sign Out">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--panel-border)',
    borderRadius: '0px', // Full height side panel
    background: 'rgba(255, 255, 255, 0.95)',
  },
  brand: {
    height: 'var(--header-height)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: '10px',
    borderBottom: '1px solid var(--panel-border)',
  },
  brandLogo: {
    height: '36px',
    width: '36px',
    objectFit: 'contain',
    clipPath: 'inset(0% 0% 5% 5%)',
  },
  brandText: {
    fontSize: '17px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  navSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 10px',
    overflowY: 'auto',
  },
  allProjectsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '10px',
    marginBottom: '14px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid transparent',
    transition: 'var(--transition-smooth)',
  },
  allProjectsBtnActive: {
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(30, 58, 138, 0.15)',
    fontWeight: '600',
  },
  allProjectsIcon: {
    fontSize: '15px',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: 'rgba(30, 58, 138, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  allProjectsTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'inherit',
    lineHeight: '1.2',
  },
  allProjectsSub: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  activeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    flexShrink: 0,
  },
  navHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    letterSpacing: '1px',
    marginBottom: '12px',
    padding: '0 6px',
  },
  addButton: {
    background: 'transparent',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    borderRadius: '6px',
    width: '22px',
    height: '22px',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
  },
  projectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  emptyState: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '20px 0',
  },
  projectItem: {
    position: 'relative',
    padding: '8px 10px',
    cursor: 'pointer',
    borderRadius: '8px',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectItemActive: {
    background: 'rgba(30, 58, 138, 0.06)',
  },
  projectInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  priorityBadge: {
    fontSize: '10px',
    fontWeight: '700',
    background: 'rgba(30, 58, 138, 0.08)',
    color: 'var(--accent-blue)',
    padding: '3px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    marginLeft: '6px',
    zIndex: 10,
    flexShrink: 0,
  },
  projectName: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  projectDetails: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  activeIndicator: {
    position: 'absolute',
    left: '0px',
    top: '25%',
    height: '50%',
    width: '4px',
    backgroundColor: 'var(--accent-blue)',
    borderRadius: '0 4px 4px 0',
  },

  footer: {
    padding: '14px 16px',
    borderTop: '1px solid var(--panel-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    background: '#ffffff',
    marginTop: 'auto',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0,
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent-blue) 0%, #0056b3 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '14px',
    color: '#fff',
    flexShrink: 0,
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
  },
  userRole: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
  },
  logoutBtn: {
    background: '#f8fafc',
    padding: 0,
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'var(--transition-smooth)',
  },
};
