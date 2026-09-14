import React, { useState, useEffect, useRef } from 'react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function CustomDateTimePicker({
  value,
  onChange,
  placeholder = 'Select date & time...',
  align = 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('date'); // 'date' | 'time'
  const [clockMode, setClockMode] = useState('hours'); // 'hours' | 'minutes'
  const containerRef = useRef(null);

  // Parse initial value or default to now
  const parseDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const selectedDate = parseDate(value);

  // View state for the calendar
  const [viewYear, setViewYear] = useState(() => (selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (selectedDate ? selectedDate.getMonth() : new Date().getMonth()));

  // Clock time state (12-hour format) - Defaults to at least 1 hour in the future
  const getInitialTime = () => {
    if (selectedDate && selectedDate.getTime() > Date.now()) {
      let hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return { hours, minutes, period };
    }
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    let hours = futureDate.getHours();
    const minutes = Math.ceil(futureDate.getMinutes() / 5) * 5 % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return { hours, minutes, period };
  };

  const [time, setTime] = useState(getInitialTime);
  const [validationError, setValidationError] = useState('');

  // Sync view when value changes from outside
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
      let hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setTime({ hours, minutes, period });
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const pad = (n) => n.toString().padStart(2, '0');

  const formatDisplay = (val) => {
    const d = parseDate(val);
    if (!d) return null;
    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
    let hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${month}, ${hours}:${mins} ${ampm}`;
  };

  // Convert Date and Time parts to YYYY-MM-DDTHH:mm
  const composeDateTimeString = (year, month, day, hours, minutes, period) => {
    let h = parseInt(hours, 10);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const m = parseInt(minutes, 10) || 0;
    return `${year}-${pad(month + 1)}-${pad(day)}T${pad(h)}:${pad(m)}`;
  };

  const isDateTimeInPast = (year, month, day, hours, minutes, period) => {
    let h = parseInt(hours, 10);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const m = parseInt(minutes, 10) || 0;
    const dt = new Date(year, month, day, h, m, 0, 0);
    return dt.getTime() < Date.now();
  };

  const handleDaySelect = (day) => {
    const now = new Date();
    let updatedTime = { ...time };

    // If selected day is TODAY and the current time is in past, advance time forward
    const isPickingToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === now.getDate();
    if (isPickingToday && isDateTimeInPast(viewYear, viewMonth, day, time.hours, time.minutes, time.period)) {
      const nextHour = new Date(Date.now() + 60 * 60 * 1000);
      let hours = nextHour.getHours();
      const minutes = Math.ceil(nextHour.getMinutes() / 5) * 5 % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      updatedTime = { hours, minutes, period };
      setTime(updatedTime);
    }

    const newStr = composeDateTimeString(viewYear, viewMonth, day, updatedTime.hours, updatedTime.minutes, updatedTime.period);
    setValidationError('');
    onChange(newStr);
    // Transition to clock setting after picking day
    setActiveTab('time');
    setClockMode('hours');
  };

  const handleTimeChange = (newHours, newMinutes, newPeriod) => {
    const updated = {
      hours: newHours !== undefined ? newHours : time.hours,
      minutes: newMinutes !== undefined ? newMinutes : time.minutes,
      period: newPeriod !== undefined ? newPeriod : time.period
    };

    const baseYear = selectedDate ? selectedDate.getFullYear() : viewYear;
    const baseMonth = selectedDate ? selectedDate.getMonth() : viewMonth;
    const baseDay = selectedDate ? selectedDate.getDate() : new Date().getDate();

    if (isDateTimeInPast(baseYear, baseMonth, baseDay, updated.hours, updated.minutes, updated.period)) {
      setValidationError('Deadline cannot be in the past.');
    } else {
      setValidationError('');
    }

    setTime(updated);

    const newStr = composeDateTimeString(
      baseYear,
      baseMonth,
      baseDay,
      updated.hours,
      updated.minutes,
      updated.period
    );
    onChange(newStr);
  };

  const handleClockHourSelect = (h) => {
    handleTimeChange(h, undefined, undefined);
    setClockMode('minutes');
  };

  const handleClockMinuteSelect = (m) => {
    handleTimeChange(undefined, m, undefined);
  };

  const now = new Date();
  const isPrevMonthDisabled = viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth <= now.getMonth());

  const prevMonth = () => {
    if (isPrevMonthDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Build Calendar Matrix (Monday start)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const startingDay = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays = [];
  for (let i = startingDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false
    });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true
    });
  }
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false
    });
  }

  const isToday = (day, isCurrentMonth) => {
    if (!isCurrentMonth) return false;
    const now = new Date();
    return now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day;
  };

  const isSelectedDay = (day, isCurrentMonth) => {
    if (!isCurrentMonth || !selectedDate) return false;
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === day
    );
  };

  const displayText = formatDisplay(value);

  // Round Clock Constants
  const CLOCK_SIZE = 190;
  const CLOCK_CENTER = CLOCK_SIZE / 2; // 95
  const CLOCK_RADIUS = 70;

  // Calculate clock hand rotation angle
  const hourAngle = ((time.hours % 12) * 30); // 30 deg per hour
  const minuteAngle = (time.minutes * 6); // 6 deg per minute
  const currentHandAngle = clockMode === 'hours' ? hourAngle : minuteAngle;

  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '38px',
          minHeight: '38px',
          padding: '0 10px',
          backgroundColor: '#ffffff',
          border: isOpen ? '1px solid #2563eb' : '1px solid #cbd5e1',
          borderRadius: '8px',
          cursor: 'pointer',
          boxSizing: 'border-box',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: displayText ? '#2563eb' : '#94a3b8', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: displayText ? '600' : '400',
              color: displayText ? '#0f172a' : '#94a3b8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {displayText || placeholder}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              style={{
                fontSize: '14px',
                color: '#94a3b8',
                fontWeight: 'bold',
                padding: '2px 4px',
                borderRadius: '4px',
                cursor: 'pointer',
                lineHeight: 1
              }}
              title="Clear deadline"
            >
              ×
            </span>
          )}
          <span style={{ fontSize: '9px', color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
            ▼
          </span>
        </div>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            zIndex: 1100,
            width: '296px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 14px 35px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.04)',
            padding: '12px',
            boxSizing: 'border-box'
          }}
          className="fade-in"
        >
          {/* Top Segmented Tab Switcher: 📅 Date | 🕒 Clock Time */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            padding: '2px',
            marginBottom: '10px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('date')}
              style={{
                flex: 1,
                padding: '5px 8px',
                fontSize: '11.5px',
                fontWeight: '700',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'date' ? '#ffffff' : 'transparent',
                color: activeTab === 'date' ? '#2563eb' : '#64748b',
                boxShadow: activeTab === 'date' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>📅</span>
              <span>{selectedDate ? `${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()].slice(0,3)}` : 'Select Date'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('time')}
              style={{
                flex: 1,
                padding: '5px 8px',
                fontSize: '11.5px',
                fontWeight: '700',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'time' ? '#ffffff' : 'transparent',
                color: activeTab === 'time' ? '#2563eb' : '#64748b',
                boxShadow: activeTab === 'time' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🕒</span>
              <span>{time.hours}:{pad(time.minutes)} {time.period}</span>
            </button>
          </div>

          {/* TAB 1: CALENDAR VIEW */}
          {activeTab === 'date' && (
            <div className="fade-in">
              {/* Month / Year Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={prevMonth}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#475569',
                    fontSize: '11px'
                  }}
                >
                  ◀
                </button>
                <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </div>
                <button
                  type="button"
                  onClick={nextMonth}
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#475569',
                    fontSize: '11px'
                  }}
                >
                  ▶
                </button>
              </div>

              {/* Weekday Names */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '4px' }}>
                {DAY_NAMES.map((d, i) => (
                  <div key={i} style={{ fontSize: '10.5px', fontWeight: '700', color: '#94a3b8', padding: '2px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '6px' }}>
                {calendarDays.map((item, idx) => {
                  const active = isSelectedDay(item.day, item.isCurrentMonth);
                  const today = isToday(item.day, item.isCurrentMonth);
                  const isPast = item.isCurrentMonth && new Date(viewYear, viewMonth, item.day, 23, 59, 59, 999).getTime() < Date.now();

                  return (
                    <div
                      key={idx}
                      onClick={() => !isPast && item.isCurrentMonth && handleDaySelect(item.day)}
                      style={{
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11.5px',
                        fontWeight: active ? '700' : today ? '700' : '500',
                        color: active
                          ? '#ffffff'
                          : isPast || !item.isCurrentMonth
                          ? '#cbd5e1'
                          : today
                          ? '#2563eb'
                          : '#1e293b',
                        backgroundColor: active
                          ? '#2563eb'
                          : today
                          ? 'rgba(37, 99, 235, 0.08)'
                          : 'transparent',
                        borderRadius: '6px',
                        cursor: isPast || !item.isCurrentMonth ? 'not-allowed' : 'pointer',
                        opacity: isPast ? 0.35 : 1,
                        border: today && !active ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid transparent',
                        transition: 'all 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (item.isCurrentMonth && !active && !isPast) {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (item.isCurrentMonth && !active && !isPast) {
                          e.currentTarget.style.backgroundColor = today ? 'rgba(37, 99, 235, 0.08)' : 'transparent';
                        }
                      }}
                    >
                      {item.day}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ROUND CLOCK VIEW */}
          {activeTab === 'time' && (() => {
            const baseYear = selectedDate ? selectedDate.getFullYear() : viewYear;
            const baseMonth = selectedDate ? selectedDate.getMonth() : viewMonth;
            const baseDay = selectedDate ? selectedDate.getDate() : new Date().getDate();
            const isDateToday = (
              baseYear === now.getFullYear() &&
              baseMonth === now.getMonth() &&
              baseDay === now.getDate()
            );

            const isAmDisabledToday = isDateToday && now.getHours() >= 12;
            const isCurrentlyPast = isDateTimeInPast(baseYear, baseMonth, baseDay, time.hours, time.minutes, time.period);

            return (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Digital Display Header with Hours/Minutes/AM-PM Toggles */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px', padding: '0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {/* Hour Box */}
                    <button
                      type="button"
                      onClick={() => setClockMode('hours')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '15px',
                        fontWeight: '800',
                        borderRadius: '6px',
                        border: clockMode === 'hours' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: clockMode === 'hours' ? 'rgba(37, 99, 235, 0.1)' : '#f8fafc',
                        color: clockMode === 'hours' ? '#2563eb' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {pad(time.hours)}
                    </button>

                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#94a3b8' }}>:</span>

                    {/* Minute Box */}
                    <button
                      type="button"
                      onClick={() => setClockMode('minutes')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '15px',
                        fontWeight: '800',
                        borderRadius: '6px',
                        border: clockMode === 'minutes' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: clockMode === 'minutes' ? 'rgba(37, 99, 235, 0.1)' : '#f8fafc',
                        color: clockMode === 'minutes' ? '#2563eb' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      {pad(time.minutes)}
                    </button>
                  </div>

                  {/* AM / PM Toggle */}
                  <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      disabled={isAmDisabledToday}
                      onClick={() => !isAmDisabledToday && handleTimeChange(undefined, undefined, 'AM')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: time.period === 'AM' ? '#2563eb' : 'transparent',
                        color: time.period === 'AM' ? '#ffffff' : isAmDisabledToday ? '#cbd5e1' : '#64748b',
                        cursor: isAmDisabledToday ? 'not-allowed' : 'pointer',
                        opacity: isAmDisabledToday ? 0.4 : 1
                      }}
                      title={isAmDisabledToday ? 'AM has already passed today' : ''}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimeChange(undefined, undefined, 'PM')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: time.period === 'PM' ? '#2563eb' : 'transparent',
                        color: time.period === 'PM' ? '#ffffff' : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      PM
                    </button>
                  </div>
                </div>

                {/* Mode Subtitle & Warning */}
                {isCurrentlyPast ? (
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', marginBottom: '6px' }}>
                    ⚠️ Selected time is in the past
                  </div>
                ) : (
                  <div style={{ fontSize: '10.5px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                    {clockMode === 'hours' ? 'Select Hour (1 - 12)' : 'Select Minute (00 - 55)'}
                  </div>
                )}

                {/* ROUND ANALOG CLOCK FACE */}
                <div
                  style={{
                    position: 'relative',
                    width: `${CLOCK_SIZE}px`,
                    height: `${CLOCK_SIZE}px`,
                    borderRadius: '50%',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.04)',
                    margin: '4px 0 8px 0',
                    userSelect: 'none'
                  }}
                >
                  {/* Center Pin */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${CLOCK_CENTER - 4}px`,
                      left: `${CLOCK_CENTER - 4}px`,
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                      zIndex: 10
                    }}
                  />

                  {/* Clock Hand Pointer */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${CLOCK_CENTER}px`,
                      left: `${CLOCK_CENTER - 1}px`,
                      width: '2px',
                      height: `${CLOCK_RADIUS}px`,
                      backgroundColor: '#2563eb',
                      transformOrigin: 'top center',
                      transform: `rotate(${currentHandAngle + 180}deg)`,
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: 5
                    }}
                  />

                  {/* Circular Clock Numbers */}
                  {(clockMode === 'hours' ? hoursList : minutesList).map((num, i) => {
                    const stepAngle = clockMode === 'hours' ? (num % 12) * 30 : num * 6;
                    const rad = (stepAngle - 90) * (Math.PI / 180);
                    const x = CLOCK_CENTER + CLOCK_RADIUS * Math.cos(rad);
                    const y = CLOCK_CENTER + CLOCK_RADIUS * Math.sin(rad);

                    const isSelectedNum = clockMode === 'hours'
                      ? time.hours === num
                      : Math.abs(time.minutes - num) < 3 || time.minutes === num;

                    // Compute if disabled
                    let isNumDisabled = false;
                    if (isDateToday) {
                      if (clockMode === 'hours') {
                        let h24 = (num % 12) + (time.period === 'PM' ? 12 : 0);
                        if (h24 < now.getHours()) isNumDisabled = true;
                      } else {
                        let selectedH24 = (time.hours % 12) + (time.period === 'PM' ? 12 : 0);
                        if (selectedH24 === now.getHours() && num <= now.getMinutes()) {
                          isNumDisabled = true;
                        }
                      }
                    }

                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (isNumDisabled) return;
                          clockMode === 'hours' ? handleClockHourSelect(num) : handleClockMinuteSelect(num);
                        }}
                        style={{
                          position: 'absolute',
                          top: `${y - 13}px`,
                          left: `${x - 13}px`,
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11.5px',
                          fontWeight: isSelectedNum ? '800' : '600',
                          color: isSelectedNum 
                            ? '#ffffff' 
                            : isNumDisabled 
                            ? '#cbd5e1' 
                            : '#334155',
                          backgroundColor: isSelectedNum ? '#2563eb' : 'transparent',
                          cursor: isNumDisabled ? 'not-allowed' : 'pointer',
                          opacity: isNumDisabled ? 0.3 : 1,
                          zIndex: isSelectedNum ? 12 : 8,
                          transition: 'all 0.15s ease',
                          boxShadow: isSelectedNum ? '0 2px 6px rgba(37, 99, 235, 0.4)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelectedNum && !isNumDisabled) {
                            e.currentTarget.style.backgroundColor = '#e2e8f0';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelectedNum && !isNumDisabled) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {clockMode === 'hours' ? num : pad(num)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Action Row */}
          {(() => {
            const baseYear = selectedDate ? selectedDate.getFullYear() : viewYear;
            const baseMonth = selectedDate ? selectedDate.getMonth() : viewMonth;
            const baseDay = selectedDate ? selectedDate.getDate() : new Date().getDate();
            const isCurrentlyPast = isDateTimeInPast(baseYear, baseMonth, baseDay, time.hours, time.minutes, time.period);

            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '4px 6px'
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={isCurrentlyPast}
                  onClick={() => {
                    if (isCurrentlyPast) return;
                    if (!value) {
                      const today = new Date();
                      const newStr = composeDateTimeString(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate(),
                        time.hours,
                        time.minutes,
                        time.period
                      );
                      onChange(newStr);
                    }
                    setIsOpen(false);
                  }}
                  style={{
                    backgroundColor: isCurrentlyPast ? '#cbd5e1' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 14px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: isCurrentlyPast ? 'not-allowed' : 'pointer'
                  }}
                >
                  Set Deadline
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
