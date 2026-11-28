# 我運動，我升級

飲水、走路、運動即是修行：讓修士從練氣一路突破到飛升的健康養成網頁遊戲（PWA）。iPhone 用 Safari 打開後「加入主畫面」，就能像 App 一樣使用。

完整規格請看 [docs/SRS.md](docs/SRS.md)。

## 目前版本 v0.9 修行版

| 功能 | 狀態 |
| --- | --- |
| 4 位原創修士：青衫劍修、素衣丹修、紫袍符修、赤袍體修 | ✅ |
| 打坐吐納動畫：靈氣上升、法陣旋轉，外觀隨境界變化（法寶、金丹、光環、雷劫、金光） | ✅ |
| 七大境界：練氣（一～九層）、築基、金丹、元嬰、化神、渡劫（初期／中期／後期／大圓滿）、飛升 | ✅ |
| 修為精進動畫、跨境界「渡劫突破」動畫 | ✅ |
| 靈泉（喝水）記錄，每杯 +5 修為與吸納特效 | ✅ |
| 每日功課 5 項、宗門週課 4 項（門檻參考運動部「揮汗有禮」） | ✅ |
| 淬體功法（徒手訓練）：每日功法、計時、調息、安全提醒 | ✅ |
| 連續修煉加成、休養符（修為無每日上限） | ✅ |
| 體魄／身法／根骨／神識四項屬性 | ✅ |
| 手動輸入步數與運動（修為減半） | ✅ |
| 紀錄頁、修為明細、備份與還原、加入主畫面、離線開啟 | ✅ |
| iPhone 捷徑每天 12:00、18:00、22:00、23:50 自動同步步數、距離、運動時間（需設定 Supabase） | ✅ |
| 行功：GPS 記錄健走／跑步路線並畫在地圖上（軌跡只存在手機） | ✅ |
| 匯入 GPX 路線：用 Open GPX Tracker、Strava 等 App 在螢幕關閉時錄製，再匯入遊戲 | ✅ v0.6 |
| 按時用膳：早 08:00–09:00、午 11:30–12:30、晚 18:00–19:00 打卡各 +10 修為 | ✅ v0.4 |
| 六十六日築基：66 格路線圖、三階段、每日心法、5 個里程碑獎勵 | ✅ v0.7 |
| 測靈根：五道問心題 → 靈根、長處、盲點、起步建議與淬體難度 | ✅ v0.7 |
| 本命丹火（連修火焰）與「今日功課圓滿」慶祝動畫 | ✅ v0.7 |
| 道心籤（每日一抽，勇力律慧定五類）與修行日誌（心境＋一句話） | ✅ v0.7 |
| 功法五門：日常習慣自動修練，提供歷練與煉丹加成 | ✅ v0.7 |
| 出門歷練：消耗精力，關掉 App 也繼續，歸來得靈石、靈草、種子 | ✅ v0.7 |
| 靈石、法寶（8 件，穿戴後顯示在修士身上）、靈田與丹房 | ✅ v0.7 |
| 逆天模式：缺席一天道基崩毀重頭（洗髓丹可護道），里程碑 ×1.5 | ✅ v0.7 |
| 餐點紀錄：拍餐點或營養標示由 AI 估算熱量與五大營養素，也可手動輸入 | ✅ v0.7（AI 需設定金鑰） |
| 閉關：休假、生病時暫停 1–14 天，連修凍結、築基不前進也不算缺席 | ✅ v0.8 |
| 修行日誌每日問心（30 題反思提示）與私人日誌簿 | ✅ v0.8 |
| 煉器：用靈田種的靈草打造法寶；新增「足履」欄位（踏雲靴、赤焰靴等） | ✅ v0.8 |
| 原創 Q版修士：髮型 5 種、髮色 5 種、衣色 8 種、表情 3 種、頭飾 5 種、靈寵 4 種，可切回寫意版 | ✅ v0.9 |
| 原創水墨場景 6 個：雲海仙山、竹林幽境、月下靈湖、丹霞洞府、雷劫荒原、天外仙宮（依境界解鎖） | ✅ v0.9 |
| 洞府改版：修士坐在場景石台上，羊皮紙卡顯示「目前境界 ≫ 下一境界」與修煉狀態 | ✅ v0.9 |
| Email 登入、遊戲存檔雲端同步 | 之後版本 |
| 徽章牆、達標卡片 | 第 4–5 階段 |

> 遊戲存檔（修為、境界）目前存在手機瀏覽器；捷徑同步的只有步數與運動資料。清除 Safari 網站資料會一併刪除，請用「設定 › 備份」定期保存。

## 上線步驟（不需要 Mac，也不用安裝任何程式）

1. **建立 GitHub 帳號**：到 <https://github.com/signup> 註冊。
2. **建立儲存庫**：右上角「+」›「New repository」
   - Repository name：`i-workout-i-level-up`
   - 選 **Public**（GitHub Pages 免費方案需要公開）
   - 其他保持預設，按「Create repository」。
