import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#0f172a',
              color: '#f1f5f9',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: '0 8px 24px -6px rgba(15,23,42,0.25)',
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#0f172a' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#0f172a' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
