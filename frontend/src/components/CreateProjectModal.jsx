import React, { useState, useEffect } from 'react';
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
    // Format YYYY-MM-DD to display string
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
        <span>📅 {formatUserDisplay(value)}</span>
        <span style={styles.caret}>{isOpen ? '▲' : '▼'}</span>
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

export default function CreateProjectModal({ onClose, onSuccess, projectToEdit }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');
  const [paymentReceived, setPaymentReceived] = useState('');
  const [pendingPayment, setPendingPayment] = useState('');
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState({
    'Android Developer': '',
    'iOS Developer': '',
    'Flutter Developer': '',
    'Python Developer': '',
    'Full Stack Developer': '',
    'Angular Developer': '',
    'Frontend Designer': '',
    'Backend Developer': '',
    'Delivery Head': '',
    'QA': '',
    'PC': '',
    'BA': '',
    'Sales': '',
    'PM': '',
    'CEO': '',
    'Developer': '',
    'Designer': '',
    'Product Owner': ''
  });
  const [loading, setLoading] = useState(false);
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
      
      if (projectToEdit.deliveryDate) {
        const d = new Date(projectToEdit.deliveryDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setDeliveryDate(`${yyyy}-${mm}-${dd}`);
      }
      
      const newAssignments = {
        'Android Developer': '',
        'iOS Developer': '',
        'Flutter Developer': '',
        'Python Developer': '',
        'Full Stack Developer': '',
        'Angular Developer': '',
        'Frontend Designer': '',
        'Backend Developer': '',
        'Delivery Head': '',
        'QA': '',
        'PC': '',
        'BA': '',
        'Sales': '',
        'PM': '',
        'CEO': '',
        'Developer': '',
        'Designer': '',
        'Product Owner': ''
      };

      if (projectToEdit.teamMembers) {
        projectToEdit.teamMembers.forEach(member => {
          const memberId = typeof member === 'object' ? member._id : member;
          const memberObj = users.find(u => u._id === memberId);
          if (memberObj) {
            let catRole = memberObj.role;
            if (catRole === 'Quality Analyst (QA)') catRole = 'QA';
            if (catRole === 'Project Manager (PM)') catRole = 'PM';
            if (catRole === 'Business Analyst (BA)') catRole = 'BA';
            if (catRole === 'Project Coordinator (PC)') catRole = 'PC';
            if (catRole === 'Sales Rep') catRole = 'Sales';
            newAssignments[catRole] = memberId;
          }
        });
      }
      setAssignments(newAssignments);
    }
  }, [projectToEdit, users]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !deliveryDate) {
      setError('Project name and delivery date are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const teamMembers = Object.values(assignments).filter(Boolean);
      const url = projectToEdit ? `${API_BASE}/projects/${projectToEdit._id}` : `${API_BASE}/projects`;
      const method = projectToEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          deliveryDate,
          totalRevenue: Number(totalRevenue) || 0,
          paymentReceived: Number(paymentReceived) || 0,
          pendingPayment: Number(pendingPayment) || 0,
          teamMembers
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

  // Group users by role
  const roles = [
    'Android Developer', 'iOS Developer', 'Flutter Developer', 'Python Developer',
    'Full Stack Developer', 'Angular Developer', 'Frontend Designer', 'Backend Developer',
    'Delivery Head', 'QA', 'BA', 'PC', 'Sales', 'PM', 'CEO', 'Developer', 'Designer', 'Product Owner'
  ];
  const groupedUsers = roles.reduce((acc, r) => {
    acc[r] = users.filter(u => {
      if (r === 'QA') return u.role === 'QA' || u.role === 'Quality Analyst (QA)';
      if (r === 'PM') return u.role === 'PM' || u.role === 'Project Manager (PM)';
      if (r === 'BA') return u.role === 'BA' || u.role === 'Business Analyst (BA)';
      if (r === 'PC') return u.role === 'PC' || u.role === 'Project Coordinator (PC)';
      if (r === 'Sales') return u.role === 'Sales' || u.role === 'Sales Rep';
      return u.role === r;
    });
    return acc;
  }, {});

  return (
    <div style={styles.overlay}>
      <div className="fade-in" style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>{projectToEdit ? 'Edit Project Details' : 'Create New Project'}</h3>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label>Project Name</label>
            <input
              type="text"
              placeholder="e.g. E-Commerce Mobile App"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label>Description</label>
            <textarea
              placeholder="Provide a brief project description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div style={styles.inputGroup}>
            <label>Delivery Date</label>
            <CustomDatePicker
              value={deliveryDate}
              onChange={setDeliveryDate}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={styles.inputGroup}>
              <label>Total Revenue ($)</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={totalRevenue}
                onChange={(e) => setTotalRevenue(e.target.value)}
                min="0"
              />
            </div>
            <div style={styles.inputGroup}>
              <label>Received ($)</label>
              <input
                type="number"
                placeholder="e.g. 35000"
                value={paymentReceived}
                onChange={(e) => setPaymentReceived(e.target.value)}
                min="0"
              />
            </div>
            <div style={styles.inputGroup}>
              <label>Pending ($)</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={pendingPayment}
                onChange={(e) => setPendingPayment(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div style={styles.teamSection}>
            <label>Assign Team Members</label>
            <div style={styles.assignmentsGrid}>
              {roles.map(r => {
                const roleUsers = groupedUsers[r] || [];
                return (
                  <div key={r} style={styles.assignmentGroup}>
                    <label style={styles.roleLabel}>{r}</label>
                    <select
                      value={assignments[r] || ''}
                      onChange={(e) => setAssignments({ ...assignments, [r]: e.target.value })}
                      style={styles.assignmentSelect}
                    >
                      <option value="">Select member...</option>
                      {roleUsers.map(u => (
                        <option key={u._id} value={u._id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={styles.footerBtns}>
            <button type="button" onClick={onClose} className="secondary" style={styles.btn}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? 'Saving...' : projectToEdit ? 'Save Changes' : 'Create Project'}
            </button>
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
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: '540px',
    padding: '30px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
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
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '0 6px',
  },
  error: {
    background: 'rgba(255, 69, 58, 0.1)',
    border: '1px solid rgba(255, 69, 58, 0.2)',
    borderRadius: '8px',
    color: 'var(--accent-red)',
    padding: '12px',
    fontSize: '13px',
    marginBottom: '20px',
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
  teamSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  assignmentsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    maxHeight: '220px',
    overflowY: 'auto',
    paddingRight: '8px',
    paddingBottom: '8px',
  },
  assignmentGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  roleLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  assignmentSelect: {
    padding: '8px 12px',
    fontSize: '13px',
    background: '#ffffff',
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-main)',
  },
  footerBtns: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
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
