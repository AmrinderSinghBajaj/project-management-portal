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
  // If text is legacy markdown (e.g. **bold**, *italic*, [red]...[/red], URLs), convert to HTML
  let content = html;
  if (!content.includes('<p>') && !content.includes('<div>') && !content.includes('<ul>') && !content.includes('<span>') && !content.includes('<b>')) {
    // Convert legacy tokens
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

/**
 * Full WYSIWYG Editor with Live Toggling, Selection Formatting, and Direct Typing Support
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
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    bullet: false,
    color: null
  });

  // Keep editor content in sync when value changes externally (e.g. initial load or reset)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Only set if not currently focused or if empty
      if (document.activeElement !== editorRef.current || !value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  // Update active format buttons based on current selection / cursor position
  const updateToolbarState = useCallback(() => {
    if (!editorRef.current) return;

    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      const isBullet = document.queryCommandState('insertUnorderedList');
      const foreColor = document.queryCommandValue('foreColor');

      let activeColor = null;
      if (foreColor) {
        // RGB or Hex parsing
        if (foreColor.includes('220, 38, 38') || foreColor.toLowerCase() === '#dc2626' || foreColor === 'red') {
          activeColor = 'red';
        } else if (foreColor.includes('37, 99, 235') || foreColor.toLowerCase() === '#2563eb' || foreColor === 'blue') {
          activeColor = 'blue';
        } else if (foreColor.includes('22, 163, 74') || foreColor.toLowerCase() === '#16a34a' || foreColor === 'green') {
          activeColor = 'green';
        }
      }

      setActiveFormats({
        bold: Boolean(isBold),
        italic: Boolean(isItalic),
        underline: Boolean(isUnderline),
        bullet: Boolean(isBullet),
        color: activeColor
      });
    } catch {
      // Browser queryCommandState fallback
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

  const toggleBold = (e) => {
    e.preventDefault();
    executeCommand('bold');
  };

  const toggleItalic = (e) => {
    e.preventDefault();
    executeCommand('italic');
  };

  const toggleUnderline = (e) => {
    e.preventDefault();
    executeCommand('underline');
  };

  const toggleBullet = (e) => {
    e.preventDefault();
    executeCommand('insertUnorderedList');
  };

  const toggleColor = (e, colorKey, hexColor) => {
    e.preventDefault();
    if (activeFormats.color === colorKey) {
      // Toggle back to default dark text
      executeCommand('foreColor', '#0f172a');
    } else {
      executeCommand('foreColor', hexColor);
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      if (onPasteFiles) {
        onPasteFiles(Array.from(e.clipboardData.files));
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Interactive WYSIWYG Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'wrap',
        padding: '6px 8px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        borderRadius: '8px 8px 0 0'
      }}>
        {/* Bold Button */}
        <button
          type="button"
          onMouseDown={toggleBold}
          style={{
            ...btnStyle,
            fontWeight: '800',
            backgroundColor: activeFormats.bold ? 'rgba(30, 58, 138, 0.12)' : '#ffffff',
            borderColor: activeFormats.bold ? '#2563eb' : '#cbd5e1',
            color: activeFormats.bold ? '#1d4ed8' : '#334155',
            boxShadow: activeFormats.bold ? '0 0 0 1px #2563eb' : 'none'
          }}
          title="Bold (Ctrl+B)"
        >
          B
        </button>

        {/* Italic Button */}
        <button
          type="button"
          onMouseDown={toggleItalic}
          style={{
            ...btnStyle,
            fontStyle: 'italic',
            backgroundColor: activeFormats.italic ? 'rgba(30, 58, 138, 0.12)' : '#ffffff',
            borderColor: activeFormats.italic ? '#2563eb' : '#cbd5e1',
            color: activeFormats.italic ? '#1d4ed8' : '#334155',
            boxShadow: activeFormats.italic ? '0 0 0 1px #2563eb' : 'none'
          }}
          title="Italic (Ctrl+I)"
        >
          I
        </button>

        {/* Underline Button */}
        <button
          type="button"
          onMouseDown={toggleUnderline}
          style={{
            ...btnStyle,
            textDecoration: 'underline',
            backgroundColor: activeFormats.underline ? 'rgba(30, 58, 138, 0.12)' : '#ffffff',
            borderColor: activeFormats.underline ? '#2563eb' : '#cbd5e1',
            color: activeFormats.underline ? '#1d4ed8' : '#334155',
            boxShadow: activeFormats.underline ? '0 0 0 1px #2563eb' : 'none'
          }}
          title="Underline (Ctrl+U)"
        >
          U
        </button>

        {/* Bullet List Button */}
        <button
          type="button"
          onMouseDown={toggleBullet}
          style={{
            ...btnStyle,
            fontWeight: '700',
            backgroundColor: activeFormats.bullet ? 'rgba(30, 58, 138, 0.12)' : '#ffffff',
            borderColor: activeFormats.bullet ? '#2563eb' : '#cbd5e1',
            color: activeFormats.bullet ? '#1d4ed8' : '#334155',
            boxShadow: activeFormats.bullet ? '0 0 0 1px #2563eb' : 'none'
          }}
          title="Bullet Pointer"
        >
          • Bullet
        </button>

        <div style={{ width: '1px', height: '16px', backgroundColor: '#cbd5e1', margin: '0 4px' }} />

        {/* Red Text Color */}
        <button
          type="button"
          onMouseDown={(e) => toggleColor(e, 'red', '#dc2626')}
          style={{
            ...btnStyle,
            color: '#dc2626',
            backgroundColor: activeFormats.color === 'red' ? '#fee2e2' : '#ffffff',
            borderColor: activeFormats.color === 'red' ? '#dc2626' : 'rgba(220, 38, 38, 0.3)',
            boxShadow: activeFormats.color === 'red' ? '0 0 0 1px #dc2626' : 'none'
          }}
          title="Red Text"
        >
          🔴 Red
        </button>

        {/* Blue Text Color */}
        <button
          type="button"
          onMouseDown={(e) => toggleColor(e, 'blue', '#2563eb')}
          style={{
            ...btnStyle,
            color: '#2563eb',
            backgroundColor: activeFormats.color === 'blue' ? '#dbeafe' : '#ffffff',
            borderColor: activeFormats.color === 'blue' ? '#2563eb' : 'rgba(37, 99, 235, 0.3)',
            boxShadow: activeFormats.color === 'blue' ? '0 0 0 1px #2563eb' : 'none'
          }}
          title="Blue Text"
        >
          🔵 Blue
        </button>

        {/* Green Text Color */}
        <button
          type="button"
          onMouseDown={(e) => toggleColor(e, 'green', '#16a34a')}
          style={{
            ...btnStyle,
            color: '#16a34a',
            backgroundColor: activeFormats.color === 'green' ? '#dcfce7' : '#ffffff',
            borderColor: activeFormats.color === 'green' ? '#16a34a' : 'rgba(22, 163, 74, 0.3)',
            boxShadow: activeFormats.color === 'green' ? '0 0 0 1px #16a34a' : 'none'
          }}
          title="Green Text"
        >
          🟢 Green
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

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px 9px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11.5px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  userSelect: 'none'
};
