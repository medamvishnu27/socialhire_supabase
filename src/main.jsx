import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { initAuth } from './utils/authPersist.js'; // Updated to use initAuth
import App from './App.jsx';
import './index.css';

// Initialize auth and render the app
const initializeApp = async () => {
  try {
    await initAuth(store.dispatch); // Call initAuth to set up the initial auth state
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    // Render the app even if auth initialization fails
    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>
    );
  }
};

// Call the initialization function
initializeApp();
