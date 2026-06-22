import { useRef, useState } from "react";

export default function UploadZone({ previewUrl, onFileSelect, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files) {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) {
      onFileSelect(file);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="upload-zone">
      <div
        className={`upload-zone__drop${dragging ? " upload-zone__drop--active" : ""}${previewUrl ? " upload-zone__drop--has-preview" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {previewUrl ? (
          <img src={previewUrl} alt="Headshot preview" className="upload-zone__preview" />
        ) : (
          <div className="upload-zone__placeholder">
            <span className="upload-zone__icon" aria-hidden="true">
              ↑
            </span>
            <p className="upload-zone__label">Drop your headshot here</p>
            <p className="upload-zone__hint">or click to browse · PNG, JPG, WEBP</p>
          </div>
        )}
      </div>
    </div>
  );
}
