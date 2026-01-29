/**
 * 物品数据初始化模块
 *
 * 负责加载 CSV 配置数据并初始化物品/特征注册表。
 * 在应用启动时调用 initializeItemData()。
 */

import { initializeCSVData, isCSVDataInitialized } from './csvLoader';

// 内嵌的默认 CSV 数据（用于开发/演示）
// 生产环境应该从文件或 API 加载

const DEFAULT_ITEMS_CSV = `ID,Name_Default,Name_Restored,Name_Reforged,Category,Real_Value,Visual_Value,Uncertainty,Init_State_Tags,Attr_Tags,Hidden_Traits,Know_Cap,Desc_Default,Desc_Restored,Desc_Reforged
item_watch_01,停摆的旧表,精工润滑的怀表,维多利亚时期金表,钟表,500,500,0.3,BROKEN,MECHANICAL;VINTAGE_REAL,trait_engraving,100,一块老式怀表，指针停在三点整，表壳上有岁月的痕迹。,机芯经过精心养护，指针走时精准，黄铜表壳散发出温润的光泽。,表壳内侧隐约可见皇室徽记，这是一块有故事的古董。
item_ring_01,蒙尘的戒指,抛光银戒,名门传家宝,首饰,300,350,0.25,DIRTY,GOLD;SENTIMENTAL,trait_inscription,80,一枚银质戒指，表面蒙着灰尘，但能感受到它的分量。,戒指经过抛光，银面如镜，内圈刻着的字迹清晰可见。,据考证这是某个名门望族的传家之物，有着百年历史。
item_painting_01,褪色的油画,修复的风景画,失落大师真迹,艺术品,800,600,0.4,DIRTY;RUSTED,ARTISTIC;VINTAGE_REAL,trait_signature;trait_hidden_layer,150,画框斑驳，画面颜色已经褪去大半，但构图依然优美。,清洗修复后，画面重现昔日风采，笔触细腻，意境深远。,经专家鉴定，这是一幅失传已久的大师早期作品。
item_vase_01,裂纹花瓶,修补古瓷,官窑珍品,古董,1200,1000,0.35,BROKEN,ARTISTIC;VINTAGE_REAL,trait_kiln_mark,120,青花瓷瓶身有一道细微的裂纹，但釉色依然温润。,裂纹经金缮工艺修补，反而增添了一份残缺之美。,底款证实这是清代官窑出品，存世极少。
item_book_01,虫蛀旧书,精装古籍,孤本善本,书籍,200,180,0.2,BROKEN;DIRTY,VINTAGE_REAL;SENTIMENTAL,trait_margin_notes,60,书页发黄，边角有虫蛀痕迹，但字迹依然清晰。,经过脱酸处理和重新装订，这本古籍重获新生。,经考证，这是某部典籍的唯一存世版本。
item_watch_gambler,金标手表,保养后的金表,名牌限量款,钟表,400,450,0.3,DIRTY,MECHANICAL;GOLD,trait_water_damage,80,表面有划痕，表带有些松动，但分量很足。机芯声音浑浊，可能是进过水。,经过专业保养，机芯恢复清脆，表壳重新抛光。,经鉴定为某奢侈品牌早期限量款，极具收藏价值。
item_console_student,便携游戏机,翻新游戏机,珍藏限定版,电子产品,1000,1200,0.2,,MECHANICAL;TRENDY,,60,屏幕贴膜完好，按键回弹清脆。系统已被重置，账号已登出。,经过深度清洁和系统优化，性能如新。,这是某款游戏的联名限定版，全球限量发售。
item_diamond_mystery,裸钻,净度提升钻石,传奇名钻,珠宝,3000,2500,0.4,,GOLD;ARTISTIC,trait_serial_scratched,120,一颗约1克拉的裸钻，切工精湛。腰码被刻意磨损了。,经过重新切割，净度和火彩都有所提升。,据说这颗钻石曾属于某位传奇人物，有着神秘的过往。`;

const DEFAULT_TRAITS_CSV = `ID,Name,Type,Value_Impact,Detect_Diff,Story_Text,Dialogue_Player,Dialogue_Customer
trait_engraving,背面刻字,STORY,0.05,0.3,表壳背面刻着"赠吾友守义"几个小字。,这表背后刻着字……,那是我父亲留给我的……
trait_inscription,内圈铭文,STORY,0.05,0.4,戒指内圈刻着一行拉丁文。,戒指内侧有字……,是我们的结婚誓言。
trait_signature,隐藏签名,STORY,0.1,0.6,画面角落藏着画家的签名。,这里好像有签名……,我也是第一次注意到。
trait_hidden_layer,底层画作,STORY,0.15,0.7,X光显示画布下还有一幅未完成的作品。,这幅画下面……好像还有一层？,什么？我完全不知道！
trait_kiln_mark,窑口暗记,STORY,0.2,0.5,底部有官窑特有的暗记。,这个底款……,是祖上传下来的，我也不懂这些。
trait_margin_notes,眉批笔记,STORY,0.1,0.35,书页边缘有前人的读书笔记。,这些批注是……,听说是某位大儒的手迹。
trait_fake_enamel,珐琅仿造,FAKE,-0.9,0.5,珐琅工艺粗糙，是现代仿品。,这珐琅的工艺……,什……什么意思？
trait_replaced_parts,非原装配件,FLAW,-0.15,0.4,部分零件是后期更换的。,这个零件好像不是原装的。,修过几次，可能换过一些。
trait_water_damage,水渍痕迹,FLAW,-0.2,0.3,有明显的水渍侵蚀痕迹。,这里有水渍的痕迹……,啊，可能是保存不当吧。
trait_repainted,重新上色,FLAW,-0.25,0.55,表面有重新上色的痕迹。,这颜色好像是后补的……,我……我不知道这些。
trait_serial_scratched,序列号异常,FLAW,-0.5,0.7,物品序列号被刻意磨损或挂失。,这个编号好像被磨掉了……,……你管那么多干什么？`;

/**
 * 初始化物品数据
 *
 * 加载物品模板和特征定义到注册表。
 * 可以传入自定义的 CSV 数据，否则使用内嵌的默认数据。
 */
export function initializeItemData(
  itemsCSV?: string,
  traitsCSV?: string
): void {
  if (isCSVDataInitialized()) {
    console.log('[dataInit] Item data already initialized, skipping.');
    return;
  }

  initializeCSVData(
    itemsCSV || DEFAULT_ITEMS_CSV,
    traitsCSV || DEFAULT_TRAITS_CSV
  );
}

/**
 * 从外部文件加载 CSV 数据
 * 用于运行时从服务器加载配置
 */
export async function loadItemDataFromFiles(
  itemsUrl: string,
  traitsUrl: string
): Promise<void> {
  try {
    const [itemsResponse, traitsResponse] = await Promise.all([
      fetch(itemsUrl),
      fetch(traitsUrl),
    ]);

    const itemsCSV = await itemsResponse.text();
    const traitsCSV = await traitsResponse.text();

    initializeCSVData(itemsCSV, traitsCSV);
  } catch (error) {
    console.error('[dataInit] Failed to load CSV files:', error);
    // 失败时使用默认数据
    initializeItemData();
  }
}

// 导出默认数据供测试使用
export { DEFAULT_ITEMS_CSV, DEFAULT_TRAITS_CSV };
