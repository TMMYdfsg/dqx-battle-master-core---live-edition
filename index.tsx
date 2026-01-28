
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import GameOverlay from './components/GameOverlay';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// URLハッシュでオーバーレイモードを判定
const isOverlayMode = window.location.hash === '#/overlay';

// オーバーレイモードの場合、bodyを透明に設定
if (isOverlayMode) {
  document.body.classList.add('overlay-mode');
  document.body.classList.remove('scanlines');
  document.body.style.background = 'transparent';
  document.documentElement.style.background = 'transparent';
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isOverlayMode ? <GameOverlay /> : <App />}
  </React.StrictMode>
);
