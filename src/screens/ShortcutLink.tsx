// 設定頁：連結 iPhone 健康（捷徑自動同步）
import { useState } from 'react';
import { Panel } from '../components/ui.tsx';
import {
  SHORTCUT_INSTALL_URL,
  SHORTCUT_NAME,
  SYNC_TIMES,
  createSyncToken,
  isCloudConfigured,
  shortcutLinkUrl,
  syncEndpoint,
} from '../cloud/cloud.ts';
import { useCloudSync } from '../cloud/CloudSync.tsx';
import { useGame } from '../state/GameContext.tsx';
import { setCloudState } from '../state/game.ts';

function formatTime(iso?: string): string {
  if (!iso) return '尚無';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const { notify } = useGame();
  return (
    <div className="field">
      <span>{label}</span>
      <div className="copy-row">
        <code className="copy-value">{value}</code>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              notify('已複製', label);
            } catch {
              notify('無法自動複製', '請長按文字手動複製');
            }
          }}
        >
          複製
        </button>
      </div>
    </div>
  );
}

export function ShortcutGuide() {
  return (
    <details className="guide">
      <summary>捷徑製作教學（約 10 分鐘，只需做一次）</summary>
      <p className="hint">
        這個做法把同步金鑰存在 iCloud 雲碟的檔案裡，捷徑本身不含金鑰，可以安心用「拷貝 iCloud 連結」分享給別人。動作名稱依 iOS
        版本可能略有不同，括號內為英文名稱。
      </p>
      <ol>
        <li>
          「捷徑」App › 右上「＋」，名稱取為「<strong>{SHORTCUT_NAME}</strong>」。點底部 ⓘ（或捷徑名稱旁的下拉選單 › 詳細資訊），開啟「
          <strong>在分享表單中顯示</strong>」。頂端會出現「接收…輸入」：類型只留「文字」，「如果沒有輸入」選「<strong>繼續</strong>」。
        </li>
        <li>
          加入「<strong>如果</strong>」（If）：條件選「捷徑輸入」「<strong>包含</strong>」<code>iwlu_</code>。在「如果」與「否則」之間放：
          <ul>
            <li>
              「<strong>儲存檔案</strong>」（Save File）：儲存「捷徑輸入」，關閉「詢問儲存位置」，子路徑填 <code>/我運動我升級金鑰.txt</code>
              ，開啟「覆寫」。
            </li>
            <li>「顯示通知」：把預設的「哈囉，全世界！」改成「已連結遊戲」。</li>
          </ul>
          「否則」裡不用放東西。
        </li>
        <li>
          「如果」結束後，加入「<strong>取得檔案</strong>」（Get File）：位置「捷徑」資料夾，路徑 <code>/我運動我升級金鑰.txt</code>（兩處檔名必須一字不差），展開後<strong>關閉「找不到檔案時顯示錯誤」</strong>。再加入「
          <strong>取得輸入的文字</strong>」（Get Text from Input），點結果 › 重新命名為「金鑰」。接著加入「如果」：「金鑰」「沒有任何值」時，「顯示通知」請先到遊戲按「交給捷徑保存」，再加「停止此捷徑」，然後「結束如果」。
        </li>
        <li>
          加入「<strong>尋找健康樣本</strong>」（Find Health Samples）：類型「步數」，條件「開始日期」「是今天」。再加入「
          <strong>計算統計資料</strong>」（Calculate Statistics）選「總和」，結果命名「步數」。
        </li>
        <li>重複上一步：類型「步行 + 跑步距離」（單位公里），結果命名「距離」；類型「運動時間」，結果命名「運動分鐘」。</li>
        <li>
          加入「<strong>取得 URL 的內容</strong>」（Get Contents of URL），點「顯示更多」：
          <ul>
            <li>URL：貼上下方「同步網址」</li>
            <li>方法：POST</li>
            <li>
              標頭：新增 <code>x-sync-token</code>，值選變數「<strong>金鑰</strong>」（不要直接貼金鑰）
            </li>
            <li>
              要求本文：JSON，新增 3 個「數字」欄位：<code>steps</code> ＝ 步數、<code>walkRunKm</code> ＝ 距離、
              <code>exerciseMin</code> ＝ 運動分鐘
            </li>
          </ul>
        </li>
        <li>
          加入「<strong>取得字典值</strong>」：鍵填 <code>message</code>；再加入「<strong>顯示通知</strong>」顯示這個值。
        </li>
        <li>
          回到遊戲按「產生同步金鑰」，再按「<strong>交給捷徑保存</strong>」：捷徑會自動執行、存下金鑰，並詢問是否允許讀取健康資料，選「允許」。看到「已同步」通知就成功了。
        </li>
        <li>
          每天自動執行 4 次：「自動化」分頁 › ＋ ›「特定時間」› 選時間、「每天」› 選「<strong>立即執行</strong>」› 選這個捷徑。依序建立{' '}
          <strong>{SYNC_TIMES.join('、')}</strong> 四個。同一天重複同步會更新成最新數字，不會重複計算修為。
        </li>
        <li>
          分享給別人：在「捷徑」App 長按這個捷徑 › 分享 ›「<strong>拷貝 iCloud 連結</strong>」。對方安裝後，在他自己的遊戲按「交給捷徑保存」即可，資料各自分開。
        </li>
      </ol>
    </details>
  );
}

