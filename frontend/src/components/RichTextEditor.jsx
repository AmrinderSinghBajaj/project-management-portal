import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Extracts plain text from HTML string and calculates word count
 */
export function getWordCountFromHtml(html) {
  if (!html) return 0;
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = (temp.innerText || temp.textContent || '').trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Clean & Safe HTML sanitization for rendering ticket descriptions
 */
export function sanitizeRichHtml(html) {
  if (!html) return '';
  let content = html;
  if (!content.includes('<p>') && !content.includes('<div>') && !content.includes('<ul>') && !content.includes('<ol>') && !content.includes('<span>') && !content.includes('<b>') && !content.includes('<h1>') && !content.includes('<h2>')) {
    // Convert legacy markdown tokens
    content = content
      .replace(/\[red\]([\s\S]*?)\[\/red\]/gi, '<span style="color: #dc2626; font-weight: 600;">$1</span>')
      .replace(/\[blue\]([\s\S]*?)\[\/blue\]/gi, '<span style="color: #2563eb; font-weight: 600;">$1</span>')
      .replace(/\[green\]([\s\S]*?)\[\/green\]/gi, '<span style="color: #16a34a; font-weight: 600;">$1</span>')
      .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__([\s\S]+?)__/g, '<u>$1</u>')
      .replace(/(?<!\*)\*(?!\*)([\s\S]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  }

  return content;
}

/**
 * Visual WYSIWYG Rich Text Renderer for Ticket Detail View
 */
export function RichTextRenderer({ text, style = {} }) {
  if (!text) return null;

  const html = sanitizeRichHtml(text);

  return (
    <div
      className="wysiwyg-rendered-content"
      style={{
        fontSize: '14px',
        color: '#1e293b',
        lineHeight: '1.6',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        minWidth: 0,
        width: '100%',
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// MS Word style standard palette colors
const FONT_COLORS = [
  { label: 'Automatic (Dark)', color: '#0f172a' },
  { label: 'Red', color: '#dc2626' },
  { label: 'Blue', color: '#2563eb' },
  { label: 'Green', color: '#16a34a' },
  { label: 'Orange', color: '#ea580c' },
  { label: 'Purple', color: '#7c3aed' },
  { label: 'Pink', color: '#db2777' },
  { label: 'Amber', color: '#d97706' },
  { label: 'Gray', color: '#64748b' }
];

const HIGHLIGHT_COLORS = [
  { label: 'No Color', color: 'transparent', preview: '#ffffff', border: '#e2e8f0' },
  { label: 'Yellow', color: '#fef08a', preview: '#fef08a' },
  { label: 'Green', color: '#bbf7d0', preview: '#bbf7d0' },
  { label: 'Cyan / Blue', color: '#bfdbfe', preview: '#bfdbfe' },
  { label: 'Pink', color: '#fbcfe8', preview: '#fbcfe8' },
  { label: 'Orange', color: '#fed7aa', preview: '#fed7aa' }
];

/**
 * Microsoft Word style Professional WYSIWYG Editor
 */
export default function RichTextEditorInput({
  value = '',
  onChange,
  onPasteFiles,
  placeholder = 'Provide ticket details, paste photos/videos directly, or paste Figma/Loom links...',
  minHeight = '140px',
  maxWords = 400
}) {
  const editorRef = useRef(null);
  const colorMenuRef = useRef(null);
  const highlightMenuRef = useRef(null);

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    bullet: false,
    ordered: false,
    heading: 'p',
    color: '#0f172a',
    highlight: 'transparent'
  });

  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isHighlightOpen, setIsHighlightOpen] = useState(false);

  // Keep editor content in sync when value changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current || !value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  // Click outside to close dropdown palettes
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target)) {
        setIsColorOpen(false);
      }
      if (highlightMenuRef.current && !highlightMenuRef.current.contains(e.target)) {
        setIsHighlightOpen(false);
      }
    };
    if (isColorOpen || isHighlightOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorOpen, isHighlightOpen]);

  // Update active format buttons based on current selection / cursor position
  const updateToolbarState = useCallback(() => {
    if (!editorRef.current) return;

    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      const isStrike = document.queryCommandState('strikethrough');
      const isBullet = document.queryCommandState('insertUnorderedList');
      const isOrdered = document.queryCommandState('insertOrderedList');
      const foreColor = document.queryCommandValue('foreColor');

      let currentHeading = 'p';
      const formatBlock = document.queryCommandValue('formatBlock');
      if (formatBlock) {
        const lower = formatBlock.toLowerCase();
        if (lower.includes('h1')) currentHeading = 'h1';
        else if (lower.includes('h2')) currentHeading = 'h2';
      }

      setActiveFormats({
        bold: Boolean(isBold),
        italic: Boolean(isItalic),
        underline: Boolean(isUnderline),
        strike: Boolean(isStrike),
        bullet: Boolean(isBullet),
        ordered: Boolean(isOrdered),
        heading: currentHeading,
        color: foreColor || '#0f172a',
        highlight: 'transparent'
      });
    } catch {
      // Fallback
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html === '<br>' || html === '<div><br></div>' ? '' : html);
      updateToolbarState();
    }
  };

  const executeCommand = (command, val = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, val);
    handleInput();
    updateToolbarState();
  };

  const handleFormatHeading = (tag) => {
    executeCommand('formatBlock', tag === activeFormats.heading ? '<p>' : `<${tag}>`);
  };

  const handleSelectColor = (hexColor) => {
    executeCommand('foreColor', hexColor);
    setIsColorOpen(false);
  };

  const handleSelectHighlight = (hexColor) => {
    try {
      executeCommand('hiliteColor', hexColor);
    } catch {
      executeCommand('backColor', hexColor);
    }
    setIsHighlightOpen(false);
  };

  const handleClearFormat = (e) => {
    e.preventDefault();
    executeCommand('removeFormat');
    executeCommand('foreColor', '#0f172a');
    try {
      executeCommand('hiliteColor', 'transparent');
    } catch {}
  };

  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      if (onPasteFiles) {
        onPasteFiles(Array.from(e.clipboardData.files));
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', userSelect: 'none' }}>
      {/* Microsoft Word Style Formatting Ribbon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        flexWrap: 'wrap',
        padding: '5px 8px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        borderRadius: '8px 8px 0 0'
      }}>
        {/* BOLD */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('bold');
          }}
          style={{
            ...toolbarBtnStyle,
            fontWeight: '800',
            fontFamily: 'serif',
            fontSize: '13px',
            backgroundColor: activeFormats.bold ? '#e2e8f0' : 'transparent',
            color: activeFormats.bold ? '#1e293b' : '#334155'
          }}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>

        {/* ITALIC */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('italic');
          }}
          style={{
            ...toolbarBtnStyle,
            fontStyle: 'italic',
            fontFamily: 'serif',
            fontSize: '13px',
            backgroundColor: activeFormats.italic ? '#e2e8f0' : 'transparent',
            color: activeFormats.italic ? '#1e293b' : '#334155'
          }}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>

        {/* UNDERLINE */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('underline');
          }}
          style={{
            ...toolbarBtnStyle,
            textDecoration: 'underline',
            fontFamily: 'serif',
            fontSize: '13px',
            backgroundColor: activeFormats.underline ? '#e2e8f0' : 'transparent',
            color: activeFormats.underline ? '#1e293b' : '#334155'
          }}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>

        {/* STRIKETHROUGH */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('strikethrough');
          }}
          style={{
            ...toolbarBtnStyle,
            textDecoration: 'line-through',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: activeFormats.strike ? '#e2e8f0' : 'transparent',
            color: activeFormats.strike ? '#1e293b' : '#334155'
          }}
          title="Strikethrough"
        >
          <s>S</s>
        </button>

        <div style={separatorStyle} />

        {/* HEADING 1 */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleFormatHeading('h1');
          }}
          style={{
            ...toolbarBtnStyle,
            fontSize: '11px',
            fontWeight: '800',
            backgroundColor: activeFormats.heading === 'h1' ? '#e2e8f0' : 'transparent',
            color: activeFormats.heading === 'h1' ? '#1e293b' : '#475569'
          }}
          title="Heading 1"
        >
          H1
        </button>

        {/* HEADING 2 */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleFormatHeading('h2');
          }}
          style={{
            ...toolbarBtnStyle,
            fontSize: '11px',
            fontWeight: '800',
            backgroundColor: activeFormats.heading === 'h2' ? '#e2e8f0' : 'transparent',
            color: activeFormats.heading === 'h2' ? '#1e293b' : '#475569'
          }}
          title="Heading 2"
        >
          H2
        </button>

        <div style={separatorStyle} />

        {/* BULLET LIST */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('insertUnorderedList');
          }}
          style={{
            ...toolbarBtnStyle,
            backgroundColor: activeFormats.bullet ? '#e2e8f0' : 'transparent',
            color: activeFormats.bullet ? '#1e293b' : '#334155'
          }}
          title="Bulleted List"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <circle cx="3" cy="6" r="1.5" fill="currentColor"></circle>
            <circle cx="3" cy="12" r="1.5" fill="currentColor"></circle>
            <circle cx="3" cy="18" r="1.5" fill="currentColor"></circle>
          </svg>
        </button>

        {/* NUMBERED LIST */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand('insertOrderedList');
          }}
          style={{
            ...toolbarBtnStyle,
            backgroundColor: activeFormats.ordered ? '#e2e8f0' : 'transparent',
            color: activeFormats.ordered ? '#1e293b' : '#334155'
          }}
          title="Numbered List"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <path d="M4 6h1v4"></path>
            <path d="M4 10h2"></path>
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
          </svg>
        </button>

        <div style={separatorStyle} />

        {/* MS WORD FONT COLOR BUTTON (A with color underline) */}
        <div ref={colorMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setIsColorOpen(!isColorOpen);
              setIsHighlightOpen(false);
            }}
            style={{
              ...toolbarBtnStyle,
              display: 'inline-flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2px 6px',
              backgroundColor: isColorOpen ? '#e2e8f0' : 'transparent'
            }}
            title="Font Color"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'serif', lineHeight: 1 }}>A</span>
              <span style={{ fontSize: '7px', opacity: 0.7 }}>▼</span>
            </div>
            <div style={{ width: '12px', height: '2.5px', backgroundColor: activeFormats.color !== '#0f172a' ? activeFormats.color : '#dc2626', borderRadius: '1px', marginTop: '1px' }} />
          </button>

          {/* Color Palette Popover */}
          {isColorOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              zIndex: 1200,
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
              padding: '8px',
              width: '180px'
            }} className="fade-in">
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Text Color
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
                {FONT_COLORS.map((fc, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectColor(fc.color)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: fc.color,
                      border: '1px solid rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.1s ease'
                    }}
                    title={fc.label}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MS WORD TEXT HIGHLIGHT COLOR (Highlighter Pen icon) */}
        <div ref={highlightMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setIsHighlightOpen(!isHighlightOpen);
              setIsColorOpen(false);
            }}
            style={{
              ...toolbarBtnStyle,
              display: 'inline-flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2px 6px',
              backgroundColor: isHighlightOpen ? '#e2e8f0' : 'transparent'
            }}
            title="Text Highlight Color"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 11-6 6v3h3l6-6"></path>
                <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"></path>
              </svg>
              <span style={{ fontSize: '7px', opacity: 0.7 }}>▼</span>
            </div>
            <div style={{ width: '12px', height: '2.5px', backgroundColor: '#fef08a', borderRadius: '1px', marginTop: '1px' }} />
          </button>

          {/* Highlight Palette Popover */}
          {isHighlightOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              zIndex: 1200,
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
              padding: '8px',
              width: '180px'
            }} className="fade-in">
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Highlight Color
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {HIGHLIGHT_COLORS.map((hc, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectHighlight(hc.color)}
                    style={{
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: hc.preview,
                      border: hc.border ? `1px solid ${hc.border}` : '1px solid rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: hc.color === 'transparent' ? '#64748b' : '#0f172a',
                      transition: 'transform 0.1s ease'
                    }}
                    title={hc.label}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {hc.color === 'transparent' ? 'None' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={separatorStyle} />

        {/* CLEAR FORMATTING */}
        <button
          type="button"
          onMouseDown={handleClearFormat}
          style={{
            ...toolbarBtnStyle,
            fontSize: '11.5px',
            color: '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px'
          }}
          title="Clear All Formatting"
        >
          <span style={{ fontWeight: '700' }}>T</span>
          <span style={{ fontSize: '10px', textDecoration: 'line-through' }}>x</span>
        </button>
      </div>

      {/* Live ContentEditable Rich Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyUp={updateToolbarState}
        onMouseUp={updateToolbarState}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        style={{
          width: '100%',
          minHeight,
          padding: '12px 14px',
          lineHeight: '1.6',
          fontSize: '13.5px',
          color: '#0f172a',
          outline: 'none',
          backgroundColor: '#ffffff',
          overflowY: 'auto',
          boxSizing: 'border-box',
          wordBreak: 'break-word',
          cursor: 'text'
        }}
        className="wysiwyg-editor-area"
      />
    </div>
  );
}

const toolbarBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '28px',
  minWidth: '28px',
  padding: '0 6px',
  borderRadius: '5px',
  border: '1px solid transparent',
  fontSize: '12.5px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.1s ease',
  backgroundColor: 'transparent',
  color: '#334155'
};

const separatorStyle = {
  width: '1px',
  height: '16px',
  backgroundColor: '#cbd5e1',
  margin: '0 4px'
};
