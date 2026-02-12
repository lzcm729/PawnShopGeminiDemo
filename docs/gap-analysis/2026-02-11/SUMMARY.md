# Gap Analysis Summary — 2026-02-11

## Overview

| # | System | Total | ✅ Impl | ⚠️ Partial | ❌ Missing | 🔄 Divergent | Coverage |
|---|--------|-------|---------|-----------|-----------|-------------|----------|
| 1 | ItemVariant | 34 | 32 | 2 | 0 | 0 | **97.0%** |
| 2 | Mail | 37 | 33 | 3 | 0 | 0 | **90.5%** |
| 3 | CoreVision | 24 | 19 | 5 | 0 | 0 | **89.6%** |
| 4 | CoreSetting | 37 | 31 | 4 | 1 | 0 | **89.0%** |
| 5 | NewsRumor | 58 | 49 | 5 | 1 | 0 | **88.8%** |
| 6 | GameLoop | 56 | 45 | 8 | 0 | 3 | **87.5%** |
| 7 | DayNight | 51 | 42 | 5 | 1 | 2 | **87.3%** |
| 8 | Appraisal | 46 | 37 | 3 | 6 | 0 | **83.7%** |
| 9 | EventChain | 55 | 42 | 7 | 2 | 1 | **82.7%** |
| 10 | CustomerInsight | 52 | 38 | 8 | 3 | 1 | **80.8%** |
| 11 | GewuEssence | 61 | 46 | 5 | 4 | 2 | **79.5%** |
| 12 | Departure | 38 | 28 | 4 | 3 | 0 | **78.9%** |
| 13 | Business | 26 | 18 | 5 | 1 | 2 | **78.8%** |
| 14 | Economy | 72 | 55 | 3 | 2 | 12 | **78.5%** |
| 15 | Calendar | 37 | 28 | 2 | 5 | 0 | **78.0%** |
| 16 | FillerEvent | 54 | 38 | 7 | 3 | 1 | **76.9%** |
| 17 | Workshop | 75 | 51 | 11 | 6 | 2 | **75.3%** |
| 18 | Negotiation | 47 | 29 | 12 | 3 | 1 | **74.5%** |
| 19 | Reputation | 69 | 44 | 14 | 11 | 0 | **73.9%** |
| 20 | ShopUpgrade | 66 | 42 | 8 | 12 | 1 | **69.7%** |
| 21 | CharacterAbility | 66 | 42 | 5 | 15 | 2 | **67.4%** |
| 22 | BlackMarket | 71 | 40 | 13 | 14 | 1 | **65.5%** |
| 23 | InventoryLog | 27 | 14 | 6 | 5 | 1 | **63.0%** |

## Grand Totals

- **Total features across all systems:** 1159
- ✅ Implemented: 857
- ⚠️ Partial: 149
- ❌ Missing: 96
- 🔄 Divergent: 32
- **Overall coverage: 80.4%**

Formula: (857 + 0.5 × 149) / 1159 × 100 = 80.4%

## Top 5 Lowest Coverage (Priority Targets)

| Rank | System | Coverage | Missing | Key Gaps |
|------|--------|----------|---------|----------|
| 1 | **InventoryLog** | 63.0% | 5 | Log filtering, search, export features |
| 2 | **BlackMarket** | 65.5% | 14 | Many advanced features still partial/missing |
| 3 | **CharacterAbility** | 67.4% | 15 | Largest missing count of any system |
| 4 | **ShopUpgrade** | 69.7% | 12 | Several upgrade tiers and effects missing |
| 5 | **Reputation** | 73.9% | 11 | Milestone effects, decay mechanics incomplete |

## Distribution

- **90%+ (Excellent):** ItemVariant, Mail, CoreVision
- **80-89% (Good):** CoreSetting, NewsRumor, GameLoop, DayNight, Appraisal, EventChain, CustomerInsight
- **70-79% (Moderate):** GewuEssence, Departure, Business, Economy, Calendar, FillerEvent, Workshop, Negotiation, Reputation
- **60-69% (Needs Work):** ShopUpgrade, CharacterAbility, BlackMarket, InventoryLog

## Per-System Reports

Detailed feature-by-feature reports are in the same directory:

- [CoreVision.md](CoreVision.md) | [GameLoop.md](GameLoop.md)
- [DayNight.md](DayNight.md) | [Business.md](Business.md) | [Appraisal.md](Appraisal.md)
- [ItemVariant.md](ItemVariant.md) | [ShopUpgrade.md](ShopUpgrade.md) | [InventoryLog.md](InventoryLog.md)
- [Calendar.md](Calendar.md) | [FillerEvent.md](FillerEvent.md) | [CoreSetting.md](CoreSetting.md)
- [Departure.md](Departure.md) | [NewsRumor.md](NewsRumor.md) | [CustomerInsight.md](CustomerInsight.md)
- [CharacterAbility.md](CharacterAbility.md) | [BlackMarket.md](BlackMarket.md) | [Workshop.md](Workshop.md)
- [Mail.md](Mail.md) | [Negotiation.md](Negotiation.md) | [GewuEssence.md](GewuEssence.md)
- [EventChain.md](EventChain.md) | [Reputation.md](Reputation.md) | [Economy.md](Economy.md)
