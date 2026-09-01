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
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('pm_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [activeProjectData, setActiveProjectData] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [inspectedUserForScorecard, setInspectedUserForScorecard] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Sync user state
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('pm_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    localStorage.removeItem('pm_user');
    setCurrentUser(null);
    setActiveProjectId(null);
    setActiveProjectData(null);
  };


  // Fetch all user's projects
  useEffect(() => {
    if (!currentUser) return;

    const fetchProjects = async () => {
      try {
        const queryParams = new URLSearchParams({
          userId: currentUser._id,
          role: currentUser.role
        });
        const res = await fetch(`${API_BASE}/projects?${queryParams}`);
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchProjects();
  }, [currentUser, reloadTrigger]);

  // Fetch full project data if active
  useEffect(() => {
    if (!activeProjectId) {
      setActiveProjectData(null);
      return;
    }

    const fetchProjectDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/projects/${activeProjectId}`);
        if (!res.ok) throw new Error('Failed to load project details');
        const data = await res.json();
        setActiveProjectData(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchProjectDetails();
  }, [activeProjectId, reloadTrigger]);

  const triggerRefresh = () => {
    setReloadTrigger(prev => prev + 1);
  };

  const handleReorderProjects = async (reorderedProjects) => {
    setProjects(reorderedProjects);
    try {
      const projectIds = reorderedProjects.map(p => p._id);
      const res = await fetch(`${API_BASE}/projects/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds })
      });
      if (!res.ok) throw new Error('Failed to save project sequence');
      triggerRefresh();
    } catch (err) {
      console.error(err);
      triggerRefresh();
    }
  };

  // Render Authentication screen if not logged in
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
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
          onClose={() => setShowCreateProject(false)}
          onSuccess={(newProj) => {
            setShowCreateProject(false);
            triggerRefresh();
            setActiveProjectId(newProj._id);
          }}
        />
      )}

      {projectToEdit && (
        <CreateProjectModal
          projectToEdit={projectToEdit}
          onClose={() => setProjectToEdit(null)}
          onSuccess={() => {
            setProjectToEdit(null);
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