3. **上傳程式碼**：在新儲存庫頁面點「uploading an existing file」，把解壓縮後資料夾裡的**所有檔案與資料夾**（包含 `.github`）拖進去，按「Commit changes」。
   - 如果 `.github` 資料夾沒有被上傳，可改用 [GitHub Desktop](https://desktop.github.com/) 上傳。
4. **開啟 GitHub Pages**：儲存庫 › Settings › Pages › Source 選 **GitHub Actions**。
5. **等待自動發佈**：到 Actions 分頁，等「Deploy to GitHub Pages」出現綠色勾勾（約 1–2 分鐘）。
   - 若是第一次上傳時 Pages 還沒開，可在 Actions 分頁選該流程按「Run workflow」重跑。
6. **在 iPhone 打開**：Safari 開 `https://<你的帳號>.github.io/i-workout-i-level-up/` › 分享按鈕 ›「加入主畫面」。

之後每次修改並 push 到 `main`，網站就會自動更新。

## 啟用 iPhone 捷徑同步（約 15 分鐘，免費）

完成上面的上線步驟後再做。全部在瀏覽器操作。

1. **建立 Supabase 專案**：到 <https://supabase.com> 用 GitHub 帳號登入 › New project
   - Name：`i-workout-i-level-up`；Region：Northeast Asia (Tokyo)
   - 設一組資料庫密碼（記下來即可，之後不會用到）
2. **建立資料表**：左側 SQL Editor › New query › 貼上 `supabase/migrations/0001_init.sql` 全部內容 › Run。
3. **開啟匿名登入**：Authentication › Sign In / Providers › 打開「Allow anonymous sign-ins」› Save。
4. **抄下三個值**（Project Settings › API / API Keys）：
   - Project URL，例如 `https://abcdefghijklmnopqrst.supabase.co`
   - anon（或 publishable）公開金鑰
   - Project ref：網址中間那 20 個字母，例如 `abcdefghijklmnopqrst`
5. **建立部署用權杖**：<https://supabase.com/dashboard/account/tokens> › Generate new token，複製起來。
6. **填進 GitHub**：儲存庫 › Settings › Secrets and variables › Actions
   - Variables 分頁 › New repository variable：`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_PROJECT_REF`
   - Secrets 分頁 › New repository secret：`SUPABASE_ACCESS_TOKEN`（第 5 步的權杖）
7. **部署**：Actions › 「Deploy Supabase functions」› Run workflow；完成後再執行「Deploy to GitHub Pages」› Run workflow。
8. **設定捷徑**：打開遊戲 › 設定 › 連結 iPhone 健康 › 產生同步金鑰，照畫面上的教學製作捷徑（詳見 [shortcuts/README.md](shortcuts/README.md)）。

> 公開金鑰（anon / publishable）本來就會放在網頁裡，可以公開；`SUPABASE_ACCESS_TOKEN` 與 service role 金鑰絕對不要放進程式碼。
> Supabase 免費專案長時間沒有任何使用可能被暫停，每天的捷徑同步通常就能維持運作；若被暫停，到 Supabase 儀表板按恢復即可。

## 啟用餐點照片 AI 估算（選用）

餐點照片由雲端函式 `analyze-meal` 交給 Claude 視覺模型估算；照片只用在當次估算、不會儲存，每人每天最多 20 次。

1. 到 [console.anthropic.com](https://console.anthropic.com) 建立 API 金鑰並儲值（按用量計費，一張照片約新台幣 0.1–0.5 元）。
2. Supabase › Edge Functions › **Secrets** › 新增 `ANTHROPIC_API_KEY`，值貼上金鑰。
3. （選用）新增 `ANTHROPIC_MODEL` 可改用其他模型，預設 `claude-haiku-5-5`。

沒有設定金鑰時，遊戲會自動改為手動輸入。

## 在電腦上開發（選用）

需要 [Node.js](https://nodejs.org/) 22 LTS。

```bash
npm install
npm run dev      # 開發伺服器；同一個 Wi-Fi 的 iPhone 可用終端機顯示的 Network 網址測試
npm test         # 執行遊戲規則測試
npm run build    # 產生正式版到 dist/
```

## 專案結構

```
packages/game-core/   遊戲規則（境界、任務判定、連續天數、徒手菜單）＋ 測試
                      之後網頁與 Supabase 函式共用同一份
src/                  React 網頁
  state/              存檔與遊戲動作
  screens/            洞府、任務、淬體功法、紀錄、設定、入門
  components/         修士人物（Cultivator）、突破動畫（Breakthrough）
public/               manifest、service worker、圖示
src/cloud/            Supabase 連線、自動抓取同步資料
supabase/migrations/  雲端資料表與權限
supabase/functions/   sync-health（接收捷徑資料）、create-sync-token（產生金鑰）
shortcuts/            iPhone 捷徑製作教學與傳送格式
.github/workflows/    自動測試與部署
```

## 調整遊戲數值

所有數值與名稱（升級公式、境界、功課修為、門檻、每日上限、連續加成）都在
`packages/game-core/config.ts`，改完執行 `npm test` 確認沒有破壞規則。

## 行功地圖說明

- 地圖底圖使用 OpenStreetMap 官方免費圖磚（tile.openstreetmap.org），需遵守其使用政策：保留出處標示、不預先下載或離線快取；使用者變多時請改用自架或付費圖磚，網址集中在 `src/gps/TrackMap.tsx` 的 `TILE_URL`。
- iPhone 鎖定螢幕後網頁會暫停定位，行功時請讓螢幕保持亮著（遊戲會嘗試自動防止螢幕變暗）。
- 想鎖螢幕走路：用可背景錄製的 App（例如免費的 Open GPX Tracker）錄路線，結束後「儲存到檔案」，再到遊戲「紀錄 › 匯入 GPX 路線」。Strava 的 GPX 需從 strava.com 網頁版活動頁「⋯ › Export GPX」下載。
- 匯入時會濾掉訊號跳點、扣掉停留時間；同一條路線不能重複匯入。
- 軌跡只存在手機的瀏覽器，最多保留 30 筆。

## 安全提醒

本遊戲鼓勵日常活動，不提供醫療建議。運動中如有不適請立即停止；有疾病、懷孕或受傷者請先詢問醫師。
