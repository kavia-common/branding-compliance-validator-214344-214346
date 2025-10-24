import React from 'react';
import './theme.css';
import { RouterRoot } from './router';

/**
 * PUBLIC_INTERFACE
 * App
 * Purpose: Entry wrapper that provides routing and themed layout (Ocean Professional)
 * GxP Critical: Yes (contains navigation/role placeholders)
 * Returns: JSX.Element
 */
function App() {
  return <RouterRoot />;
}

export default App;
