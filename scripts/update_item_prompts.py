#!/usr/bin/env python3
"""
Update prompts.json for all items:
1. Add counterfeit prompts to existing prompts.json
2. Update reforged prompts (old ones described counterfeit scenarios)
3. Create prompts.json for items that don't have one yet

Run: python scripts/update_item_prompts.py
"""

import json
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
ITEMS_DIR = PROJECT_ROOT / "assets" / "items"

# ===========================================================================
# Prompt definitions for ALL items
# Keys: item_id -> {default, restored, reforged, counterfeit}
# reforged = legitimate improvement (ART_ENHANCED)
# counterfeit = fake history/provenance (FAKE_HISTORY, IMPERIAL)
# ===========================================================================

PROMPTS = {
    "item_watch_01": {
        "default": "a vintage brass pocket watch, tarnished and dusty case, old and worn",
        "restored": "a polished brass pocket watch, warm golden glow, visible working gears",
        "reforged": "a pocket watch with enamel painted decorations on the case, moon phase complication, artistic and functional upgrade",
        "counterfeit": "an ornate gold pocket watch with fake royal crest engravings, Victorian-era styling, artificially aged to look antique"
    },
    "item_ring_01": {
        "default": "a dusty silver ring, tarnished and dull, but has weight and substance",
        "restored": "a polished silver ring, mirror-like surface, visible inscription inside",
        "reforged": "a silver ring with a semi-precious gemstone setting, brushed silver texture, upgraded quality",
        "counterfeit": "a silver ring presented as a noble family heirloom, with fake patina and forged provenance markings"
    },
    "item_painting_01": {
        "default": "a faded oil painting in a worn frame, colors mostly gone but composition still visible",
        "restored": "a restored landscape oil painting, vibrant colors revealed, fine brushwork",
        "reforged": "an oil painting in a hand-carved wooden frame with museum-quality anti-glare glass, professionally presented",
        "counterfeit": "an oil painting with a forged master's signature, artificially aged canvas, presented as a lost masterwork"
    },
    "item_vase_01": {
        "default": "a blue and white porcelain vase with a fine crack, glaze still lustrous",
        "restored": "a blue and white porcelain vase repaired with kintsugi gold, beautiful imperfection",
        "reforged": "a porcelain vase with elaborate gold kintsugi repair turned into decorative art, on a rosewood stand",
        "counterfeit": "a porcelain vase with forged imperial kiln marks on the base, fake dynasty provenance"
    },
    "item_book_01": {
        "default": "a worm-eaten old book, yellowed pages, moth damage at corners, but clear text",
        "restored": "a restored antique book, deacidified pages, new binding, reborn classic",
        "reforged": "an antique book in a custom hardcover slipcase with scholarly annotations booklet, collector's research edition",
        "counterfeit": "an old book forged to appear as the only surviving copy of a rare text, fake rarity"
    },
    "item_watch_gambler": {
        "default": "a gold watch with scratched surface and loose strap, heavy and substantial, cloudy movement",
        "restored": "a polished gold watch, clear movement sound, re-polished case",
        "reforged": "a gold watch with a hand-engraved custom dial and crocodile leather strap, upgraded luxury",
        "counterfeit": "a gold watch with forged luxury brand markings, fake limited edition serial number"
    },
    "item_console_student": {
        "default": "a handheld gaming console, screen protector intact, crisp button response",
        "restored": "a refurbished handheld gaming console, deep cleaned and system optimized, like new",
        "reforged": "a handheld gaming console with upgraded HD screen module and custom shell, enhanced performance",
        "counterfeit": "a handheld gaming console with fake limited edition markings and forged collaboration branding"
    },
    "item_diamond_mystery": {
        "default": "a loose diamond, about 1 carat, excellent cut, intentionally scratched girdle code",
        "restored": "a re-cut diamond with improved clarity and fire, sparkling brilliance",
        "reforged": "a perfectly re-cut hearts and arrows diamond, maximum brilliance and fire, top-tier cutting",
        "counterfeit": "a diamond with forged legendary provenance, fake history of famous ownership"
    },
    "emma_item_clothes": {
        "default": "a designer business suit, high-quality fabric, current season style",
        "restored": "a professionally dry-cleaned business suit, crisp and fresh",
        "reforged": "a business suit with altered tailoring, handmade toggle buttons and upgraded lining, refined fit",
        "counterfeit": "a business suit with forged designer label, fake early-career couture piece"
    },
    "emma_item_skincare": {
        "default": "an unopened luxury skincare gift set, elegant packaging",
        "restored": "a re-sealed luxury skincare set, quality preserved",
        "reforged": "a luxury skincare set repackaged in a deluxe gift box with velvet lining and handwritten card",
        "counterfeit": "a skincare set with forged limited edition labels, fake discontinued rare product"
    },
    "emma_item_laptop": {
        "default": "a sticker-covered laptop, worn keyboard, old model",
        "restored": "a refurbished laptop, upgraded hardware, fresh system install",
        "reforged": "a laptop with SSD and RAM upgrades, custom painted shell, enhanced performance and appearance",
        "counterfeit": "a laptop with forged commemorative edition branding, fake limited release"
    },
    "emma_item_watch": {
        "default": "a vintage men's mechanical watch, broken strap, some years old",
        "restored": "a serviced mechanical watch, movement restored, new strap",
        "reforged": "a mechanical watch with skeleton dial showing movement, handmade leather strap, artistic modification",
        "counterfeit": "a mechanical watch with forged Swiss brand markings, fake early vintage luxury piece"
    },
    "zhao_item_medal": {
        "default": "a heavy military medal of honor, enamel surface cracked",
        "restored": "a restored military medal, enamel surface gleaming",
        "reforged": "a military medal mounted in a custom display frame with velvet background, museum-quality presentation",
        "counterfeit": "a military medal with forged provenance documents, fake early-batch rare classification"
    },
    "zhao_item_cert": {
        "default": "a set of military commendation documents, handwritten names on edges",
        "restored": "restored military documents, deacidified and professionally mounted",
        "reforged": "military documents in museum-grade archival display book with acid-free paper and UV-protective cover",
        "counterfeit": "military documents with forged endorsement papers, fake classified historical significance"
    },
    "lin_item_watch": {
        "default": "a vintage mechanical watch, yellowed dial, looks like flea market junk",
        "restored": "a serviced vintage watch, precise movement restored",
        "reforged": "a fully serviced vintage watch with original-spec strap and authentication certificate, collector grade",
        "counterfeit": "a vintage watch with forged authentication papers, fake Rolex Paul Newman Daytona provenance"
    },
    "susan_item_bag": {
        "default": "a crocodile skin Birkin bag, glossy, shiny hardware",
        "restored": "a cleaned Birkin bag, leather restored to shine",
        "counterfeit": "a fake Birkin bag with artificially aged hardware and forged serial number, counterfeit luxury"
    },
    "item_violin_01": {
        "default": "a dusty small violin (NOT cello), held-under-chin size, broken strings, fine wood grain visible beneath dust, antique string instrument",
        "restored": "a restored small violin (NOT cello), new strings, warm amber varnish, polished body, ready to play",
        "reforged": "a small violin with carved scroll refinished, boxwood pegs, mother-of-pearl inlay on tailpiece, decorative and functional upgrade",
        "counterfeit": "a violin with a forged Italian luthier label inside, fake master craftsman provenance"
    },
    "item_guitar_01": {
        "default": "an old acoustic guitar with worn frets, scratched body, but resonant wood grain",
        "restored": "a restored acoustic guitar, adjusted neck, polished rosewood body, new strings",
        "reforged": "an acoustic guitar with shell inlays on fingerboard, refinished body, stainless steel frets, artisan upgrade",
        "counterfeit": "an acoustic guitar with a forged famous folk singer's autograph inside, fake celebrity provenance"
    },
    "item_camera_01": {
        "default": "a vintage film camera, slight lens fungus, rattling shutter sound",
        "restored": "a cleaned vintage film camera, clear lens, crisp shutter",
        "reforged": "a vintage camera with added external light meter and grip, titanium shutter curtain, enhanced functionality",
        "counterfeit": "a camera with forged Leica serial plate, fake limited edition early production"
    },
    "item_camera_02": {
        "default": "a twin-lens reflex camera, foggy viewfinder, cracked leather covering",
        "restored": "a refurbished TLR camera, new leather, realigned optics",
        "reforged": "a TLR camera with hand-stitched ostrich leather covering, lens hood and quick-release plate, unique and functional",
        "counterfeit": "a TLR camera with forged nameplate and production number, fake early classic model"
    },
    "item_stamp_01": {
        "default": "an old stamp album, yellowed pages, some stamps with creases",
        "restored": "an organized stamp album, stamps well preserved, clean mounting",
        "reforged": "a professionally mounted stamp collection with magnifying glass and detailed description cards, philatelist grade",
        "counterfeit": "a stamp album with a forged printing error stamp, fake rare misprint created artificially"
    },
    "item_coin_01": {
        "default": "a string of old copper coins, green patina, partially illegible characters",
        "restored": "cleaned ancient coins, natural patina, clear characters",
        "reforged": "select ancient coins mounted in a brocade display box with rubbings and authentication labels, connoisseur grade",
        "counterfeit": "ancient coins with forged patina and character features, one fake Song dynasty mother coin"
    },
    "item_figure_01": {
        "default": "a used action figure, loose joints, chipped paint",
        "restored": "a repainted action figure, repaired joints, like new condition",
        "reforged": "a hand-repainted art version action figure, gradient airbrush and weathering effects, far beyond factory quality",
        "counterfeit": "an action figure with forged limited edition number tag and fake original packaging"
    },
    "item_bag_01": {
        "default": "an old leather handbag, oxidized hardware, surface wear marks",
        "restored": "a cleaned and conditioned leather handbag, restored luster",
        "reforged": "a leather handbag with hand-dyed color and re-edged trim, vintage brass hardware replacement, refreshed style",
        "counterfeit": "a leather handbag with forged date code and brand markings, fake early limited edition"
    },
    "item_wallet_01": {
        "default": "a worn leather wallet, frayed edges, stained lining",
        "restored": "a conditioned leather wallet, soft texture restored",
        "reforged": "a leather wallet with saddle-stitched edges and upgraded premium lining, handcraft quality improvement",
        "counterfeit": "a leather wallet with forged monogram stamp, fake artisan custom piece"
    },
    "item_whisky_01": {
        "default": "an old whisky bottle, slightly worn label, liquid level slightly low",
        "restored": "a well-preserved whisky bottle, stable quality, professional cellar storage",
        "reforged": "a whisky bottle in a handmade wooden gift box with tasting guide booklet, premium gift presentation",
        "counterfeit": "a whisky bottle with forged cask number label and distillery certificate, fake single cask limited release"
    },
    "item_maotai_01": {
        "default": "a bottle of aged Moutai baijiu, intact seal, normal liquid level",
        "restored": "an authenticated Moutai bottle, verified vintage year",
        "reforged": "a Moutai bottle with professional authentication seal and temperature-controlled storage certificate, investment grade",
        "counterfeit": "a Moutai bottle with forged production date and batch number, fake 1980s vintage"
    },
    "item_inkstone_01": {
        "default": "an old inkstone with ink stains, chipped edges",
        "restored": "a cleaned Duan inkstone, fine stone texture, excellent ink grinding",
        "reforged": "an inkstone on a rosewood stand with calligrapher's inscription on the back, enhanced scholarly aesthetic",
        "counterfeit": "an inkstone with forged pit marks and fake authentication, disguised as rare Duan old-pit stone"
    },
    "item_seal_01": {
        "default": "an old seal stamp, residual ink on face, slight wear on knob",
        "restored": "a cleaned Shoushan stone seal, warm stone, clear inscription",
        "reforged": "a seal with newly carved face by a seal artist, in a brocade box with ink paste, functional and artistic",
        "counterfeit": "a seal with forged master carver side inscription, fake famous engraver attribution"
    },
    "item_necklace_01": {
        "default": "a blackened silver necklace, pendant covered in grime, vintage styling",
        "restored": "a polished silver necklace, gleaming pendant with sparkling gemstone",
        "reforged": "a necklace with re-set pendant and reinforced chain, improved durability and refinement",
        "counterfeit": "a silver necklace with artificial aging and fake Qing dynasty court style features"
    },
    "item_bracelet_01": {
        "default": "a dull jade bracelet, lackluster surface, seemingly stored for long time",
        "restored": "a cleaned jade bracelet, translucent quality gradually appearing",
        "reforged": "a jade bracelet with professional mirror polish, dramatically improved translucency and water head",
        "counterfeit": "a jade bracelet with forged grading certificate, fake old-pit ice jadeite classification"
    },
    "item_inkpainting_01": {
        "default": "a rolled ink painting, yellowed and moldy, but vigorous brushwork visible",
        "restored": "a re-mounted ink painting, clear ink layers, imposing composition",
        "reforged": "an ink painting re-mounted in Song-dynasty handscroll format with antique silk and rosewood roller, museum-grade presentation",
        "counterfeit": "an ink painting with forged collector seals and inscriptions, fake famous landscape master attribution"
    },
    "item_buddha_01": {
        "default": "a bronze Buddha statue covered in green patina, face obscured, heavy rust on base",
        "restored": "a cleaned bronze Buddha, warm metal tone, compassionate face, flowing lines",
        "reforged": "a bronze Buddha with partial gold leaf gilding, repainted and polished base, enhanced solemnity",
        "counterfeit": "a bronze Buddha with forged base inscription and artificial patina, fake Ming dynasty gilt bronze"
    },
    "item_threadbook_01": {
        "default": "a thread-bound book, severe worm damage, scattered binding, but clear woodblock text",
        "restored": "a restored thread-bound book, re-sewn binding, flat pages, legible text",
        "reforged": "a thread-bound book with hand-made rice paper reprints of missing pages and scholarly annotations, research edition",
        "counterfeit": "a thread-bound book with forged edition features and collector seals, fake Song dynasty woodblock print"
    },
    "item_phone_01": {
        "default": "an older smartphone, scratched screen, worn case, but runs smoothly",
        "restored": "a refurbished smartphone, new screen protector, clean and running well",
        "reforged": "a smartphone with custom back panel, optimized system and expanded storage, upgraded performance and look",
        "counterfeit": "a smartphone with forged model branding, fake designer collaboration limited colorway"
    },
    "item_jade_pendant_01": {
        "default": "a cloudy jade pendant, thick layer of grime, poor translucency",
        "restored": "a cleaned jade pendant, warm and delicate texture, faint oily luster",
        "reforged": "a jade pendant with hand-carved gold bail and silk cord, gold and jade complementing each other",
        "counterfeit": "a jade pendant with forged skin color and pore features, fake Hetian nephrite seedling jade"
    },
    "item_qipao_01": {
        "default": "a faded qipao dress, yellowed silk, loose frog buttons, but exquisite tailoring",
        "restored": "a restored qipao, color revived, professional repair and dyeing",
        "reforged": "a qipao with modernized neo-Chinese styling, new handmade frog buttons, blend of traditional and contemporary",
        "counterfeit": "a qipao with forged tailor marks, fake Republic-era Shanghai master tailor provenance with French silk"
    },
    "item_jacket_01": {
        "default": "a worn leather jacket, multiple scuffs, stiff zipper, pilled lining",
        "restored": "a conditioned leather jacket, soft restored texture, replaced zipper",
        "reforged": "a leather jacket with brass rivets and custom zipper pulls, silk lining, punk meets comfort upgrade",
        "counterfeit": "a leather jacket with forged rock star signature in lining, fake celebrity stage costume"
    },
    "item_watchbox_01": {
        "default": "a dusty wooden watch box, loose hinges, but intact lining",
        "restored": "a cleaned watch box, fine wood grain, restored hardware and lining",
        "reforged": "a watch box with silent hinges, suede lining upgrade, and automatic winding turntable added",
        "counterfeit": "a watch box with forged luxury brand logo and limited edition number, fake premium collection set"
    },
    "item_scarf_01": {
        "default": "a pilled silk scarf, creased, but still vibrant colors",
        "restored": "a professionally cleaned silk scarf, smooth and colorful",
        "reforged": "a silk scarf with hand-painted corner accents by an artist, unique artistic touch",
        "counterfeit": "a silk scarf with forged luxury brand label, fake artist collaboration limited edition"
    },
    "item_bronze_mirror_01": {
        "default": "a heavily corroded bronze mirror, barely visible patterns, very heavy",
        "restored": "a cleaned bronze mirror, beautiful patterns emerging, fine casting quality",
        "reforged": "a bronze mirror on a huanghuali wood display stand with acrylic cover, exhibition-quality presentation",
        "counterfeit": "a bronze mirror with forged alloy composition and artificial patina, fake Tang dynasty grape mirror"
    },
    "item_jade_tablet_01": {
        "default": "a dull jade plaque, grayish surface, decent but unclear carving",
        "restored": "a nurtured jade plaque, gradually warming texture, clear carving visible",
        "reforged": "a jade plaque with refined carving details and added border ornaments, hand-braided cord, wearable and collectible",
        "counterfeit": "a jade plaque with forged period features and carving style, fake Qianlong-era imperial jade work"
    },
    "item_pocketwatch_01": {
        "default": "a rusted shut pocket watch, broken chain links, visible gears through crack",
        "restored": "a restored mechanical pocket watch, precise timekeeping, re-polished silver case",
        "reforged": "a pocket watch with transparent window in case lid showing movement, brass gear-shaped chain, steampunk style",
        "counterfeit": "a pocket watch with forged railway bureau inscription, fake 19th century railroad timepiece"
    },
    "item_sportswatch_01": {
        "default": "a scratched sport watch, worn bezel, faded luminous markers, but working water seal",
        "restored": "a refurbished dive watch, new bezel and strap, restored water resistance",
        "reforged": "a dive watch with ceramic bezel and titanium strap upgrade, refreshed luminous coating, professional dive performance",
        "counterfeit": "a sport watch with forged military serial number, fake special military supply model"
    },
    "item_brooch_01": {
        "default": "a dull dragonfly brooch, dusty embedded stones, tarnished metal",
        "restored": "a polished gemstone brooch, gleaming metal, sparkling stones",
        "reforged": "a dragonfly brooch with enamel-painted wings, colorful like real wings, greatly enhanced artistry",
        "counterfeit": "a brooch with forged Art Nouveau period markings, fake master jeweler attribution"
    },
    "item_earring_01": {
        "default": "a single earring, blackened silver, but distinctive design with delicate pendant patterns",
        "restored": "a paired silver earring set, polished to shine, vivid enamel colors",
        "reforged": "a single earring converted into an elegant pendant with new chain, unique design as a feature",
        "counterfeit": "an earring with forged Qing dynasty court maker marks, fake cloisonne imperial jewelry"
    },
    "item_amber_01": {
        "default": "a cloudy amber pendant, dirty surface, dark color, something faintly visible inside",
        "restored": "a cleaned amber pendant, warm and translucent, inclusions visible",
        "reforged": "an amber pendant in a silver wire-wrapped setting with handwoven wax cord, natural beauty highlighted",
        "counterfeit": "an amber pendant with forged inclusion authentication, fake Baltic amber with complete ancient insect"
    },
    "item_pearl_01": {
        "default": "a yellowed pearl strand, loose string, but uniformly sized pearls",
        "restored": "a cleaned pearl necklace, luster restored, re-strung with secure knots",
        "reforged": "a pearl necklace arranged in gradient sequence by size and color, handmade gold clasp, elegant layered effect",
        "counterfeit": "a pearl necklace with forged origin report, fake South Sea golden pearls"
    },
    "item_woodprint_01": {
        "default": "a damaged woodblock print, torn edges, smudged colors, but strong line work",
        "restored": "a restored woodblock print, professionally repaired and flattened, complete image",
        "reforged": "a woodblock print hand-colored with mineral pigments, giving the print new visual life",
        "counterfeit": "a woodblock print with forged carver marks and publication info, fake Edo period ukiyo-e master print"
    },
    "item_sculpture_01": {
        "default": "a small dusty bronze sculpture, green patina, abstract form, crooked base",
        "restored": "a cleaned bronze sculpture, smooth lines, stable base corrected",
        "reforged": "a bronze sculpture with fine polish and oxidation coloring, mounted on marble base, professional display quality",
        "counterfeit": "a bronze sculpture with forged creation archive and exhibition records, fake modern master's early work"
    },
    "item_snuffbottle_01": {
        "default": "a worn snuff bottle, heavily abraded surface, faint interior painting",
        "restored": "a cleaned snuff bottle, smooth surface, interior painting clearly visible",
        "reforged": "a snuff bottle on rosewood stand in brocade box, ivory-colored cap added, museum collection quality",
        "counterfeit": "a snuff bottle with forged imperial markings and master painter signature, fake Qing palace snuff bottle"
    },
    "item_cloisonne_01": {
        "default": "a chipped cloisonne enamel vase, exposed copper base, but still colorful overall",
        "restored": "a repaired cloisonne vase, professionally filled enamel, harmonious colors",
        "reforged": "a cloisonne vase with additional enamel colors and gold wire outlining, enriched color depth",
        "counterfeit": "a cloisonne vase with forged base mark and period features, fake Ming dynasty imperial cloisonne"
    },
    "item_foreignbook_01": {
        "default": "a moldy hardcover western book, cracked spine, but acceptable inner pages",
        "restored": "a restored hardcover book, cleaned cover, reinforced spine",
        "reforged": "a book with calfskin cover and gold-tooled lettering, gilded page edges, luxury collector's binding",
        "counterfeit": "a book with forged author signature and first edition markings, fake Nobel laureate signed first edition"
    },
    "item_medbook_01": {
        "default": "a damaged traditional Chinese medical text, missing cover, detailed herbal illustrations",
        "restored": "a repaired medical text, cover and loose pages restored, complete content",
        "reforged": "a medical text with expert annotations and modern drug name cross-references, professional reference edition",
        "counterfeit": "a medical text with forged imperial physician seal and name, fake Qing dynasty palace physician manuscript"
    },
    "item_harmonica_01": {
        "default": "a rusty harmonica, corroded reeds, blurred engraving, but still makes sound",
        "restored": "a cleaned harmonica, clear bright tone, visible engraving",
        "reforged": "a harmonica with re-tuned reeds and sealed chambers, improved airtightness, richer and fuller tone",
        "counterfeit": "a harmonica with forged body engraving and custom number, fake master harmonica player's instrument"
    },
    "item_erhu_01": {
        "default": "a broken-string erhu, slightly slack snakeskin, but beautiful wood grain on neck",
        "restored": "an erhu with new strings and adjusted snakeskin tension, powerful distant tone",
        "reforged": "an erhu with upgraded premium snakeskin and fine-tuner, selected bamboo bridge, enhanced resonance",
        "counterfeit": "an erhu with forged inscription inside neck, fake famous erhu master's personal instrument"
    },
    "item_polaroid_01": {
        "default": "a jammed instant camera, stuck film ejector, foggy lens, sticker-covered body",
        "restored": "a repaired instant camera, working film ejector, cleaned lens, functional again",
        "reforged": "an instant camera with external flash hot-shoe mount and grip, macro lens attachment, expanded creative shooting",
        "counterfeit": "an instant camera with forged collaboration branding and limited edition number, fake photographer limited model"
    },
    "item_tablet_01": {
        "default": "a cracked-screen tablet, spider web cracks in corner, but touch and system work fine",
        "restored": "a tablet with replaced screen, perfect display, optimized system performance",
        "reforged": "a tablet with expanded memory and professional creative software suite, stylus and case included, productivity upgrade",
        "counterfeit": "a tablet with forged custom branding, fake digital artist limited edition"
    },
    "item_headphones_01": {
        "default": "over-ear headphones with flaking paint, aged leather ear pads, but working driver units",
        "restored": "refurbished headphones, new ear pads and repainted, comfortable and clean",
        "reforged": "headphones with upgraded high-end driver units and re-tuned sound, enhanced soundstage and detail",
        "counterfeit": "headphones with forged model number and certification label, fake recording studio monitor edition"
    },
    "item_modeltrain_01": {
        "default": "a faded model train, severely discolored paint, one wheel detached, clear base engravings",
        "restored": "a restored model train, fresh paint and repaired wheel, pristine condition",
        "reforged": "a model train with custom hand-painted color scheme, battle-damage weathering effects, unique style",
        "counterfeit": "a model train with forged base serial number and first-release marking, fake limited first edition"
    },
    "item_banknote_01": {
        "default": "a stack of old banknotes bound by rubber band, some creased and stained",
        "restored": "sorted and pressed old banknotes, improved condition, organized by denomination and era",
        "reforged": "select banknotes in professional grading cases displayed in a collector album, connoisseur grade presentation",
        "counterfeit": "banknotes with forged printing error features, one ordinary note made to look like a famous misprint"
    },
    "item_belt_01": {
        "default": "a cracked leather belt, split near buckle, visible bend marks from use",
        "restored": "a repaired leather belt, restored elasticity and luster",
        "reforged": "a leather belt with hand-cast brass buckle and edge stitching, rugged yet refined",
        "counterfeit": "a leather belt with forged brand marks and origin info, fake British equestrian workshop hand-cut piece"
    },
    "item_redwine_01": {
        "default": "a dusty red wine bottle, label obscured by dust and wax drips, deep colored liquid",
        "restored": "a cleaned red wine bottle, label readable, cork in good condition",
        "reforged": "a red wine bottle in handmade wooden gift box with crystal decanter and tasting guide, premium gift set",
        "counterfeit": "a red wine bottle with forged label year and region info, fake French grand cru exceptional vintage"
    },
    "item_brush_01": {
        "default": "a balding calligraphy brush, peeling lacquer shaft, sparse split hairs, but solid bone handle",
        "restored": "a restored calligraphy brush, sharp tip, repaired lacquer, classic elegance",
        "reforged": "a calligraphy brush with premium purple rabbit hair tip, re-lacquered shaft with silver wire inlay, beautiful and functional",
        "counterfeit": "a calligraphy brush with forged imperial bestowment marks, fake ivory palace-use writing instrument"
    },
    "item_silkscarf_vintage_01": {
        "default": "a creased old silk scarf, whitened fold marks, but rich layered print patterns",
        "restored": "an ironed silk scarf, silk sheen restored, smooth water-like feel",
        "reforged": "a silk scarf with hand-rolled edges replacing machine lock-stitch, enhanced texture and drape",
        "counterfeit": "a silk scarf with forged brand label, fake 1950s European fashion house limited hand-painted design"
    },
    "item_sunglasses_01": {
        "default": "scratched sunglasses, yellowed nose pads, but classic frame design",
        "restored": "repaired sunglasses, new nose pads, polished lenses, comfortable and stylish",
        "reforged": "sunglasses with polarized blue-light lenses and spring hinge temple arms, comfort and function upgrade",
        "counterfeit": "sunglasses with forged custom branding, fake international movie star bespoke one-of-a-kind pair"
    },
    "item_oldlock_01": {
        "default": "a rust-seized brass lock, keyhole almost blocked, but intricate carved patterns on body",
        "restored": "a restored brass lock, smooth mechanism, precise internal structure",
        "reforged": "a brass lock with added hidden mechanism and re-polished carvings, more complex and entertaining puzzle",
        "counterfeit": "a brass lock with forged age marks, fake Qing dynasty master locksmith creation"
    },
    "item_jadecong_01": {
        "default": "a soil-stained jade cong tube, yellowed overall, worn edges, indistinct surface patterns",
        "restored": "a cleaned jade cong, jade quality emerging, deity-beast face pattern faintly visible",
        "reforged": "a jade cong on acrylic display stand with LED cold light base, patterns clearly visible under lighting, museum display",
        "counterfeit": "a jade cong with forged burial traces and carbon-14 test report, fake Liangzhu culture 5000-year-old ritual vessel"
    },
    "item_pocketwatch_gold_01": {
        "default": "a heavy old pocket watch, gold plating largely worn off, stuck crown, fine movement visible through scratched crystal",
        "restored": "a precision-repaired gilt pocket watch, smooth movement, restored gold case",
        "reforged": "a pocket watch with openwork carved case lid revealing movement, gold plating re-applied with traditional technique",
        "counterfeit": "a pocket watch with forged movement number and Geneva archive records, fake 19th century Swiss minute repeater"
    },
    "item_calligraphy_01": {
        "default": "a moldy calligraphy scroll, broken roller head, scattered mold spots, but vigorous ink strokes",
        "restored": "a re-mounted calligraphy scroll, flat surface, clear ink layers, readable seals",
        "reforged": "a double-sided mounted calligraphy with contemporary painter's small work on reverse, complementary pairing",
        "counterfeit": "a calligraphy scroll with forged collector seals and publication records, fake modern calligraphy master's late work"
    },
    "item_jadebracelet_01": {
        "default": "a dull jade bracelet, heavy grease layer, stored in a box bottom for years",
        "restored": "a cleaned jade bracelet, green color gradually emerging, improving translucency",
        "reforged": "a jade bracelet with gold filigree edge inlay, reinforced body with added luxury, gold and jade harmony",
        "counterfeit": "a jade bracelet with forged lab testing report, fake old-pit glass-type imperial green jadeite"
    },
    "item_zishahu_01": {
        "default": "a stained Yixing teapot, heavy tea deposits, water scale between lid and body, but fine clay texture",
        "restored": "a cleaned Yixing teapot, warm jade-like clay color, perfect lid fit, crisp pour",
        "reforged": "a Yixing teapot with landscape carving and poetic inscription by a ceramic engraver, literati aesthetic",
        "counterfeit": "a Yixing teapot with forged base mark and provenance records, fake Gu Jingzhou master's mid-career work"
    },
    "item_coral_01": {
        "default": "a whitened coral carving, dull and dry surface, elaborate carving but faded color",
        "restored": "a conditioned coral carving, warming color, vivid facial details in fine carving",
        "reforged": "a coral carving on rosewood stand with glass dome, presented as high-end art decorative piece",
        "counterfeit": "a coral carving with forged origin report and period authentication, fake natural aka deep-red coral Qing palace style"
    },
    "item_bonecarving_01": {
        "default": "a yellowed ivory carving, dust in details, but flowing robe lines and skilled craftsmanship",
        "restored": "a cleaned ivory carving, warm material, hair-fine detail visible, elegant female figure",
        "reforged": "an ivory carving with refined details and mineral pigment applied to garments, more vivid and lifelike figure",
        "counterfeit": "an ivory carving with forged period features and craftsman marks, fake Qing dynasty imperial court piece from Canton thirteen factories"
    },
    "item_coinset_01": {
        "default": "a box of corroded ancient coins, mostly rusty, some stuck together",
        "restored": "cleaned ancient coins, clear characters, arranged by dynasty, deep natural patina",
        "reforged": "ancient coins arranged in custom brocade box by dynasty, each with rubbing and description card, systematic collection set",
        "counterfeit": "ancient coins with forged character features and casting marks, ordinary coins made to look like rare mother coins"
    },
    "item_redwoodpot_01": {
        "default": "a dusty brush pot, dark wood color, faint grain pattern, substantial weight",
        "restored": "a polished rosewood brush pot, flowing wood grain, warm to touch, faint wood scent",
        "reforged": "a brush pot with refined carving details, polished interior, paired with rosewood base, enhanced scholarly display",
        "counterfeit": "a brush pot with forged wood identification and period features, fake Hainan huanghuali Ming dynasty imperial dragon brush pot"
    },
    "item_guanyao_01": {
        "default": "a chipped plum vase, dusty body, but stable blue-and-white coloring and skilled painting",
        "restored": "a repaired blue-and-white plum vase, kintsugi gold repair, rich layered decoration",
        "reforged": "a plum vase with extended gold kintsugi repair turned into decorative pattern, imperfection and beauty coexisting, one of a kind",
        "counterfeit": "a plum vase with forged base mark and authentication records, fake Qing Yongzheng official kiln piece"
    },
    "item_hetianyu_01": {
        "default": "a gray-covered jade carving, detailed work but indistinguishable color, substantial weight suggests quality",
        "restored": "a nurtured white jade piece, gradually revealing oily luster, high whiteness, exquisite carving",
        "reforged": "a jade carving with hand-braided colorful silk cord and gold fortune bead, wearable and displayable, practical art",
        "counterfeit": "a jade carving with forged national lab certificate, fake Hetian mutton-fat nephrite master work"
    },
    "item_oilpainting_01": {
        "default": "a dusty large oil painting in heavy frame, cobwebs, barely visible image, but vivid colors peek through",
        "restored": "a cleaned oil painting, dazzling vivid colors, dynamic light and shadow, powerful brushwork",
        "reforged": "an oil painting in museum-grade frame with professional spotlight bracket, gallery-level presentation",
        "counterfeit": "an oil painting with forged signature and pigment dating report, fake Impressionist master's work"
    },
    "item_goldset_01": {
        "default": "a set of gold-colored jewelry (necklace, bracelet, earrings), tarnished surface, uncertain purity, but elaborate work",
        "restored": "an ultrasonically cleaned gold jewelry set, brilliant gold shine, delicate chased patterns",
        "reforged": "a gold jewelry set with semi-precious stone accents added, modernized design, luxurious yet contemporary",
        "counterfeit": "a gold jewelry set with forged imperial style features and royal marks, fake Qing palace dragon-phoenix dowry treasures"
    },
    "item_diamondnecklace_01": {
        "default": "a dull necklace, gray lifeless stones, blackened chain, looks like cheap costume jewelry",
        "restored": "a cleaned diamond necklace, brilliant fire, gleaming platinum chain, stunning presence",
        "reforged": "a diamond necklace with main stone re-set in modern prong design, safety clasp added, beauty meets practicality",
        "counterfeit": "a diamond necklace with forged GIA certificate and jeweler provenance, fake European heritage diamond suite"
    },
    # Items that previously had no assets folder at all:
    "item_amber_01": {
        "default": "a cloudy amber pendant, dirty surface, dark color, something faintly visible inside",
        "restored": "a cleaned amber pendant, warm and translucent, inclusions visible",
        "reforged": "an amber pendant in a silver wire-wrapped setting with handwoven wax cord, natural beauty highlighted",
        "counterfeit": "an amber pendant with forged inclusion authentication, fake Baltic amber with complete ancient insect"
    },
    "item_pearl_01": {
        "default": "a yellowed pearl strand, loose string, but uniformly sized pearls",
        "restored": "a cleaned pearl necklace, luster restored, re-strung with secure knots",
        "reforged": "a pearl necklace arranged in gradient sequence by size and color, handmade gold clasp, elegant layered effect",
        "counterfeit": "a pearl necklace with forged origin report, fake South Sea golden pearls"
    },
}


def main():
    created = updated = skipped = 0

    for item_id, prompts in PROMPTS.items():
        item_dir = ITEMS_DIR / item_id
        item_dir.mkdir(parents=True, exist_ok=True)

        prompts_file = item_dir / "prompts.json"

        if prompts_file.exists():
            # Update existing prompts.json
            with open(prompts_file, "r", encoding="utf-8") as f:
                existing = json.load(f)

            changed = False
            for state, prompt in prompts.items():
                if state not in existing or existing[state] != prompt:
                    existing[state] = prompt
                    changed = True

            if changed:
                with open(prompts_file, "w", encoding="utf-8") as f:
                    json.dump(existing, f, indent=2, ensure_ascii=False)
                    f.write("\n")
                print(f"[UPDATED] {item_id}")
                updated += 1
            else:
                print(f"[SKIPPED] {item_id} (no changes)")
                skipped += 1
        else:
            # Create new prompts.json
            with open(prompts_file, "w", encoding="utf-8") as f:
                json.dump(prompts, f, indent=2, ensure_ascii=False)
                f.write("\n")
            print(f"[CREATED] {item_id}")
            created += 1

    print(f"\nDone: {created} created, {updated} updated, {skipped} skipped")


if __name__ == "__main__":
    main()
