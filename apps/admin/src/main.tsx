import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing root element.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
