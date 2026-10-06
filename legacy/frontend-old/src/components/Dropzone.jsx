import { useEffect, useRef, useState } from 'react';
import { IconImage, IconClose } from './Icons';

const MAX_BYTES = 20 * 1024 * 1024;

const formatSize = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

/** Drag-and-drop / click / paste image picker with a live preview. */
export default function Dropzone({ file, onFile, disabled, hint = 'PNG, JPG, WEBP up to 20 MB', children }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('That file isn’t an image.');
    if (f.size > MAX_BYTES) return setError('Images must be 20 MB or smaller.');
    setError(null);
    onFile(f);
  };

  // Paste an image from the clipboard anywhere on the page
  useEffect(() => {
    if (disabled) return;
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      if (item) accept(item.getAsFile());
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  return (
    <div>
      <div
        className={`dropzone ${drag ? 'drag' : ''} ${file ? 'has-file' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && !file && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled) accept(e.dataTransfer.files[0]); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !file && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { accept(e.target.files[0]); e.target.value = ''; }} />
        {file && preview ? (
          <div className="dz-preview">
            <img src={preview} alt="Selected" />
            {children}
            {!disabled && (
              <button type="button" className="dz-clear" onClick={(e) => { e.stopPropagation(); onFile(null); }} aria-label="Remove image">
                <IconClose size={16} />
              </button>
            )}
            <div className="dz-meta">
              <span title={file.name}>{file.name}</span>
              <span>{formatSize(file.size)}</span>
            </div>
          </div>
        ) : (
          <div className="dz-empty">
            <span className="dz-icon"><IconImage size={26} /></span>
            <strong>Drop an image here, or <u>browse</u></strong>
            <span className="muted small">{hint} · you can also paste with Ctrl+V</span>
          </div>
        )}
      </div>
      {error && <p className="field-msg error">{error}</p>}
    </div>
  );
}
