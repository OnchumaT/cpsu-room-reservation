// main.jsx — the composition root's entry point. Mounts the React tree;
// all dependency wiring happens in shared/di/container.js and the context
// providers nested in App.jsx.

import ReactDOM from 'react-dom/client';
import { App } from './App.jsx';

// No <StrictMode> — several one-shot handoffs (takeTemplateToApply's
// consume-once ref, the module-singleton container) are intentionally not
// double-invocation-safe, since nothing else in this app needs concurrent
// rendering's guarantees.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
