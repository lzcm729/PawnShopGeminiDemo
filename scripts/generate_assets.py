#!/usr/bin/env python3
"""
资源生成脚本 - 使用 Nano Banana Pro (Gemini 3 Pro Image) 生成游戏资源

用法:
    python scripts/generate_assets.py items           # 生成物品图标
    python scripts/generate_assets.py characters      # 生成人物头像
    python scripts/generate_assets.py all             # 生成所有资源
    python scripts/generate_assets.py items watch     # 只生成匹配的物品
    python scripts/generate_assets.py list            # 列出可生成的资源

按 Ctrl+C 可随时中断
"""

import os
import sys
import json
import base64
import time
import signal
from pathlib import Path
from typing import Optional
from urllib import request, error

# ============================================================================
# 配置
# ============================================================================

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
ASSETS_DIR = PROJECT_ROOT / "assets"
ITEMS_DIR = ASSETS_DIR / "items"
CHARACTERS_DIR = ASSETS_DIR / "characters"

# 从 .env 文件加载 API 密钥
def load_env():
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()

load_env()

API_KEY = os.environ.get("NANO_BANANA_API_KEY") or os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("错误: 未设置 NANO_BANANA_API_KEY 或 GEMINI_API_KEY")
    print("请在 .env 文件中设置 API 密钥")
    sys.exit(1)

API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent"

# 重试配置
MAX_RETRIES = 3
RETRY_DELAY = 2

# 全局中断标志
interrupted = False

def signal_handler(sig, frame):
    global interrupted
    print("\n\n⚠ 收到中断信号，正在停止...")
    interrupted = True

signal.signal(signal.SIGINT, signal_handler)

# ============================================================================
# 统一风格定义
# ============================================================================

STYLE = {
    "item": {
        "prefix": "Watercolor illustration, single isolated object:",
        "suffix": "Hand-painted watercolor style, soft brush strokes, warm muted colors, fine ink outlines. Object floating on pure cream white paper, gentle watercolor splash behind object only, absolutely no background scene, no table, no surface, no environment, no context. Product illustration style, clean minimal, centered composition."
    },
    "character": {
        "prefix": "Hand-painted watercolor portrait of",
        "suffix": "Soft watercolor brush strokes, warm skin tones, gentle diffused lighting, visible paper texture, artistic organic edges, delicate ink outlines for features, expressive eyes. Bust portrait, cream-colored background with subtle color wash, emotional and intimate."
    }
}

# ============================================================================
# 物品定义
# ============================================================================

