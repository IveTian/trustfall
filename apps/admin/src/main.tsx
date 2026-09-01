import { startMeshRuntime } from '../../../packages/design/src/mesh-runtime.ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles/global.css';
import 'virtual:stylex:runtime';

startMeshRuntime();

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing root element.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
