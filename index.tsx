import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeItemData } from './systems/items/dataInit';

// 初始化物品配置数据（CSV 已在编译时嵌入）
initializeItemData();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
