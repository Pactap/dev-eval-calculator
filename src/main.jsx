import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ConfigProvider } from './configStore.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { NotificationProvider } from './notify.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <NotificationProvider>
        <ConfigProvider>
          <App />
        </ConfigProvider>
      </NotificationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