ITEMS = {
    "watch_01": {
        "category": "钟表",
        "states": {
            "default": ("停摆的旧表", "a vintage brass pocket watch, tarnished and dusty case, old and worn"),
            "restored": ("精工润滑的怀表", "a polished brass pocket watch, warm golden glow, visible working gears"),
            "reforged": ("维多利亚时期金表", "an ornate gold pocket watch with decorative engravings, antique luxury"),
        }
    },
    "ring_01": {
        "category": "首饰",
        "states": {
            "default": ("蒙尘的戒指", "a dusty tarnished silver ring, covered in fine dust, showing weight and craftsmanship beneath grime"),
            "restored": ("抛光银戒", "a polished silver ring with mirror finish, delicate engraving visible on inner band"),
            "reforged": ("名门传家宝", "an antique noble family heirloom ring with precious gemstone, century-old intricate craftsmanship"),
        }
    },
    "painting_01": {
        "category": "艺术品",
        "states": {
            "default": ("褪色的油画", "a faded landscape oil painting in worn gilded frame, colors washed out, dusty surface"),
            "restored": ("修复的风景画", "a restored landscape oil painting, vivid colors revealed, delicate brushwork, clean frame"),
            "reforged": ("失落大师真迹", "a masterpiece landscape painting in museum-quality frame, remarkable brushwork, precious artwork"),
        }
    },
    "vase_01": {
        "category": "古董",
        "states": {
            "default": ("裂纹花瓶", "a blue and white Chinese porcelain vase with visible hairline crack, beautiful glaze"),
            "restored": ("修补古瓷", "a restored porcelain vase with golden kintsugi repair lines, blue and white pattern"),
            "reforged": ("官窑珍品", "an imperial Chinese official kiln porcelain vase, rare Qing dynasty, exquisite blue pattern"),
        }
    },
    "book_01": {
        "category": "书籍",
        "states": {
            "default": ("虫蛀旧书", "an old leather-bound book with yellowed pages, worm-eaten edges, damaged but readable"),
            "restored": ("精装古籍", "a restored antique book with new leather binding, gilt lettering, preserved pages"),
            "reforged": ("孤本善本", "an extremely rare first edition book, priceless manuscript, museum-quality preservation"),
        }
    },
    "watch_gambler": {
        "category": "钟表",
        "states": {
            "default": ("金标手表", "a gold-plated wristwatch with scratched face, loose leather strap, slightly worn"),
            "restored": ("保养后的金表", "a serviced gold wristwatch, polished case, new brown leather strap, elegant"),
            "reforged": ("名牌限量款", "a limited edition luxury gold watch, vintage collector piece, exceptional craftsmanship"),
        }
    },
    "console_student": {
        "category": "电子产品",
        "states": {
            "default": ("便携游戏机", "a handheld gaming console, screen protector on, colorful buttons, portable device"),
            "restored": ("翻新游戏机", "a refurbished handheld gaming console, cleaned and polished, like-new condition"),
            "reforged": ("珍藏限定版", "a limited edition handheld gaming console, rare collector version, special design"),
        }
    },
    "diamond_mystery": {
        "category": "珠宝",
        "states": {
            "default": ("裸钻", "a loose diamond about 1 carat on dark velvet, brilliant cut, mysterious sparkle"),
            "restored": ("净度提升钻石", "a recut diamond with improved clarity, sparkling facets, professional cut"),
            "reforged": ("传奇名钻", "a legendary diamond with exceptional brilliance, priceless gemstone, museum quality"),
        }
    },
    "emma_clothes": {
        "category": "服饰",
        "states": {
            "default": ("名牌职业套装", "a designer professional suit jacket and skirt, high-end fashion, quality fabric"),
            "restored": ("干洗职业套装", "a freshly dry-cleaned designer suit, crisp pressed fabric, elegant business wear"),
            "reforged": ("设计师定制款", "a rare designer custom-made suit, haute couture piece, fashion collectible"),
        }
    },
    "emma_skincare": {
        "category": "奢侈品",
        "states": {
            "default": ("贵妇面霜礼盒", "an unopened luxury skincare gift box, elegant gold packaging, premium cosmetics"),
            "restored": ("保鲜护肤套装", "a preserved luxury skincare set, resealed packaging, premium beauty products"),
            "reforged": ("限量珍藏版", "a discontinued limited edition luxury skincare set, rare collectible cosmetics"),
        }
    },
    "emma_laptop": {
        "category": "电子产品",
        "states": {
            "default": ("轻薄笔记本", "a thin laptop covered in colorful stickers, worn keyboard, used portable computer"),
            "restored": ("翻新笔记本", "a refurbished silver laptop, cleaned and upgraded, sleek modern design"),
            "reforged": ("珍藏版笔记本", "a limited commemorative edition laptop, rare collector item, premium design"),
        }
    },
    "emma_watch": {
        "category": "钟表",
        "states": {
            "default": ("男士机械表", "an old men's mechanical wristwatch, broken leather strap, vintage but worn"),
            "restored": ("保养机械表", "a serviced mechanical watch, new strap, polished case, elegant vintage piece"),
            "reforged": ("古董名表", "an early Swiss brand antique watch, valuable vintage timepiece, collector quality"),
        }
    },
    "zhao_medal": {
        "category": "古玩",
        "states": {
            "default": ("一等功勋章", "a heavy military merit medal, first-class honor, cracked red enamel, aged brass"),
            "restored": ("修复勋章", "a restored military medal, repaired enamel in red and gold, polished brass"),
            "reforged": ("珍贵军功章", "a rare early batch military merit medal, precious artifact, museum quality"),
        }
    },
    "zhao_cert": {
        "category": "古玩",
        "states": {
            "default": ("立功证书与合影", "military commendation certificate with old group photo, yellowed paper, handwritten notes"),
            "restored": ("修复证书", "professionally preserved military documents in archival frame, acid-free treatment"),
            "reforged": ("珍贵历史档案", "rare historical military archives, important documents, museum-quality preservation"),
        }
    },
    "lin_watch": {
        "category": "钟表",
        "states": {
            "default": ("古董机械表", "an old mechanical watch with yellowed dial, looks like cheap flea market item, deceiving"),
            "restored": ("保养古董表", "a serviced antique watch, restored movement, carefully maintained vintage timepiece"),
            "reforged": ("传奇名表", "a legendary vintage Rolex Daytona watch, iconic timepiece, priceless collector item"),
        }
    },
    "susan_bag": {
        "category": "奢侈品",
        "states": {
            "default": ("鳄鱼皮铂金包", "a crocodile leather Birkin-style handbag, glossy exotic leather, golden hardware"),
            "restored": ("清洁铂金包", "a professionally cleaned luxury handbag, restored leather shine, polished hardware"),
            "reforged": ("限量铂金包", "a limited edition luxury Birkin handbag, exclusive design, premium fashion piece"),
        }
    },
}

