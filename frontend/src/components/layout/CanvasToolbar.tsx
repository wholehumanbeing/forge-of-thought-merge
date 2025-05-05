import React, { useState, useEffect } from 'react';
import { Switch, Tooltip } from '@mui/material';

interface CanvasToolbarProps {
  conceptLibOpen: boolean;
  toggleConceptLib(): void;
  onToggleDepthPreview(enabled: boolean): void;
}

/**
 * Simple toolbar that sits bottom-left of canvas.
 */
const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ conceptLibOpen, toggleConceptLib, onToggleDepthPreview }) => {
  const [previewDepth, setPreviewDepth] = useState<boolean>(() => {
    return localStorage.getItem('previewDepth') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('previewDepth', String(previewDepth));
    onToggleDepthPreview(previewDepth);
  }, [previewDepth, onToggleDepthPreview]);

  return (
    <div className="absolute bottom-4 left-4 z-10 flex gap-4 items-center bg-gray-800/80 text-white px-4 py-2 rounded-md shadow-lg backdrop-blur">
      <Tooltip title="Toggle 3D parallax effect" placement="top">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            size="small"
            checked={previewDepth}
            onChange={(e) => setPreviewDepth(e.target.checked)}
            color="primary"
          />
          Depth Preview
        </label>
      </Tooltip>
      
      <button
        onClick={toggleConceptLib}
        className="p-2 bg-accent rounded-md hover:bg-accent/90 transition-colors"
      >
        {conceptLibOpen ? 'Close Library' : 'Open Library'}
      </button>
    </div>
  );
};

export default CanvasToolbar; 