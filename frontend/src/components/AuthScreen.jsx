import React, { useState } from 'react';
import { API_BASE } from '../config';

export default function AuthScreen({ onLoginSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Developer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Custom search dropdown states
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const rolesList = [
    { value: 'Android Developer', label: 'Android Developer' },
    { value: 'Angular Developer', label: 'Angular Developer' },
    { value: 'Backend Developer', label: 'Backend Developer' },
    { value: 'BA', label: 'Business Analyst (BA)' },
    { value: 'CEO', label: 'CEO' },
    { value: 'Delivery Head', label: 'Delivery Head' },
    { value: 'Designer', label: 'Designer' },
    { value: 'Developer', label: 'Developer' },
    { value: 'Flutter Developer', label: 'Flutter Developer' },
    { value: 'Frontend Designer', label: 'Frontend Designer' },
    { value: 'Full Stack Developer', label: 'Full Stack Developer' },
    { value: 'iOS Developer', label: 'iOS Developer' },
    { value: 'PC', label: 'Project Coordinator (PC)' },
    { value: 'PM', label: 'Project Manager (PM)' },
    { value: 'Product Owner', label: 'Product Owner' },
    { value: 'Python Developer', label: 'Python Developer' },
    { value: 'QA', label: 'Quality Analyst (QA)' },
    { value: 'Sales', label: 'Sales Rep' }
  ];

  const filteredRoles = rolesList.filter(r =>
    r.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        // Signup Flow
        const res = await fetch(`${API_BASE}/users/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, role, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');
        onLoginSuccess(data);
      } else {
        // Login Flow
        const res = await fetch(`${API_BASE}/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        onLoginSuccess(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass fade-in" style={styles.card}>
        <div style={styles.logoContainer}>
          <img src="/logo_full.png" alt="Apptunix" style={styles.logoImg} />
          <p style={styles.subtitle}>
            {isSignup ? 'Join the team & build together' : 'Lets build together'}
          </p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignup && (
            <div style={styles.inputGroup}>
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label>Work Email</label>
            <input
              type="email"
              placeholder="name@apptunix.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignup ? 'Create secure password' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {isSignup && (
            <div style={{ ...styles.inputGroup, position: 'relative' }}>
              <label>Work Role</label>
              <div 
                onClick={() => setIsOpen(!isOpen)} 
                style={styles.dropdownTrigger}
              >
                <span>{rolesList.find(r => r.value === role)?.label || role}</span>
                <span style={styles.caret}>{isOpen ? '▲' : '▼'}</span>
              </div>
              
              {isOpen && (
                <>
                  <div 
                    style={styles.dropdownOverlay} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      setSearchTerm('');
                    }} 
                  />
                  <div style={styles.dropdownMenu} className="glass fade-in">
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={styles.dropdownSearchInput}
                      autoFocus
                    />
                    <div style={styles.optionsList}>
                      {filteredRoles.length === 0 ? (
                        <div style={styles.noOptions}>No roles found</div>
                      ) : (
                        filteredRoles.map(r => (
                          <div
                            key={r.value}
                            className="dropdown-option"
                            onClick={() => {
                              setRole(r.value);
                              setSearchTerm('');
                              setIsOpen(false);
                            }}
                            style={{
                              ...styles.dropdownOption,
                              ...(role === r.value ? styles.activeOption : {})
                            }}
                          >
                            {r.label}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span
              style={styles.toggleLink}
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
              }}
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    background: 'transparent',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
    textAlign: 'left',
  },
  logoContainer: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  logoImg: {
    height: '80px',
    objectFit: 'contain',
    marginBottom: '16px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  error: {
    background: 'rgba(255, 69, 58, 0.1)',
    border: '1px solid rgba(255, 69, 58, 0.2)',
    borderRadius: '8px',
    color: 'var(--accent-red)',
    padding: '12px',
    fontSize: '13px',
    marginBottom: '20px',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  submitBtn: {
    marginTop: '10px',
    width: '100%',
    padding: '14px',
    fontSize: '15px',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  toggleLink: {
    color: 'var(--accent-blue)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  dropdownTrigger: {
    padding: '12px 16px',
    background: 'rgba(15, 23, 42, 0.03)',
    border: '1px solid rgba(15, 23, 42, 0.08)',
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
  },
  dropdownOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  dropdownMenu: {
    position: 'absolute',
    bottom: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--panel-border)',
    borderRadius: '10px',
    padding: '8px',
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)',
    zIndex: 100,
    maxHeight: '260px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  dropdownSearchInput: {
    padding: '8px 12px',
    fontSize: '13px',
    background: 'rgba(15, 23, 42, 0.02)',
    border: '1px solid rgba(15, 23, 42, 0.06)',
    borderRadius: '6px',
  },
  optionsList: {
    overflowY: 'auto',
    maxHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
  },
  dropdownOption: {
    padding: '10px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'var(--transition-smooth)',
  },
  activeOption: {
    background: 'rgba(30, 58, 138, 0.06)',
    color: 'var(--accent-blue)',
    fontWeight: '600',
  },
  noOptions: {
    padding: '12px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    lineHeight: 1,
    opacity: 0.7,
    transition: 'opacity 0.15s ease',
  },
};