# ============================================================================
# 人物定义
# ============================================================================

CHARACTERS = {
    "emma": {
        "name": "艾玛",
        "description": "年轻职场女性，面临失业危机",
        "emotions": {
            "neutral": "a young professional woman in her late 20s, Asian features, neat business attire, slightly tired but composed, neutral expression",
            "grateful": "a young professional woman in her late 20s, Asian features, business attire, genuinely grateful, relieved smile with tearful eyes of joy",
            "resentful": "a young professional woman in her late 20s, Asian features, business attire, resentful bitter expression, disappointed eyes",
            "desperate": "a young professional woman in her late 20s, Asian features, disheveled appearance, desperate pleading, tear-stained anxious face",
            "angry": "a young professional woman in her late 20s, Asian features, business attire, angry confrontational, furrowed brows and tight lips",
        }
    },
    "zhao": {
        "name": "老赵",
        "description": "退伍老兵，带着战友遗物",
        "emotions": {
            "neutral": "an elderly Chinese military veteran in his 70s, weathered dignified face, worn neat clothes, stoic neutral, proud bearing",
            "grateful": "an elderly Chinese military veteran in his 70s, weathered face, grateful expression with respectful slight bow, misty appreciative eyes",
            "resentful": "an elderly Chinese military veteran in his 70s, weathered face, deeply hurt resentful look, betrayed disappointed dignity",
            "desperate": "an elderly Chinese military veteran in his 70s, weathered face, desperate pleading, trembling dignity with moist eyes",
            "angry": "an elderly Chinese military veteran in his 70s, weathered face, righteous angry expression, military bearing, intense eyes",
        }
    },
    "lin": {
        "name": "林先生",
        "description": "落魄富商，不识宝物价值",
        "emotions": {
            "neutral": "a middle-aged Chinese man in his 50s, once wealthy now fallen, expensive but worn suit, slightly dismissive, faded elegance",
            "grateful": "a middle-aged Chinese man in his 50s, worn elegant suit, surprised grateful expression, unexpected appreciation",
            "resentful": "a middle-aged Chinese man in his 50s, worn elegant suit, resentful bitter, wounded pride with cold disdainful eyes",
            "desperate": "a middle-aged Chinese man in his 50s, disheveled expensive clothes, desperate humiliated, fallen pride with pleading eyes",
            "angry": "a middle-aged Chinese man in his 50s, worn elegant suit, indignant angry, offended dignity and confrontational stance",
        }
    },
    "susan": {
        "name": "苏珊",
        "description": "时尚名媛，带着假货",
        "emotions": {
            "neutral": "a glamorous Chinese woman in her 40s, heavy makeup, designer clothes, confident slightly haughty expression",
            "grateful": "a glamorous Chinese woman in her 40s, designer clothes, relieved grateful, facade softening with genuine smile",
            "resentful": "a glamorous Chinese woman in her 40s, designer clothes, offended resentful, wounded pride and dismissive posture",
            "desperate": "a glamorous Chinese woman in her 40s, makeup smeared, desperate panicked, facade crumbling with fearful eyes",
            "angry": "a glamorous Chinese woman in her 40s, designer clothes, furious angry, exposed defensive with threatening posture",
        }
    },
    "generic_male_young": {
        "name": "年轻男性",
        "description": "通用年轻男性顾客",
        "emotions": {
            "neutral": "a young Chinese man in his 20s, casual modern clothes, neutral everyday expression, ordinary appearance",
            "grateful": "a young Chinese man in his 20s, casual clothes, grateful happy with relieved smile",
            "resentful": "a young Chinese man in his 20s, casual clothes, disappointed resentful, sulking expression",
            "desperate": "a young Chinese man in his 20s, casual clothes, desperate anxious with worried eyes",
            "angry": "a young Chinese man in his 20s, casual clothes, angry upset, confrontational expression",
        }
    },
    "generic_male_middle": {
        "name": "中年男性",
        "description": "通用中年男性顾客",
        "emotions": {
            "neutral": "a middle-aged Chinese man in his 40s, plain work clothes, tired neutral expression, working class appearance",
            "grateful": "a middle-aged Chinese man in his 40s, work clothes, grateful relieved with sincere appreciation",
            "resentful": "a middle-aged Chinese man in his 40s, work clothes, bitter resentful, life-weary eyes",
            "desperate": "a middle-aged Chinese man in his 40s, work clothes, desperate pleading, family burden showing",
            "angry": "a middle-aged Chinese man in his 40s, work clothes, frustrated angry with restrained rage",
        }
    },
    "generic_male_old": {
        "name": "老年男性",
        "description": "通用老年男性顾客",
        "emotions": {
            "neutral": "an elderly Chinese man in his 60s-70s, simple traditional clothes, calm neutral expression, dignified aging",
            "grateful": "an elderly Chinese man in his 60s-70s, simple clothes, warmly grateful with wise appreciation",
            "resentful": "an elderly Chinese man in his 60s-70s, simple clothes, sad resentful, disappointed wisdom",
            "desperate": "an elderly Chinese man in his 60s-70s, simple clothes, desperate worried, life burden showing",
            "angry": "an elderly Chinese man in his 60s-70s, simple clothes, stern angry, righteous indignation",
        }
    },
    "generic_female_young": {
        "name": "年轻女性",
        "description": "通用年轻女性顾客",
        "emotions": {
            "neutral": "a young Chinese woman in her 20s, casual modern clothes, neutral everyday expression, ordinary appearance",
            "grateful": "a young Chinese woman in her 20s, casual clothes, grateful happy with bright smile",
            "resentful": "a young Chinese woman in her 20s, casual clothes, hurt resentful, disappointed expression",
            "desperate": "a young Chinese woman in her 20s, casual clothes, desperate tearful with anxious eyes",
            "angry": "a young Chinese woman in her 20s, casual clothes, upset angry, emotional expression",
        }
    },
    "generic_female_middle": {
        "name": "中年女性",
        "description": "通用中年女性顾客",
        "emotions": {
            "neutral": "a middle-aged Chinese woman in her 40s, modest practical clothes, neutral tired expression, hardworking appearance",
            "grateful": "a middle-aged Chinese woman in her 40s, practical clothes, grateful relieved with motherly warmth",
            "resentful": "a middle-aged Chinese woman in her 40s, practical clothes, bitter resentful, life-weary expression",
            "desperate": "a middle-aged Chinese woman in her 40s, practical clothes, desperate pleading, family burden showing",
            "angry": "a middle-aged Chinese woman in her 40s, practical clothes, protective angry with fierce determination",
        }
    },
    "generic_female_old": {
        "name": "老年女性",
        "description": "通用老年女性顾客",
        "emotions": {
            "neutral": "an elderly Chinese woman in her 60s-70s, simple traditional clothes, kind neutral expression, gentle aging",
            "grateful": "an elderly Chinese woman in her 60s-70s, simple clothes, warmly grateful with grandmotherly smile",
            "resentful": "an elderly Chinese woman in her 60s-70s, simple clothes, sad resentful, disappointed wisdom",
            "desperate": "an elderly Chinese woman in her 60s-70s, simple clothes, desperate worried, fragile dignity",
            "angry": "an elderly Chinese woman in her 60s-70s, simple clothes, stern disappointed, righteous anger",
        }
    },
}

