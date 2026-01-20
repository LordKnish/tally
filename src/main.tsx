import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import './index.css';
import App from './App.tsx';
import { ALL_MODE_IDS, GAME_MODES } from './types/modes';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {ALL_MODE_IDS.map((modeId) => (
          <Route key={modeId} path={GAME_MODES[modeId].path} element={<App />} />
        ))}
      </Routes>
      <Analytics />
    </BrowserRouter>
  </StrictMode>
);
