import { Howl } from 'howler';

// Simple Web Audio API synth tone placeholders (can be replaced with actual sound files)
// Format: Data URI for a short beep sound
// const shortBeep = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ' + '/vT19AgAAAAEAAAEAQAAAQBwAAAABwA='; // Removed as unused
const shortClick = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABgAZGF0YQQAAAA='; // Quieter click
const riseSound = 'data:audio/wav;base64,UklGRkAIAABXQVZFZm10IBAAAAABAAIAgLsAAAB3AQACABAAZGF0YQAAAAA='; // Basic rising tone
const fallSound = 'data:audio/wav;base64,UklGRkACAABXQVZFZm10IBAAAAABAAIAgLsAAAB3AQACABAAZGF0YQQAAAD/AAAAAAAAAP8='; // Basic falling tone

// --- Sound Definitions ---

const nodeAddSound = new Howl({
  src: [shortClick],
  volume: 0.6,
});

const edgeConnectSound = new Howl({
  src: [shortClick],
  volume: 0.5,
});

const synthesisStartSound = new Howl({
  src: [riseSound],
  volume: 0.7,
});

const synthesisCompleteSound = new Howl({
  src: [fallSound],
  volume: 0.7,
});

// --- Player Functions ---

// Simple flag to enable/disable sounds (could be tied to user settings)
let soundsEnabled = true;

export const enableSounds = (enable: boolean) => {
  soundsEnabled = enable;
};

export const playNodeAdd = () => {
  if (soundsEnabled) nodeAddSound.play();
};

export const playEdgeConnect = () => {
  if (soundsEnabled) edgeConnectSound.play();
};

export const playSynthesisStart = () => {
  if (soundsEnabled) synthesisStartSound.play();
};

export const playSynthesisComplete = () => {
  if (soundsEnabled) synthesisCompleteSound.play();
};

// Optional: Function to preload sounds (might be useful)
export const preloadSounds = () => {
  nodeAddSound.load();
  edgeConnectSound.load();
  synthesisStartSound.load();
  synthesisCompleteSound.load();
  console.log('Ritual Ground sounds preloaded (placeholders).');
};

// Example of adding a toggle button (could be placed in Layout.tsx or a settings panel)
/*
import React, { useState } from 'react';
import { enableSounds } from './soundUtils';

const SoundToggle: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(true);

  const toggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    enableSounds(newState);
  };

  return (
    <button onClick={toggle}>
      Sounds: {isEnabled ? 'On' : 'Off'}
    </button>
  );
};
*/ 