# ============================================================================
# API 调用
# ============================================================================

def generate_image(prompt: str, asset_type: str) -> Optional[bytes]:
    """生成单张图片"""
    style = STYLE[asset_type]
    full_prompt = f"{style['prefix']} {prompt}. {style['suffix']}"

    body = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "imageConfig": {
                "aspectRatio": "1:1",
                "imageSize": "1K"
            }
        }
    }

    data = json.dumps(body).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
    }

    for attempt in range(1, MAX_RETRIES + 1):
        if interrupted:
            return None

        try:
            req = request.Request(API_ENDPOINT, data=data, headers=headers, method="POST")
            with request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode("utf-8"))

            # 解析响应
            candidates = result.get("candidates", [])
            if not candidates:
                print(f" [!] 无候选结果", end="")
                continue

            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                # 检查所有可能的图片数据字段
                img_data = (
                    part.get("inline_data", {}).get("data") or
                    part.get("inlineData", {}).get("data") or
                    part.get("file_data", {}).get("data")
                )
                if img_data:
                    return base64.b64decode(img_data)

            print(f" [!] 响应中无图片数据", end="")

        except error.HTTPError as e:
            print(f" [!] HTTP错误 {e.code}", end="")
        except error.URLError as e:
            print(f" [!] 网络错误: {e.reason}", end="")
        except Exception as e:
            print(f" [!] 错误: {e}", end="")

        if attempt < MAX_RETRIES:
            print(f" (重试 {attempt}/{MAX_RETRIES})", end="")
            time.sleep(RETRY_DELAY)

    return None

