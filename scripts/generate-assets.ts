/**
 * 资源生成脚本 - 使用 Nano Banana Pro (Gemini 3 Pro Image) 生成游戏资源
 *
 * 用法:
 *   npx tsx scripts/generate-assets.ts items     # 生成物品图标
 *   npx tsx scripts/generate-assets.ts characters # 生成人物头像
 *   npx tsx scripts/generate-assets.ts all       # 生成所有资源
 *   npx tsx scripts/generate-assets.ts items watch_01  # 生成单个物品
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// 加载 .env 文件
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
}

// ============================================================================
// 配置
// ============================================================================

const API_KEY = process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('错误: 未设置 NANO_BANANA_API_KEY 或 GEMINI_API_KEY 环境变量');
  console.error('请在 .env 文件中设置 API 密钥，或通过环境变量传入');
  process.exit(1);
}

const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';

const PROJECT_ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');
const ITEMS_DIR = path.join(ASSETS_DIR, 'items');
const CHARACTERS_DIR = path.join(ASSETS_DIR, 'characters');

// 图片配置
const IMAGE_CONFIG = {
  aspectRatio: '1:1',  // 图标使用正方形
  imageSize: '1K',     // 图标不需要太高分辨率
};

// ============================================================================
// 统一风格定义
// ============================================================================

const UNIFIED_STYLE = {
  // 物品图标风格
  item: {
    prefix: 'Hand-painted watercolor illustration of',
    suffix: 'Soft watercolor brush strokes, warm muted color palette, gentle diffused lighting, visible paper texture, artistic organic edges, delicate ink outlines, cozy pawn shop atmosphere. Square composition, centered subject, cream-colored background with subtle wash.',
  },
  // 人物头像风格
  character: {
    prefix: 'Hand-painted watercolor portrait of',
    suffix: 'Soft watercolor brush strokes, warm skin tones, gentle diffused lighting, visible paper texture, artistic organic edges, delicate ink outlines for features, expressive eyes. Bust portrait, cream-colored background with subtle color wash, emotional and intimate.',
  },
};

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ============================================================================
// 物品定义
// ============================================================================

interface ItemAssetDef {
  id: string;
  category: string;
  states: {
    default: { name: string; prompt: string };
    restored?: { name: string; prompt: string };
    reforged?: { name: string; prompt: string };
  };
}

// 从 Items_Base.csv 提取的物品资源定义
// 注意：prompt 现在只包含物品描述，风格由 UNIFIED_STYLE 统一添加
const ITEM_ASSETS: ItemAssetDef[] = [
  {
    id: 'watch_01',
    category: '钟表',
    states: {
      default: {
        name: '停摆的旧表',
        prompt: 'a vintage brass pocket watch stopped at 3 o\'clock, tarnished case showing age, dust on crystal',
      },
      restored: {
        name: '精工润滑的怀表',
        prompt: 'a restored vintage pocket watch, polished brass case with warm golden glow, visible working gears',
      },
      reforged: {
        name: '维多利亚时期金表',
        prompt: 'an exquisite Victorian-era gold pocket watch with royal crest engraving, ornate decorations',
      },
    },
  },
  {
    id: 'ring_01',
    category: '首饰',
    states: {
      default: {
        name: '蒙尘的戒指',
        prompt: 'a dusty tarnished silver ring, covered in fine dust, showing weight and craftsmanship beneath grime',
      },
      restored: {
        name: '抛光银戒',
        prompt: 'a polished silver ring with mirror finish, delicate engraving visible on inner band',
      },
      reforged: {
        name: '名门传家宝',
        prompt: 'an antique noble family heirloom ring with precious gemstone, century-old intricate craftsmanship',
      },
    },
  },
  {
    id: 'painting_01',
    category: '艺术品',
    states: {
      default: {
        name: '褪色的油画',
        prompt: 'a faded landscape oil painting in worn gilded frame, colors washed out, dusty surface',
      },
      restored: {
        name: '修复的风景画',
        prompt: 'a restored landscape oil painting, vivid colors revealed, delicate brushwork, clean frame',
      },
      reforged: {
        name: '失落大师真迹',
        prompt: 'a masterpiece landscape painting in museum-quality frame, remarkable brushwork, precious artwork',
      },
    },
  },
  {
    id: 'vase_01',
    category: '古董',
    states: {
      default: {
        name: '裂纹花瓶',
        prompt: 'a blue and white Chinese porcelain vase with visible hairline crack, beautiful glaze',
      },
      restored: {
        name: '修补古瓷',
        prompt: 'a restored porcelain vase with golden kintsugi repair lines, blue and white pattern',
      },
      reforged: {
        name: '官窑珍品',
        prompt: 'an imperial Chinese official kiln porcelain vase, rare Qing dynasty, exquisite blue pattern',
      },
    },
  },
  {
    id: 'book_01',
    category: '书籍',
    states: {
      default: {
        name: '虫蛀旧书',
        prompt: 'an old leather-bound book with yellowed pages, worm-eaten edges, damaged but readable',
      },
      restored: {
        name: '精装古籍',
        prompt: 'a restored antique book with new leather binding, gilt lettering, preserved pages',
      },
      reforged: {
        name: '孤本善本',
        prompt: 'an extremely rare first edition book, priceless manuscript, museum-quality preservation',
      },
    },
  },
  {
    id: 'watch_gambler',
    category: '钟表',
    states: {
      default: {
        name: '金标手表',
        prompt: 'a gold-plated wristwatch with scratched face, loose leather strap, slightly worn',
      },
      restored: {
        name: '保养后的金表',
        prompt: 'a serviced gold wristwatch, polished case, new brown leather strap, elegant',
      },
      reforged: {
        name: '名牌限量款',
        prompt: 'a limited edition luxury gold watch, vintage collector piece, exceptional craftsmanship',
      },
    },
  },
  {
    id: 'console_student',
    category: '电子产品',
    states: {
      default: {
        name: '便携游戏机',
        prompt: 'a handheld gaming console, screen protector on, colorful buttons, portable device',
      },
      restored: {
        name: '翻新游戏机',
        prompt: 'a refurbished handheld gaming console, cleaned and polished, like-new condition',
      },
      reforged: {
        name: '珍藏限定版',
        prompt: 'a limited edition handheld gaming console, rare collector version, special design',
      },
    },
  },
  {
    id: 'diamond_mystery',
    category: '珠宝',
    states: {
      default: {
        name: '裸钻',
        prompt: 'a loose diamond about 1 carat on dark velvet, brilliant cut, mysterious sparkle',
      },
      restored: {
        name: '净度提升钻石',
        prompt: 'a recut diamond with improved clarity, sparkling facets, professional cut',
      },
      reforged: {
        name: '传奇名钻',
        prompt: 'a legendary diamond with exceptional brilliance, priceless gemstone, museum quality',
      },
    },
  },
  {
    id: 'emma_clothes',
    category: '服饰',
    states: {
      default: {
        name: '名牌职业套装',
        prompt: 'a designer professional suit jacket and skirt, high-end fashion, quality fabric',
      },
      restored: {
        name: '干洗职业套装',
        prompt: 'a freshly dry-cleaned designer suit, crisp pressed fabric, elegant business wear',
      },
      reforged: {
        name: '设计师定制款',
        prompt: 'a rare designer custom-made suit, haute couture piece, fashion collectible',
      },
    },
  },
  {
    id: 'emma_skincare',
    category: '奢侈品',
    states: {
      default: {
        name: '贵妇面霜礼盒',
        prompt: 'an unopened luxury skincare gift box, elegant gold packaging, premium cosmetics',
      },
      restored: {
        name: '保鲜护肤套装',
        prompt: 'a preserved luxury skincare set, resealed packaging, premium beauty products',
      },
      reforged: {
        name: '限量珍藏版',
        prompt: 'a discontinued limited edition luxury skincare set, rare collectible cosmetics',
      },
    },
  },
  {
    id: 'emma_laptop',
    category: '电子产品',
    states: {
      default: {
        name: '轻薄笔记本',
        prompt: 'a thin laptop covered in colorful stickers, worn keyboard, used portable computer',
      },
      restored: {
        name: '翻新笔记本',
        prompt: 'a refurbished silver laptop, cleaned and upgraded, sleek modern design',
      },
      reforged: {
        name: '珍藏版笔记本',
        prompt: 'a limited commemorative edition laptop, rare collector item, premium design',
      },
    },
  },
  {
    id: 'emma_watch',
    category: '钟表',
    states: {
      default: {
        name: '男士机械表',
        prompt: 'an old men\'s mechanical wristwatch, broken leather strap, vintage but worn',
      },
      restored: {
        name: '保养机械表',
        prompt: 'a serviced mechanical watch, new strap, polished case, elegant vintage piece',
      },
      reforged: {
        name: '古董名表',
        prompt: 'an early Swiss brand antique watch, valuable vintage timepiece, collector quality',
      },
    },
  },
  {
    id: 'zhao_medal',
    category: '古玩',
    states: {
      default: {
        name: '一等功勋章',
        prompt: 'a heavy military merit medal, first-class honor, cracked red enamel, aged brass',
      },
      restored: {
        name: '修复勋章',
        prompt: 'a restored military medal, repaired enamel in red and gold, polished brass',
      },
      reforged: {
        name: '珍贵军功章',
        prompt: 'a rare early batch military merit medal, precious artifact, museum quality',
      },
    },
  },
  {
    id: 'zhao_cert',
    category: '古玩',
    states: {
      default: {
        name: '立功证书与合影',
        prompt: 'military commendation certificate with old group photo, yellowed paper, handwritten notes',
      },
      restored: {
        name: '修复证书',
        prompt: 'professionally preserved military documents in archival frame, acid-free treatment',
      },
      reforged: {
        name: '珍贵历史档案',
        prompt: 'rare historical military archives, important documents, museum-quality preservation',
      },
    },
  },
  {
    id: 'lin_watch',
    category: '钟表',
    states: {
      default: {
        name: '古董机械表',
        prompt: 'an old mechanical watch with yellowed dial, looks like cheap flea market item, deceiving',
      },
      restored: {
        name: '保养古董表',
        prompt: 'a serviced antique watch, restored movement, carefully maintained vintage timepiece',
      },
      reforged: {
        name: '传奇名表',
        prompt: 'a legendary vintage Rolex Daytona watch, iconic timepiece, priceless collector item',
      },
    },
  },
  {
    id: 'susan_bag',
    category: '奢侈品',
    states: {
      default: {
        name: '鳄鱼皮铂金包',
        prompt: 'a crocodile leather Birkin-style handbag, glossy exotic leather, golden hardware',
      },
      restored: {
        name: '清洁铂金包',
        prompt: 'a professionally cleaned luxury handbag, restored leather shine, polished hardware',
      },
      reforged: {
        name: '限量铂金包',
        prompt: 'a limited edition luxury Birkin handbag, exclusive design, premium fashion piece',
      },
    },
  },
];

// ============================================================================
// 人物定义
// ============================================================================

interface CharacterAssetDef {
  id: string;
  name: string;
  description: string;
  emotions: {
    neutral: string;
    grateful: string;
    resentful: string;
    desperate: string;
    angry: string;
  };
}

// 核心NPC人物资源定义
// 注意：prompt 现在只包含人物和表情描述，风格由 UNIFIED_STYLE 统一添加
const CHARACTER_ASSETS: CharacterAssetDef[] = [
  {
    id: 'emma',
    name: '艾玛',
    description: '年轻职场女性，面临失业危机',
    emotions: {
      neutral: 'a young professional woman in her late 20s, Asian features, neat business attire, slightly tired but composed, neutral expression',
      grateful: 'a young professional woman in her late 20s, Asian features, business attire, genuinely grateful, relieved smile with tearful eyes of joy',
      resentful: 'a young professional woman in her late 20s, Asian features, business attire, resentful bitter expression, disappointed eyes',
      desperate: 'a young professional woman in her late 20s, Asian features, disheveled appearance, desperate pleading, tear-stained anxious face',
      angry: 'a young professional woman in her late 20s, Asian features, business attire, angry confrontational, furrowed brows and tight lips',
    },
  },
  {
    id: 'zhao',
    name: '老赵',
    description: '退伍老兵，带着战友遗物',
    emotions: {
      neutral: 'an elderly Chinese military veteran in his 70s, weathered dignified face, worn neat clothes, stoic neutral, proud bearing',
      grateful: 'an elderly Chinese military veteran in his 70s, weathered face, grateful expression with respectful slight bow, misty appreciative eyes',
      resentful: 'an elderly Chinese military veteran in his 70s, weathered face, deeply hurt resentful look, betrayed disappointed dignity',
      desperate: 'an elderly Chinese military veteran in his 70s, weathered face, desperate pleading, trembling dignity with moist eyes',
      angry: 'an elderly Chinese military veteran in his 70s, weathered face, righteous angry expression, military bearing, intense eyes',
    },
  },
  {
    id: 'lin',
    name: '林先生',
    description: '落魄富商，不识宝物价值',
    emotions: {
      neutral: 'a middle-aged Chinese man in his 50s, once wealthy now fallen, expensive but worn suit, slightly dismissive, faded elegance',
      grateful: 'a middle-aged Chinese man in his 50s, worn elegant suit, surprised grateful expression, unexpected appreciation',
      resentful: 'a middle-aged Chinese man in his 50s, worn elegant suit, resentful bitter, wounded pride with cold disdainful eyes',
      desperate: 'a middle-aged Chinese man in his 50s, disheveled expensive clothes, desperate humiliated, fallen pride with pleading eyes',
      angry: 'a middle-aged Chinese man in his 50s, worn elegant suit, indignant angry, offended dignity and confrontational stance',
    },
  },
  {
    id: 'susan',
    name: '苏珊',
    description: '时尚名媛，带着假货',
    emotions: {
      neutral: 'a glamorous Chinese woman in her 40s, heavy makeup, designer clothes, confident slightly haughty expression',
      grateful: 'a glamorous Chinese woman in her 40s, designer clothes, relieved grateful, facade softening with genuine smile',
      resentful: 'a glamorous Chinese woman in her 40s, designer clothes, offended resentful, wounded pride and dismissive posture',
      desperate: 'a glamorous Chinese woman in her 40s, makeup smeared, desperate panicked, facade crumbling with fearful eyes',
      angry: 'a glamorous Chinese woman in her 40s, designer clothes, furious angry, exposed defensive with threatening posture',
    },
  },
  {
    id: 'generic_male_young',
    name: '年轻男性',
    description: '通用年轻男性顾客',
    emotions: {
      neutral: 'a young Chinese man in his 20s, casual modern clothes, neutral everyday expression, ordinary appearance',
      grateful: 'a young Chinese man in his 20s, casual clothes, grateful happy with relieved smile',
      resentful: 'a young Chinese man in his 20s, casual clothes, disappointed resentful, sulking expression',
      desperate: 'a young Chinese man in his 20s, casual clothes, desperate anxious with worried eyes',
      angry: 'a young Chinese man in his 20s, casual clothes, angry upset, confrontational expression',
    },
  },
  {
    id: 'generic_male_middle',
    name: '中年男性',
    description: '通用中年男性顾客',
    emotions: {
      neutral: 'a middle-aged Chinese man in his 40s, plain work clothes, tired neutral expression, working class appearance',
      grateful: 'a middle-aged Chinese man in his 40s, work clothes, grateful relieved with sincere appreciation',
      resentful: 'a middle-aged Chinese man in his 40s, work clothes, bitter resentful, life-weary eyes',
      desperate: 'a middle-aged Chinese man in his 40s, work clothes, desperate pleading, family burden showing',
      angry: 'a middle-aged Chinese man in his 40s, work clothes, frustrated angry with restrained rage',
    },
  },
  {
    id: 'generic_male_old',
    name: '老年男性',
    description: '通用老年男性顾客',
    emotions: {
      neutral: 'an elderly Chinese man in his 60s-70s, simple traditional clothes, calm neutral expression, dignified aging',
      grateful: 'an elderly Chinese man in his 60s-70s, simple clothes, warmly grateful with wise appreciation',
      resentful: 'an elderly Chinese man in his 60s-70s, simple clothes, sad resentful, disappointed wisdom',
      desperate: 'an elderly Chinese man in his 60s-70s, simple clothes, desperate worried, life burden showing',
      angry: 'an elderly Chinese man in his 60s-70s, simple clothes, stern angry, righteous indignation',
    },
  },
  {
    id: 'generic_female_young',
    name: '年轻女性',
    description: '通用年轻女性顾客',
    emotions: {
      neutral: 'a young Chinese woman in her 20s, casual modern clothes, neutral everyday expression, ordinary appearance',
      grateful: 'a young Chinese woman in her 20s, casual clothes, grateful happy with bright smile',
      resentful: 'a young Chinese woman in her 20s, casual clothes, hurt resentful, disappointed expression',
      desperate: 'a young Chinese woman in her 20s, casual clothes, desperate tearful with anxious eyes',
      angry: 'a young Chinese woman in her 20s, casual clothes, upset angry, emotional expression',
    },
  },
  {
    id: 'generic_female_middle',
    name: '中年女性',
    description: '通用中年女性顾客',
    emotions: {
      neutral: 'a middle-aged Chinese woman in her 40s, modest practical clothes, neutral tired expression, hardworking appearance',
      grateful: 'a middle-aged Chinese woman in her 40s, practical clothes, grateful relieved with motherly warmth',
      resentful: 'a middle-aged Chinese woman in her 40s, practical clothes, bitter resentful, life-weary expression',
      desperate: 'a middle-aged Chinese woman in her 40s, practical clothes, desperate pleading, family burden showing',
      angry: 'a middle-aged Chinese woman in her 40s, practical clothes, protective angry with fierce determination',
    },
  },
  {
    id: 'generic_female_old',
    name: '老年女性',
    description: '通用老年女性顾客',
    emotions: {
      neutral: 'an elderly Chinese woman in her 60s-70s, simple traditional clothes, kind neutral expression, gentle aging',
      grateful: 'an elderly Chinese woman in her 60s-70s, simple clothes, warmly grateful with grandmotherly smile',
      resentful: 'an elderly Chinese woman in her 60s-70s, simple clothes, sad resentful, disappointed wisdom',
      desperate: 'an elderly Chinese woman in her 60s-70s, simple clothes, desperate worried, fragile dignity',
      angry: 'an elderly Chinese woman in her 60s-70s, simple clothes, stern disappointed, righteous anger',
    },
  },
];

// ============================================================================
// API 调用
// ============================================================================

interface GenerateImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        // API 可能使用不同的字段名
        inline_data?: {
          mimeType: string;
          data: string;
        };
        inlineData?: {
          mimeType: string;
          data: string;
        };
        file_data?: {
          mime_type: string;
          data: string;
        };
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type AssetType = 'item' | 'character';

function buildStyledPrompt(basePrompt: string, assetType: AssetType): string {
  const style = UNIFIED_STYLE[assetType];
  return `${style.prefix} ${basePrompt}. ${style.suffix}`;
}

async function generateImage(prompt: string, assetType: AssetType = 'item'): Promise<Buffer | null> {
  const styledPrompt = buildStyledPrompt(prompt, assetType);

  // 根据官方文档的 curl 示例格式
  const requestBody = {
    contents: [{
      parts: [{ text: styledPrompt }]
    }],
    generationConfig: {
      imageConfig: {
        aspectRatio: IMAGE_CONFIG.aspectRatio,
        imageSize: IMAGE_CONFIG.imageSize,
      },
    },
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 使用 header 方式传递 API key（与官方文档一致）
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      const data: GenerateImageResponse = await response.json();

      if (data.error) {
        console.error(`  [!] API Error: ${data.error.message}`);
        if (attempt < MAX_RETRIES) {
          console.log(`  [*] Retrying in ${RETRY_DELAY_MS / 1000}s... (${attempt}/${MAX_RETRIES})`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        return null;
      }

      const parts = data.candidates?.[0]?.content?.parts;
      if (!parts) {
        console.error('  [!] No parts in response');
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        return null;
      }

      for (const part of parts) {
        // 检查所有可能的图片数据字段名
        const imageData = part.inline_data?.data
          || part.inlineData?.data
          || part.file_data?.data;

        if (imageData) {
          return Buffer.from(imageData, 'base64');
        }
      }

      console.error('  [!] No image data in response');
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      return null;
    } catch (error) {
      console.error(`  [!] Request failed: ${error}`);
      if (attempt < MAX_RETRIES) {
        console.log(`  [*] Retrying in ${RETRY_DELAY_MS / 1000}s... (${attempt}/${MAX_RETRIES})`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      return null;
    }
  }

  return null;
}

// ============================================================================
// 生成逻辑
// ============================================================================

async function generateItemAssets(itemFilter?: string): Promise<void> {
  console.log('\n========================================');
  console.log('  生成物品图标');
  console.log('========================================\n');

  // 确保目录存在
  if (!fs.existsSync(ITEMS_DIR)) {
    fs.mkdirSync(ITEMS_DIR, { recursive: true });
  }

  const items = itemFilter
    ? ITEM_ASSETS.filter(item => item.id.includes(itemFilter))
    : ITEM_ASSETS;

  if (items.length === 0) {
    console.log(`没有找到匹配 "${itemFilter}" 的物品`);
    return;
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    console.log(`\n[${item.id}] ${item.category}`);

    for (const [state, info] of Object.entries(item.states)) {
      const filename = `${item.id}_${state}.png`;
      const filepath = path.join(ITEMS_DIR, filename);

      if (fs.existsSync(filepath)) {
        console.log(`  ✓ ${state}: ${info.name} (已存在，跳过)`);
        skipped++;
        continue;
      }

      process.stdout.write(`  ○ ${state}: ${info.name} ...`);

      const imageBuffer = await generateImage(info.prompt, 'item');

      if (imageBuffer) {
        fs.writeFileSync(filepath, imageBuffer);
        console.log(` ✓ 完成`);
        generated++;
      } else {
        console.log(` ✗ 失败`);
        failed++;
      }

      // 避免 API 速率限制
      await sleep(500);
    }
  }

  console.log('\n----------------------------------------');
  console.log(`物品图标生成完成: ${generated} 生成, ${skipped} 跳过, ${failed} 失败`);
}

async function generateCharacterAssets(characterFilter?: string): Promise<void> {
  console.log('\n========================================');
  console.log('  生成人物头像');
  console.log('========================================\n');

  // 确保目录存在
  if (!fs.existsSync(CHARACTERS_DIR)) {
    fs.mkdirSync(CHARACTERS_DIR, { recursive: true });
  }

  const characters = characterFilter
    ? CHARACTER_ASSETS.filter(char => char.id.includes(characterFilter))
    : CHARACTER_ASSETS;

  if (characters.length === 0) {
    console.log(`没有找到匹配 "${characterFilter}" 的人物`);
    return;
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const character of characters) {
    console.log(`\n[${character.id}] ${character.name} - ${character.description}`);

    // 为每个角色创建子目录
    const charDir = path.join(CHARACTERS_DIR, character.id);
    if (!fs.existsSync(charDir)) {
      fs.mkdirSync(charDir, { recursive: true });
    }

    for (const [emotion, prompt] of Object.entries(character.emotions)) {
      const filename = `${emotion}.png`;
      const filepath = path.join(charDir, filename);

      if (fs.existsSync(filepath)) {
        console.log(`  ✓ ${emotion} (已存在，跳过)`);
        skipped++;
        continue;
      }

      process.stdout.write(`  ○ ${emotion} ...`);

      const imageBuffer = await generateImage(prompt, 'character');

      if (imageBuffer) {
        fs.writeFileSync(filepath, imageBuffer);
        console.log(` ✓ 完成`);
        generated++;
      } else {
        console.log(` ✗ 失败`);
        failed++;
      }

      // 避免 API 速率限制
      await sleep(500);
    }
  }

  console.log('\n----------------------------------------');
  console.log(`人物头像生成完成: ${generated} 生成, ${skipped} 跳过, ${failed} 失败`);
}

// ============================================================================
// 资源清单生成
// ============================================================================

function generateManifest(): void {
  console.log('\n生成资源清单...');

  const manifest = {
    generatedAt: new Date().toISOString(),
    items: {} as Record<string, { states: string[]; files: string[] }>,
    characters: {} as Record<string, { emotions: string[]; files: string[] }>,
  };

  // 扫描物品
  if (fs.existsSync(ITEMS_DIR)) {
    const files = fs.readdirSync(ITEMS_DIR).filter(f => f.endsWith('.png'));
    for (const file of files) {
      const match = file.match(/^(.+)_(default|restored|reforged)\.png$/);
      if (match) {
        const [, itemId, state] = match;
        if (!manifest.items[itemId]) {
          manifest.items[itemId] = { states: [], files: [] };
        }
        manifest.items[itemId].states.push(state);
        manifest.items[itemId].files.push(file);
      }
    }
  }

  // 扫描人物
  if (fs.existsSync(CHARACTERS_DIR)) {
    const charDirs = fs.readdirSync(CHARACTERS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const charId of charDirs) {
      const charDir = path.join(CHARACTERS_DIR, charId);
      const files = fs.readdirSync(charDir).filter(f => f.endsWith('.png'));
      manifest.characters[charId] = {
        emotions: files.map(f => f.replace('.png', '')),
        files: files.map(f => `${charId}/${f}`),
      };
    }
  }

  const manifestPath = path.join(ASSETS_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`资源清单已保存到: ${manifestPath}`);
}

// ============================================================================
// 主程序
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const filter = args[1];

  console.log('╔════════════════════════════════════════╗');
  console.log('║  Pawn Shop Asset Generator             ║');
  console.log('║  Using Nano Banana Pro (Gemini 3 Pro)  ║');
  console.log('╚════════════════════════════════════════╝');

  switch (command) {
    case 'items':
      await generateItemAssets(filter);
      generateManifest();
      break;

    case 'characters':
      await generateCharacterAssets(filter);
      generateManifest();
      break;

    case 'all':
      await generateItemAssets();
      await generateCharacterAssets();
      generateManifest();
      break;

    case 'manifest':
      generateManifest();
      break;

    case 'list':
      console.log('\n可用物品:');
      for (const item of ITEM_ASSETS) {
        console.log(`  - ${item.id} (${item.category}): ${Object.keys(item.states).join(', ')}`);
      }
      console.log('\n可用人物:');
      for (const char of CHARACTER_ASSETS) {
        console.log(`  - ${char.id} (${char.name}): ${Object.keys(char.emotions).join(', ')}`);
      }
      break;

    case 'help':
    default:
      console.log(`
用法:
  npx tsx scripts/generate-assets.ts <command> [filter]

命令:
  items [filter]       生成物品图标 (可选: 按ID过滤)
  characters [filter]  生成人物头像 (可选: 按ID过滤)
  all                  生成所有资源
  manifest             只生成资源清单
  list                 列出所有可生成的资源
  help                 显示此帮助信息

示例:
  npx tsx scripts/generate-assets.ts items           # 生成所有物品
  npx tsx scripts/generate-assets.ts items watch     # 只生成包含 "watch" 的物品
  npx tsx scripts/generate-assets.ts characters emma # 只生成 emma 的头像
  npx tsx scripts/generate-assets.ts all             # 生成所有资源

输出目录:
  物品: assets/items/
  人物: assets/characters/
`);
      break;
  }
}

main().catch(console.error);
