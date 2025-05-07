// frontend/src/index.tsx
// Removed unused React import
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Find the root element
const rootElement = document.getElementById('root');

// Ensure the root element exists before rendering
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
      <App />
      // StrictMode removed temporarily to rule out double-render issues
  );
} else {
  console.error("Failed to find the root element with ID 'root'.");
}