# ============================================================================
# 生成逻辑
# ============================================================================

def generate_items(filter_str: Optional[str] = None):
    """生成物品图标"""
    global interrupted

    print("\n" + "=" * 40)
    print("  生成物品图标")
    print("=" * 40 + "\n")

    ITEMS_DIR.mkdir(parents=True, exist_ok=True)

    items = {k: v for k, v in ITEMS.items() if not filter_str or filter_str in k}
    if not items:
        print(f"没有找到匹配 '{filter_str}' 的物品")
        return

    generated = skipped = failed = 0

    for item_id, item_data in items.items():
        if interrupted:
            break

        print(f"\n[{item_id}] {item_data['category']}")

        # 为每个物品创建子文件夹
        item_dir = ITEMS_DIR / item_id
        item_dir.mkdir(exist_ok=True)

        for state, (name, prompt) in item_data["states"].items():
            if interrupted:
                break

            filepath = item_dir / f"{state}.png"

            if filepath.exists():
                print(f"  ✓ {state}: {name} (已存在，跳过)")
                skipped += 1
                continue

            print(f"  ○ {state}: {name} ...", end="", flush=True)

            img_data = generate_image(prompt, "item")

            if img_data:
                filepath.write_bytes(img_data)
                print(" ✓ 完成")
                generated += 1
            else:
                print(" ✗ 失败")
                failed += 1

            time.sleep(0.5)  # 避免速率限制

    print("\n" + "-" * 40)
    print(f"物品图标: {generated} 生成, {skipped} 跳过, {failed} 失败")
    if interrupted:
        print("(已中断)")


