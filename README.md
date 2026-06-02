# Calorie Survival

**S 曲線人生計畫** — 同時管理金錢、卡路里、體力、體重的 7 天生存策略遊戲。

🎮 **[線上遊玩](https://ryanchen0311.github.io/Calorie_Survival/)**

---

## 玩法

每天分為四個階段：

| 階段 | 說明 |
|------|------|
| 🎰 **強化** | 獲得每日獎金，可花錢賭倍率（最高 +10 / ×12） |
| 🥤 **強制消費** | 系統隨機指定今日卡路里目標，必須買飲料湊足 |
| 🏃 **運動** | 分配體力到三種運動，燃燒多餘卡路里 |
| 📊 **結算** | 計算剩餘熱量 → 影響體重，進入下一天 |

撐過 7 天後依**存款**與**體重**評定等級：S / A / B / C。

## 難度

| 開局 | 存款 | 特色 |
|------|------|------|
| 💼 穩紮穩打 | $5,000 | 充裕資金，追求 S 級 |
| 🎯 月光族逆轉 | $3,000 | 每日補貼 +$10，意志力說了算 |
| 🎲 孤注一擲 | $800 | 高風險高回報，地獄或天堂 |

## PWA

在手機瀏覽器開啟遊戲網址後，選擇「加入主畫面」即可安裝。

- 離線可玩（Service Worker 快取）
- 進度自動保存（localStorage）
- 全螢幕直向，無瀏覽器網址列

## 技術棧

- **React 18 + TypeScript + Vite** — PWA 編譯
- **Zustand** — 遊戲狀態管理 + `persist` 進度保存
- **Framer Motion** — 動畫
- **Tailwind CSS** — 樣式
- **GitHub Actions → GitHub Pages** — CI/CD 自動部署

## 開發

```bash
npm install
npm run dev       # 本機開發 http://localhost:5173
npm run build     # 編譯
```

遊戲數值（飲料、強化表、初始金錢等）集中在 [`public/game-config.json`](public/game-config.json)，修改後直接 push 即可更新，不需重新編譯程式碼。
