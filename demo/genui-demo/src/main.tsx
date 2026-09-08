import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';

import App from './App';
import FlatDemo from './demos/01-flat/Demo';
import UnionDemo from './demos/02-union/Demo';
import ToolsDemo from './demos/03-tools/Demo';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* App is the layout: the demos render inside its <Outlet /> */}
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/flat" replace />} />
          <Route path="flat" element={<FlatDemo />} />
          <Route path="union" element={<UnionDemo />} />
          <Route path="tools" element={<ToolsDemo />} />
          <Route path="*" element={<Navigate to="/flat" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
