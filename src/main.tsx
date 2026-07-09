import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

const splash = document.getElementById('app-splash');
if (splash) {
  splash.style.opacity = '0';
  splash.style.transition = 'opacity 240ms ease';
  window.setTimeout(() => splash.remove(), 260);
}
