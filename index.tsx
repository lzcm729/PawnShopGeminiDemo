import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { loadItemDataFromFiles } from './systems/items/dataInit';

// 从外部 CSV 文件加载物品配置数据
// CSV 文件位置: assets/data/Items_Base.csv, assets/data/Traits.csv
async function bootstrap() {
  console.log('[bootstrap] Loading CSV data from /data/*.csv...');
  await loadItemDataFromFiles('/data/Items_Base.csv', '/data/Traits.csv');
  console.log('[bootstrap] CSV data loaded.');

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
}

bootstrap();