export function ShortcutLink() {
  const { save, update } = useGame();
  const { state, message, syncNow } = useCloudSync();
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cloud = save.cloud;

  if (!isCloudConfigured()) {
    return (
      <Panel title="連結 iPhone 健康（捷徑）">
        <p className="hint">
          這個網站還沒有設定雲端服務，所以暫時無法使用捷徑同步。網站管理者請依 README「啟用捷徑同步」設定 Supabase，重新部署後這裡就會出現「產生同步金鑰」。
        </p>
      </Panel>
    );
  }

  const generate = async () => {
    if (cloud?.linked && !window.confirm('重新產生後，舊金鑰會失效，捷徑裡的金鑰也要換成新的。確定嗎？')) return;
    setBusy(true);
    setError('');
    try {
      const t = await createSyncToken();
      setToken(t);
      update((s) => setCloudState(s, { linked: true, tokenCreatedAt: new Date().toISOString() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : '產生金鑰失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="連結 iPhone 健康（捷徑）"
      right={<span className={cloud?.linked ? 'ok' : 'muted'}>{cloud?.linked ? '已連結' : '未連結'}</span>}
    >
      <p className="hint">
        捷徑每天 {SYNC_TIMES.join('、')} 自動把「健康」App 的步數、距離與運動時間送進遊戲，修為不再減半。資料只用於本遊戲，只有你看得到。
      </p>

      {SHORTCUT_INSTALL_URL && (
        <a className="btn btn-ghost btn-block link-btn" href={SHORTCUT_INSTALL_URL} target="_blank" rel="noreferrer">
          ① 安裝捷徑「{SHORTCUT_NAME}」
        </a>
      )}

      {token && (
        <div className="token-box">
          <p className="ok">金鑰只會顯示這一次。按下面按鈕，捷徑會自動存下金鑰並同步一次。</p>
          <a className="btn btn-gold btn-block link-btn" href={shortcutLinkUrl(token)}>
            {SHORTCUT_INSTALL_URL ? '② ' : ''}交給捷徑保存（一鍵連結）
          </a>
          <CopyField label="同步金鑰（手動設定時才需要）" value={token} />
        </div>
      )}
      <CopyField label="同步網址" value={syncEndpoint()} />

      {error && <p className="error-text">{error}</p>}

      <button className={`btn btn-block ${cloud?.linked ? 'btn-ghost' : 'btn-primary'}`} onClick={generate} disabled={busy}>
        {busy ? '產生中…' : cloud?.linked ? '重新產生同步金鑰' : '產生同步金鑰'}
      </button>

      {cloud?.linked && (
        <>
          <div className="sync-status">
            <div>
              <span className="muted">捷徑最近送達：</span>
              {formatTime(cloud.lastReceivedAt)}
            </div>
            <div>
              <span className="muted">遊戲最近抓取：</span>
              {formatTime(cloud.lastFetchAt)}
            </div>
            {message && <div className={state === 'error' ? 'error-text' : 'muted'}>{message}</div>}
          </div>
          <div className="water-actions">
            <button className="btn btn-primary" onClick={() => void syncNow()} disabled={state === 'syncing'}>
              {state === 'syncing' ? '同步中…' : '從雲端抓取'}
            </button>
            <a className="btn btn-ghost link-btn" href={`shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`}>
              執行捷徑
            </a>
          </div>
        </>
      )}

      <ShortcutGuide />
    </Panel>
  );
}
