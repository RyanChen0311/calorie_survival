# Calorie Survival — 完整開發技術文件

> 本文件記錄從專案建立到正式發布的完整開發過程，供未來維護者或新成員快速理解並重現整個流程。

---

## 目錄

1. [專案目標與設計理念](#1-專案目標與設計理念)
2. [技術選型與原因](#2-技術選型與原因)
3. [架構總覽](#3-架構總覽)
4. [開發環境建置](#4-開發環境建置)
5. [PWA 建置流程](#5-pwa-建置流程)
6. [手機互動機制](#6-手機互動機制)
7. [核心模組詳解](#7-核心模組詳解)
8. [開發日誌](#8-開發日誌)
9. [程式碼演進紀錄](#9-程式碼演進紀錄)
10. [功能列表與已知限制](#10-功能列表與已知限制)
11. [未來規劃](#11-未來規劃)

---

## 1. 專案目標與設計理念

### 遊戲概念

**Calorie Survival** 是一款 7 天生存策略遊戲。玩家扮演一個同時追求財富與完美身材的現代人，在有限的金錢與體力下，每天面對「強制飲料消費」、「運動決策」、「獎金賭博強化」三重壓力，7 天後依剩餘金錢與體重評定最終等級（S / A / B / C）。

### 設計原則

- **Zero Backend**：所有邏輯在瀏覽器內完成，不需要伺服器，降低維護成本與部署複雜度。
- **Mobile-First**：以手機直向螢幕為主要設計目標，全程觸控操作，無需滑鼠。
- **Deterministic by Design**：飲料熱量全為 50 的倍數，確保演算法每次都能精準湊出目標熱量，不依賴近似或捨入。
- **可遠端調整數值**：所有遊戲平衡數值集中在 `public/game-config.json`，修改後直接 push 即可生效，不需重新編譯程式碼。

---

## 2. 技術選型與原因

| 技術 | 版本 | 選擇原因 |
|------|------|---------|
| **React 18** | 18.3 | 元件化 UI 管理，生態成熟 |
| **TypeScript** | 5.5 | 型別安全，降低狀態管理的 bug 機率 |
| **Vite** | 5.3 | 極快的 HMR（熱重載），`vite-plugin-pwa` 生態完整 |
| **Zustand** | 4.5 | 輕量狀態管理，內建 `persist` middleware 一行完成 localStorage 持久化 |
| **Framer Motion** | 11.3 | React-native 不支援，但 Framer Motion 在行動瀏覽器效能優異，動畫宣告式撰寫 |
| **Tailwind CSS** | 3.4 | Utility-first，快速原型，無需命名 CSS class |
| **vite-plugin-pwa** | 0.20 | 自動生成 Service Worker、Web App Manifest，與 Vite 深度整合 |

### 為何選擇 PWA 而非 React Native

| 面向 | PWA | React Native |
|------|-----|-------------|
| 部署 | GitHub Pages 靜態托管，零成本 | App Store / Google Play 審核 |
| 更新 | 用戶下次開啟自動更新 | 需發版、審核 |
| Framer Motion | 完整支援 | 不支援（需用 Reanimated） |
| 安裝門檻 | 瀏覽器點一下「加入主畫面」 | 需到商店下載 |
| 離線能力 | Service Worker 快取 | 原生支援 |

對於這類 **個人遊戲專案**，PWA 在開發速度、部署便利性和維護成本上全面勝出。

---

## 3. 架構總覽

```
src/
├── main.tsx              # 入口點，啟動時呼叫 loadRemoteConfig()
├── App.tsx               # Screen 路由（home / game / gameover / result）
├── vite-env.d.ts         # Vite 環境變數型別宣告
│
├── config/
│   └── index.ts          # 遊戲數值設定 + 遠端 JSON 載入邏輯
│
├── store/
│   └── gameStore.ts      # Zustand store（含 persist middleware）
│
├── data/
│   ├── drinks.ts         # 飲料資料
│   └── exercises.ts      # 運動資料 + 卡路里計算
│
├── utils/
│   ├── algorithm.ts      # 飲料組合回溯演算法
│   └── scoring.ts        # 計分與評級邏輯
│
├── screens/
│   ├── HomeScreen.tsx    # 首頁（難度選擇）
│   ├── GameScreen.tsx    # 遊戲主畫面（四階段容器）
│   ├── GameOverScreen.tsx
│   └── ResultScreen.tsx  # 7 天結算報告
│
└── components/
    ├── StatusBar.tsx       # 頂部資源欄（金錢、體重、卡路里）
    ├── DayHistoryPanel.tsx # 歷史紀錄滑出面板
    └── phases/
        ├── BonusPhase.tsx      # 第一階段：每日獎金 + 強化
        ├── DrinkPhase.tsx      # 第二階段：強制飲料消費
        ├── ExercisePhase.tsx   # 第三階段：運動體力分配
        └── SettlementPhase.tsx # 第四階段：每日結算
```

### 遊戲狀態機

```
Screen: home
    ↓ startGame(difficulty)
Screen: game
    Phase: bonus → drink → exercise → settlement
                                          ↓ day < 7: 進入下一天 (bonus)
                                          ↓ day = 7: screen → result
    ↓ 金錢 < 0
Screen: gameover
```

---

## 4. 開發環境建置

### 必要工具

- **Node.js** 20+（GitHub Actions 也使用 Node 20）
- **npm** 10+（package-lock.json 基於此版本）
- **Git**

### 安裝與啟動

```bash
# 克隆專案
git clone https://github.com/RyanChen0311/Calorie_Survival.git
cd Calorie_Survival

# 安裝依賴（使用 lock 檔保證版本一致）
npm install

# 本機開發伺服器（含 HMR）
npm run dev
# → http://localhost:5173/

# 型別檢查 + 編譯產物
npm run build
# → dist/

# 預覽編譯後結果（模擬 GitHub Pages 環境）
npm run build && npm run preview
```

### 各指令說明

| 指令 | 執行內容 | 使用時機 |
|------|---------|---------|
| `npm run dev` | `vite`，啟動開發伺服器 | 日常開發 |
| `npm run build` | `tsc -b && vite build`，先型別檢查再打包 | 部署前確認 |
| `npm run preview` | `vite preview`，起靜態伺服器服務 `dist/` | 驗證 build 產物 |

> `tsc -b` 使用 Project References（`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`），讓 Vite 設定檔與應用程式碼使用不同的 TypeScript 設定。

### 重要設定檔

#### `tsconfig.app.json`
應用程式碼（`src/`）的 TypeScript 設定，`strict: true` 確保型別安全。

#### `tsconfig.node.json`
Vite 設定檔（`vite.config.ts`）的 TypeScript 設定，包含 `"types": ["node"]` 讓 `process.env` 可用。

#### `src/vite-env.d.ts`
```ts
/// <reference types="vite/client" />
```
提供 `import.meta.env` 的 TypeScript 型別定義，這是 Vite 標準範本的一部分，本專案初始時遺漏，在部署時才發現錯誤（見[開發日誌 §8.3](#83-vite-env-型別錯誤-ci-build-失敗)）。

---

## 5. PWA 建置流程

### PWA 的優勢

1. **安裝到主畫面**：在 Android Chrome / iOS Safari 點選「加入主畫面」，以獨立視窗（`display: standalone`）開啟，無網址列、全螢幕。
2. **離線可玩**：Service Worker 攔截網路請求，從快取提供所有資源。
3. **自動更新**：`registerType: 'autoUpdate'` 讓 Service Worker 在背景靜默更新。
4. **進度保存**：Zustand `persist` middleware 將遊戲狀態存入 `localStorage`，關閉瀏覽器後重開自動還原。

### Vite PWA 設定

```ts
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    // 預設只快取 js/css/html，需手動加入 json 以快取 game-config.json
    globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
  },
  manifest: {
    name: 'Calorie Survival',
    short_name: 'Calorie Survival',
    description: '飲料、運動與錢包的生存遊戲',
    theme_color: '#000000',
    background_color: '#000000',
    display: 'standalone',
    orientation: 'portrait',
    start_url: './',   // 相對路徑，相容 GitHub Pages 子目錄
    scope: './',
    icons: [
      { src: 'favicon.svg',  sizes: 'any',     type: 'image/svg+xml' },
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    ]
  }
})
```

### 關鍵設定細節

**為何 icon src 不用 `/` 開頭？**

GitHub Pages 將網站部署在子路徑 `/Calorie_Survival/`，而非根目錄。若 icon 路徑為 `/icon-192.png`，瀏覽器會去找 `https://ryanchen0311.github.io/icon-192.png`（根目錄），導致 404。改為 `icon-192.png`（相對路徑），`vite-plugin-pwa` 會自動在生成的 manifest 中加上 base 前綴。

**為何需要 `start_url: './'`？**

PWA 的 `start_url` 若未指定，預設為 `/`，在子路徑部署時點擊主畫面圖示會跳到根目錄的 404 頁面。設為 `./` 讓它相對於 manifest 的位置解析。

### PWA 圖示產生

在 CI 中自動執行：

```yaml
- name: Generate PWA icons
  run: npx pwa-assets-generator --preset minimal public/favicon.svg
```

這個指令從 `favicon.svg` 生成符合 PWA 規範的 `icon-192.png` 和 `icon-512.png`，不需手動維護多份圖示。

### 如何在手機安裝

1. 用手機 Chrome 或 Safari 開啟 `https://ryanchen0311.github.io/Calorie_Survival/`
2. **Android Chrome**：點右上角選單 → 「加入主畫面」
3. **iOS Safari**：點分享按鈕 → 「加入主畫面」
4. 安裝後以獨立 App 形式開啟，全螢幕、無網址列

---

## 6. 手機互動機制

本專案為**純前端 PWA**，沒有 WebSocket 或伺服器端即時通訊；「手機互動」指的是瀏覽器與裝置硬體能力的整合。

### 觸控事件

所有互動按鈕透過 Framer Motion 的 `whileTap` 提供觸覺反饋：

```tsx
<motion.button whileTap={{ scale: 0.95 }} onClick={handleAction}>
  ...
</motion.button>
```

`whileTap` 在 `pointerdown` 事件觸發縮放動畫（而非 `mousedown`），在觸控螢幕上無延遲響應。

### 直向鎖定

`vite.config.ts` manifest 設定 `orientation: 'portrait'`，安裝為 PWA 後強制直向，防止旋轉時版面跑版。

### 進度持久化架構

```
使用者操作
    ↓
Zustand action（同步更新 store）
    ↓
persist middleware 攔截 set()
    ↓
JSON.stringify → localStorage['calorie-survival-save']
    ↓
下次開啟：JSON.parse → 還原 store 狀態
```

`partialize` 函數指定只序列化遊戲相關欄位（排除 action functions）：

```ts
partialize: (s) => ({
  screen: s.screen,
  difficulty: s.difficulty,
  dayRecords: s.dayRecords,
  current: s.current,
  exerciseCounts: s.exerciseCounts,
})
```

### 遠端設定載入

`game-config.json` 在應用程式啟動時非同步載入，失敗時靜默使用程式碼內的預設值，確保離線環境也能運行：

```ts
// main.tsx
createRoot(...).render(<App />)  // 立即渲染，不等 config
loadRemoteConfig()                // 背景載入，完成後 config 物件原地更新
```

URL 使用 `import.meta.env.BASE_URL`（Vite 在 build 時替換為實際 base 路徑）確保在子路徑部署下正確請求：

```ts
const res = await fetch(import.meta.env.BASE_URL + 'game-config.json')
```

### 分享戰果

結算畫面的「分享戰果」按鈕使用 `navigator.clipboard.writeText()` 將結果文字複製到剪貼簿：

```ts
const text = `我在 Calorie Survival（${diffLabel}模式）活過了7天！獲得${rank.label}...`
navigator.clipboard.writeText(text).catch(() => {})
```

---

## 7. 核心模組詳解

### 7.1 飲料組合演算法（`src/utils/algorithm.ts`）

**問題**：給定目標熱量（如 650 kcal），從飲料選單中找出總熱量**精準等於**目標的組合，且滿足「至少 N 杯」與「至少 $X」的限制。

**設計前提**：所有飲料熱量均為 50 的倍數（50 / 100 / 150 ... 650 kcal），「無糖綠茶」熱量固定為 50 kcal，作為湊整的 filler。

**演算法流程**（`solveDrinkCombo`）：

```
最多嘗試 120 次：
  1. 從非 filler 飲料中隨機抽取 2-3 種
  2. 對每種飲料隨機分配杯數（不超過剩餘熱量）
  3. 計算剩餘熱量，用無糖綠茶（50kcal）補齊
  4. 檢查 fillerCount 是否為非負整數（精準湊整的關鍵）
  5. 驗證是否滿足 minCups 和 minPrice 約束
  6. 成功則回傳；否則繼續嘗試

120 次都失敗（理論上不應發生）：
  使用保底策略：最大熱量飲料 + 無糖綠茶補齊
```

**為何 120 次足夠**：隨機選 2-3 種飲料後，補齊 filler 的成功率約 60-80%，120 次幾乎必然成功。

### 7.2 運動熱量計算（`src/data/exercises.ts`）

每種運動有 `k`（斜率）和 `b`（基礎值）兩個參數，計算公式為線性函數：

```
燃燒卡路里 = k × stamina + b
```

高強度運動（跳繩 k=6.5、游泳 k=6.0）消耗更快，前段投入效率最高。裝備系統在累計運動次數達到門檻時解鎖，可降低成本或提升效率。

### 7.3 計分公式（`src/utils/scoring.ts`）

```
分數 = 存款 × 1.5 - (體重 - 60) × 500
```

- 起始體重 60 kg，每多 1 kg 扣 500 分
- 存款以 1.5 倍計算，鼓勵同時節省金錢並管理體重
- 評級門檻依難度不同（S 在 Easy 需 22,000 分，Hard 需 18,000 分）

### 7.4 狀態管理（`src/store/gameStore.ts`）

Zustand store 以 `persist` middleware 包覆，localStorage key 為 `calorie-survival-save`。

每日狀態物件 `DayState` 在 `initDay()` 中初始化，包含：
- 當日的隨機獎金基礎值（`bonusBase`）
- 算好的飲料組合（`drinkCombo`）
- 隨機抽選的三種運動（`offeredExercises`）

這意味著**重新整理頁面後，當日的組合不會改變**（已序列化到 localStorage）。

### 7.5 CI/CD（`.github/workflows/deploy.yml`）

```yaml
on:
  push:
    branches: [main]
```

每次推送到 `main` 自動執行：

1. `npm ci` — 使用 lock 檔精確安裝依賴
2. `npx pwa-assets-generator` — 從 SVG 生成 PWA 圖示
3. `npm run build` — 設定 `VITE_BASE_PATH=/Calorie_Survival/` 編譯
4. `actions/deploy-pages` — 部署到 GitHub Pages

---

## 8. 開發日誌

### 8.1 初始建置（2024-06）

**目標**：建立 React + TypeScript + Vite 專案，整合 PWA 設定，設定 GitHub Actions 自動部署。

**關鍵決策**：
- `vite-plugin-pwa` 選用 `registerType: 'autoUpdate'` 而非 `prompt`，讓更新在背景靜默進行，使用者不需手動確認。
- Zustand 的 `persist` middleware 相比手動 `localStorage.setItem` 更簡潔，且自動處理序列化與反序列化。
- `game-config.json` 放在 `public/` 而非 `src/`，是因為 `public/` 的檔案不經 Vite 處理，直接作為靜態資源輸出，可在不重新編譯的情況下透過 CDN 更新。

---

### 8.2 PWA 子路徑相容性問題

**問題描述**

部署後，PWA 圖示在手機上無法載入，且「加入主畫面」的 App 點開後顯示 404。

**問題原因**

`vite.config.ts` 中的 manifest icon 路徑使用絕對路徑：

```ts
// 問題寫法
icons: [
  { src: '/favicon.svg',  ... },
  { src: '/icon-192.png', ... },
  { src: '/icon-512.png', ... },
]
```

GitHub Pages 將網站部署在 `/Calorie_Survival/` 子路徑，`/icon-192.png` 指向的是 `https://ryanchen0311.github.io/icon-192.png`（根目錄），而非 `https://ryanchen0311.github.io/Calorie_Survival/icon-192.png`。

同樣地，`start_url` 未指定時預設為 `/`，點擊主畫面圖示會跳到根目錄 404。

`game-config.json` 的 fetch 路徑 `/game-config.json` 也有相同問題。

**修正方案**

```ts
// 修正後：去除 / 前綴
icons: [
  { src: 'favicon.svg',  ... },
  { src: 'icon-192.png', ... },
  { src: 'icon-512.png', ... },
]

// 加上 start_url 和 scope
start_url: './',
scope: './',
```

```ts
// config/index.ts：使用 Vite 的 BASE_URL 環境變數
const res = await fetch(import.meta.env.BASE_URL + 'game-config.json')
```

```ts
// workbox 加入 json 快取
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
}
```

---

### 8.3 `vite-env` 型別錯誤 — CI Build 失敗

**問題描述**

Push 後 GitHub Actions CI 出現 build 失敗：

```
Error: src/config/index.ts(89,41): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
Error: Process completed with exit code 2.
```

**問題原因**

Vite 標準範本會在 `src/` 建立 `vite-env.d.ts`：

```ts
/// <reference types="vite/client" />
```

這個檔案提供 `import.meta.env` 的 TypeScript 型別定義。本專案初始時沒有這個檔案，在本機開發時因為 IDE 可能有補全而沒有報錯，但 `tsc -b` 嚴格模式下失敗。

**修正方案**

建立 `src/vite-env.d.ts`，補上 `/// <reference types="vite/client" />`。

**學習點**

本機 IDE（如 VS Code + Volar）有時會自動提供 Vite 型別補全，導致本機不報錯但 CI 失敗。建立新 Vite 專案時應確認 `src/vite-env.d.ts` 存在。

---

### 8.4 `process.env` TypeScript 錯誤

**問題描述**

`vite.config.ts` 使用 `process.env.VITE_BASE_PATH`，但 TypeScript 不認識 `process`，IDE 顯示型別錯誤。

**原因**

`tsconfig.node.json` 沒有引入 Node.js 型別定義。

**修正方案**

```bash
npm install --save-dev @types/node
```

```json
// tsconfig.node.json
"types": ["node"]
```

---

## 9. 程式碼演進紀錄

### v0.1 — 初始建置（Commit: `f2cde4a`）

**新增**：
- 完整遊戲邏輯：4 個 Phase 元件、Zustand store、飲料演算法、計分系統
- 33 個檔案，11,363 行初始程式碼
- GitHub Actions CI/CD workflow
- PWA 基本設定（vite-plugin-pwa）

**架構決策**：
- Zustand `persist` 一次完成狀態管理 + 進度保存，不需另寫 localStorage 邏輯
- `game-config.json` 設計為可遠端覆蓋，config 物件以 `splice/Object.assign` 原地更新，保持所有模組對同一物件的引用有效

---

### v0.2 — PWA 子路徑相容性修正（Commit: `e46a590`）

**修正**：
- `vite.config.ts`：icon 路徑改為相對路徑，加入 `start_url` / `scope`，workbox 加入 JSON 快取
- `config/index.ts`：fetch 改用 `import.meta.env.BASE_URL`
- `tsconfig.node.json` + `@types/node`：修正 `process.env` 型別錯誤

**修改前後對比**：

```ts
// Before
{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }
fetch('/game-config.json')

// After
{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }
fetch(import.meta.env.BASE_URL + 'game-config.json')
```

---

### v0.3 — TypeScript 環境修正（Commit: `5a4f1f4`）

**新增**：`src/vite-env.d.ts`

這個單行檔案解決了 CI 環境下 `import.meta.env` 型別不存在的問題。

---

### v0.4 — 文件（Commit: `296fc2f`）

**新增**：`README.md`，包含遊戲介紹、難度說明、PWA 安裝方式、技術棧、開發指令。

---

## 10. 功能列表與已知限制

### 已實作功能

**遊戲核心**
- [x] 7 天生存循環（bonus → drink → exercise → settlement）
- [x] 3 個難度（easy / normal / hard），起始金錢與評級門檻不同
- [x] 每日獎金強化系統（+1 至 +10，最高 ×12 倍率，階梯式成功率遞減）
- [x] 飲料強制消費（回溯演算法精準湊出目標熱量）
- [x] 運動體力分配系統（3 種隨機運動，線性熱量計算）
- [x] 裝備購買系統（累計運動次數解鎖）
- [x] 體力補充事件
- [x] 每日結算（熱量累積 → 體重變化，500 kcal = ±1 kg）
- [x] 計分公式（存款 × 1.5 - 體重偏差 × 500）
- [x] S / A / B / C 評級
- [x] 7 天數據表格展示
- [x] 分享戰果（複製到剪貼簿）

**PWA 與部署**
- [x] 安裝到手機主畫面
- [x] 離線可玩（Service Worker 快取）
- [x] 進度自動保存（localStorage）
- [x] GitHub Actions 自動部署（push to main 觸發）
- [x] 遠端數值設定（修改 `game-config.json` 免重新編譯）

### 已知限制

- **單裝置存檔**：進度儲存在 localStorage，不跨裝置同步。
- **無音效**：目前純視覺動畫，無音效系統。
- **Safari PWA 限制**：iOS Safari 的 Service Worker 不支援背景同步（Background Sync），但離線快取正常運作。
- **無帳號系統**：清除瀏覽器資料會遺失所有存檔。

---

## 11. 未來規劃

### 短期（可立即實作）

- [ ] **多語言**：加入英文介面選項
- [ ] **音效系統**：強化成功/失敗、日結算音效
- [ ] **成就系統**：達成特定條件（如 7 天不運動仍 S 級）解鎖成就徽章
- [ ] **排行榜**：整合 Supabase 或 Firebase 儲存分數（需要後端）

### 中期

- [ ] **更多運動類型**：瑜珈、重訓、騎車等
- [ ] **隨機事件**：「今日特賣」讓某飲料打折、「健身房特惠」等
- [ ] **道具系統**：可攜帶跨日的永久性加成道具

### 長期（架構擴充）

- [ ] **多存檔槽**：localStorage 支援多個獨立存檔
- [ ] **編輯器模式**：內建 `game-config.json` 編輯介面，不需手動編輯 JSON
- [ ] **全球排行**：後端 API 儲存排行，依難度分榜

---

## 附錄：套件版本快照

```json
{
  "dependencies": {
    "framer-motion": "^11.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.4"
  },
  "devDependencies": {
    "@types/node": "^22.x",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vite-pwa/assets-generator": "^0.2.6",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.40",
    "tailwindcss": "^3.4.7",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "vite-plugin-pwa": "^0.20.0"
  }
}
```