def generate_characters(filter_str: Optional[str] = None):
    """生成人物头像"""
    global interrupted

    print("\n" + "=" * 40)
    print("  生成人物头像")
    print("=" * 40 + "\n")

    CHARACTERS_DIR.mkdir(parents=True, exist_ok=True)

    chars = {k: v for k, v in CHARACTERS.items() if not filter_str or filter_str in k}
    if not chars:
        print(f"没有找到匹配 '{filter_str}' 的人物")
        return

    generated = skipped = failed = 0

    for char_id, char_data in chars.items():
        if interrupted:
            break

        print(f"\n[{char_id}] {char_data['name']} - {char_data['description']}")

        char_dir = CHARACTERS_DIR / char_id
        char_dir.mkdir(exist_ok=True)

        for emotion, prompt in char_data["emotions"].items():
            if interrupted:
                break

            filepath = char_dir / f"{emotion}.png"

            if filepath.exists():
                print(f"  ✓ {emotion} (已存在，跳过)")
                skipped += 1
                continue

            print(f"  ○ {emotion} ...", end="", flush=True)

            img_data = generate_image(prompt, "character")

            if img_data:
                filepath.write_bytes(img_data)
                print(" ✓ 完成")
                generated += 1
            else:
                print(" ✗ 失败")
                failed += 1

            time.sleep(0.5)

    print("\n" + "-" * 40)
    print(f"人物头像: {generated} 生成, {skipped} 跳过, {failed} 失败")
    if interrupted:
        print("(已中断)")


def generate_manifest():
    """生成资源清单"""
    manifest = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "items": {},
        "characters": {}
    }

    # 扫描物品 (按文件夹)
    if ITEMS_DIR.exists():
        for item_dir in ITEMS_DIR.iterdir():
            if item_dir.is_dir():
                files = list(item_dir.glob("*.png"))
                manifest["items"][item_dir.name] = {
                    "states": [f.stem for f in files],
                    "files": [f"{item_dir.name}/{f.name}" for f in files]
                }

    # 扫描人物
    if CHARACTERS_DIR.exists():
        for char_dir in CHARACTERS_DIR.iterdir():
            if char_dir.is_dir():
                files = list(char_dir.glob("*.png"))
                manifest["characters"][char_dir.name] = {
                    "emotions": [f.stem for f in files],
                    "files": [f"{char_dir.name}/{f.name}" for f in files]
                }

    manifest_path = ASSETS_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n资源清单已保存到: {manifest_path}")


def list_assets():
    """列出所有可生成的资源"""
    print("\n可用物品:")
    for item_id, data in ITEMS.items():
        states = ", ".join(data["states"].keys())
        print(f"  - {item_id} ({data['category']}): {states}")

    print("\n可用人物:")
    for char_id, data in CHARACTERS.items():
        emotions = ", ".join(data["emotions"].keys())
        print(f"  - {char_id} ({data['name']}): {emotions}")

    # 统计
    total_items = len(ITEMS) * 3
    total_chars = len(CHARACTERS) * 5
    print(f"\n总计: {total_items} 张物品图标, {total_chars} 张人物头像")


def show_help():
    print(__doc__)


# ============================================================================
# 主程序
# ============================================================================

def main():
    print("╔════════════════════════════════════════╗")
    print("║  Pawn Shop Asset Generator (Python)    ║")
    print("║  Using Nano Banana Pro                 ║")
    print("║  按 Ctrl+C 可随时中断                  ║")
    print("╚════════════════════════════════════════╝")

    args = sys.argv[1:]
    command = args[0] if args else "help"
    filter_str = args[1] if len(args) > 1 else None

    if command == "items":
        generate_items(filter_str)
        if not interrupted:
            generate_manifest()
    elif command == "characters":
        generate_characters(filter_str)
        if not interrupted:
            generate_manifest()
    elif command == "all":
        generate_items()
        if not interrupted:
            generate_characters()
        if not interrupted:
            generate_manifest()
    elif command == "manifest":
        generate_manifest()
    elif command == "list":
        list_assets()
    else:
        show_help()


if __name__ == "__main__":
    main()
