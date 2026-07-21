import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { LanguageProvider } from './i18n/index.jsx';
import './styles.css';
import './styles/cursors.css';
import { initAudioOnGesture } from './sound.js';
import { initializePreferences } from './preferences.js';

initializePreferences();
initAudioOnGesture();
createRoot(document.getElementById('root')).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>,
);
