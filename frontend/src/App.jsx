import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import ProjectBoard from './components/ProjectBoard';
import PMProjectsDashboard from './components/PMProjectsDashboard';
import DeliveryHeadDashboard from './components/DeliveryHeadDashboard';
import CreateProjectModal from './components/CreateProjectModal';
import TicketDetailModal from './components/TicketDetailModal';
import UserPerformanceModal from './components/UserPerformanceModal';
import { API_BASE } from './config';

export default function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('pm_token') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('pm_user');
    const token = localStorage.getItem('pm_token');
    // Only trust cached user if a token exists
    if (!token) return null;
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProjectData, setActiveProjectData] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [inspectedUserForScorecard, setInspectedUserForScorecard] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('pm_user');
    localStorage.removeItem('pm_token');
    setCurrentUser(null);
    setAuthToken(null);
    setActiveProjectId(null);
    setActiveProjectData(null);
  };

  // Sync user state on login/signup
  const handleLoginSuccess = (data) => {
    const user = data.user || data;
    const token = data.token || null;

    if (token) {
      localStorage.setItem('pm_token', token);
      setAuthToken(token);
    }
    localStorage.setItem('pm_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsVerifyingSession(false);
  };

  // Cryptographically verify session token with server on startup (Anti-tamper protection)
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('pm_token');
      if (!storedToken) {
        handleLogout();
        setIsVerifyingSession(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (!res.ok) {
          // Token invalid, expired, or tampered with
          handleLogout();
        } else {
          const data = await res.json();
          setCurrentUser(data.user);
          localStorage.setItem('pm_user', JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem('pm_token', data.token);
            setAuthToken(data.token);
          }
        }
      } catch (err) {
        console.error('Session verification error:', err);
      } finally {
        setIsVerifyingSession(false);
      }
    };

    verifySession();
  }, []);

  // Fetch all user's projects with auth header
  useEffect(() => {
    if (!currentUser || isVerifyingSession) return;

    const fetchProjects = async () => {
      try {
        const queryParams = new URLSearchParams({
          userId: currentUser._id,
          role: currentUser.role
        });
        const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
        const res = await fetch(`${API_BASE}/projects?${queryParams}`, { headers });
        if (!res.ok) {
          if (res.status === 401) {
            handleLogout();
            return;
          }
          throw new Error('Failed to fetch projects');
        }
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchProjects();
  }, [currentUser, authToken, reloadTrigger, isVerifyingSession]);

  // Fetch full project data if active
  useEffect(() => {
    if (!activeProjectId || !currentUser) {
      setActiveProjectData(null);
      return;
    }

    const fetchProjectDetails = async () => {
      try {
        const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
        const res = await fetch(`${API_BASE}/projects/${activeProjectId}`, { headers });
        if (!res.ok) {
          if (res.status === 401) {
            handleLogout();
            return;
          }
          throw new Error('Failed to load project details');
        }
        const data = await res.json();
        setActiveProjectData(data);
        setSelectedTicket(prev => {
          if (!prev) return null;
          const updated = data.tickets?.find(t => t._id === prev._id);
          return updated || prev;
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchProjectDetails();
  }, [activeProjectId, authToken, reloadTrigger, currentUser]);

  const triggerRefresh = () => {
    setReloadTrigger(prev => prev + 1);
  };

  const handleReorderProjects = async (reorderedProjects) => {
    setProjects(reorderedProjects);
    try {
      const projectIds = reorderedProjects.map(p => p._id);
      const headers = { 
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };
      const res = await fetch(`${API_BASE}/projects/reorder`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ projectIds })
      });
      if (!res.ok) throw new Error('Failed to save project sequence');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      triggerRefresh();
    }
  };

  // Render Authentication screen if verifying is done and not logged in
  if (!isVerifyingSession && !currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Brief smooth loading indicator during session token verification
  if (isVerifyingSession && !currentUser) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
          <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
            Verifying secure session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Left Sidebar Menu */}
      <Sidebar
        projects={projects}
        activeProject={activeProjectData?.project}
        onSelectProject={setActiveProjectId}
        currentUser={currentUser}
        onLogout={handleLogout}
        onTriggerCreateProject={() => setShowCreateProject(true)}
        onReorderProjects={handleReorderProjects}
        onOpenScorecard={setInspectedUserForScorecard}
      />

      {/* Main Board Area */}
      <div style={styles.workspace}>
        {activeProjectData ? (
          <ProjectBoard
            projectData={activeProjectData}
            currentUser={currentUser}
            onRefresh={triggerRefresh}
            onSelectTicket={setSelectedTicket}
            onEditProject={setProjectToEdit}
            onBackToDashboard={() => setActiveProjectId(null)}
          />
        ) : ['Delivery Head', 'CEO'].includes(currentUser.role) ? (
          <DeliveryHeadDashboard
            currentUser={currentUser}
            onSelectProject={setActiveProjectId}
            onOpenScorecard={setInspectedUserForScorecard}
            onTriggerCreateProject={() => setShowCreateProject(true)}
          />
        ) : ['PM', 'Project Manager (PM)', 'PC', 'Project Coordinator (PC)'].includes(currentUser.role) ? (
          <PMProjectsDashboard
            projects={projects}
            currentUser={currentUser}
            onSelectProject={setActiveProjectId}
            onTriggerCreateProject={() => setShowCreateProject(true)}
            onEditProject={setProjectToEdit}
            onRefresh={triggerRefresh}
            onOpenScorecard={setInspectedUserForScorecard}
          />
        ) : (
          <div style={styles.splash} className="fade-in">
            <div style={styles.splashCard} className="glass">
              <img src="/logo_icon.png" alt="Apptunix" style={styles.splashLogo} />
              <h2 style={styles.splashTitle}>Welcome, {currentUser.name}</h2>
              <p style={styles.splashText}>
                Select an assigned project from the sidebar to start tracking tasks, files, and change requests.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CREATE PROJECT MODAL */}
      {showCreateProject && (
        <CreateProjectModal
          currentUser={currentUser}
          onClose={() => setShowCreateProject(false)}
          onSuccess={(newProj) => {
            setShowCreateProject(false);
            triggerRefresh();
            if (newProj && newProj._id) {
              setActiveProjectId(newProj._id);
            }
          }}
        />
      )}

      {projectToEdit && (
        <CreateProjectModal
          projectToEdit={projectToEdit}
          currentUser={currentUser}
          onClose={() => setProjectToEdit(null)}
          onSuccess={() => {
            setProjectToEdit(null);
            triggerRefresh();
          }}
          onDeleteProject={(deletedProjId) => {
            setProjectToEdit(null);
            if (activeProjectId === deletedProjId) {
              setActiveProjectId(null);
            }
            triggerRefresh();
          }}
        />
      )}

      {/* TICKET DETAILS DIALOG MODAL */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          columns={activeProjectData?.project?.columns || []}
          teamMembers={activeProjectData?.project?.teamMembers || []}
          currentUser={currentUser}
          onClose={() => setSelectedTicket(null)}
          onRefresh={triggerRefresh}
        />
      )}

      {/* USER PERFORMANCE SCORECARD MODAL (ROOT-LEVEL FULLSCREEN) */}
      {inspectedUserForScorecard && (
        <UserPerformanceModal
          userId={inspectedUserForScorecard._id}
          userEmail={inspectedUserForScorecard.email}
          userName={inspectedUserForScorecard.name}
          onClose={() => setInspectedUserForScorecard(null)}
        />
      )}
    </div>
  );
}

const styles = {
  workspace: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    background: 'transparent',
  },
  splash: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    padding: '40px',
  },
  splashCard: {
    maxWidth: '500px',
    padding: '50px 40px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
  },
  splashLogo: {
    height: '75px',
    width: '75px',
    objectFit: 'contain',
    marginBottom: '20px',
    marginLeft: 'auto',
    marginRight: 'auto',
    clipPath: 'inset(0% 0% 5% 5%)',
  },
  splashTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '12px',
  },
  splashText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
};
