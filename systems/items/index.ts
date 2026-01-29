/**
 * 物品系统模块导出
 */

// 类型
export * from './types';
export * from './tags';

// 工具函数
export * from './utils';
export * from './tagUtils';
export { getTagDefinition, TAG_DEFINITIONS } from './tagData';

// CSV 配置系统
export {
  // 类型
  type ItemTemplate,
  type TraitDefinition,
  // 加载函数
  loadItemTemplatesFromCSV,
  loadTraitDefinitionsFromCSV,
  initializeCSVData,
  isCSVDataInitialized,
  clearRegistries,
  // 查询函数
  getItemTemplate,
  getAllItemTemplates,
  getTraitDefinition as getTraitDefinitionFromCSV,
  getAllTraitDefinitions,
  // 创建函数
  createItemFromTemplate,
  createTraitFromDefinition,
} from './csvLoader';

// 数据初始化
export {
  initializeItemData,
  loadItemDataFromFiles,
} from './dataInit';
