import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupApiInterceptor } from './services/apiInterceptor';

// Initialize Cloudflare Pages / Static fallback interceptor
setupApiInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
