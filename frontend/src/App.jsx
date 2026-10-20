// App.jsx
import React from 'react';
import { Outlet } from 'react-router';
import { ToastProvider } from './components/Toast'; // Adjust path if needed

const App = () => {
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  );
};

export default App;