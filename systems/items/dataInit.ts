/**
 * 物品数据初始化模块
 *
 * 负责加载 CSV 配置数据并初始化物品/特征注册表。
 * CSV 文件通过 Vite 的 ?raw 导入，在编译时嵌入。
 */

import { initializeCSVData, isCSVDataInitialized } from './csvLoader';

// 直接导入 CSV 文件内容（Vite ?raw import）
// 这样 CSV 文件是唯一数据源，编译时嵌入，无需运行时加载
import itemsCSV from '@/assets/data/Items_Base.csv?raw';
import traitsCSV from '@/assets/data/Traits.csv?raw';

/**
 * 初始化物品数据
 *
 * 加载物品模板和特征定义到注册表。
 * 数据来自 CSV 文件（编译时嵌入）。
 */
export function initializeItemData(): void {
  if (isCSVDataInitialized()) {
    return;
  }

  initializeCSVData(itemsCSV, traitsCSV);
}

// 导出 CSV 数据供测试使用
export { itemsCSV, traitsCSV };
