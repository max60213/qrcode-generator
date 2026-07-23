import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import './styles.css';

const ERROR_LEVELS = [
  { label: '低（7%）', value: 'L', short: '低' },
  { label: '中（15%）', value: 'M', short: '中' },
  { label: '高（25%）', value: 'Q', short: '高' },
  { label: '最佳（30%）', value: 'H', short: '最佳' },
];

const FORMAT_OPTIONS = [
  { label: 'SVG', value: 'svg' },
  { label: 'PNG', value: 'png' },
];

const INITIAL_TEXT = 'https://github.com/max60213/qrcode-generator';
const QR_SIZE = 960;
const QR_MARGIN = 2;
const QR_DARK = '#101010';
const QR_LIGHT = '#ffffff';

function buildIndependentModuleSvg(value, errorCorrectionLevel) {
  const qrCode = QRCode.create(value, { errorCorrectionLevel });
  const moduleCount = qrCode.modules.size;
  const viewBoxSize = moduleCount + QR_MARGIN * 2;
  const rects = [];

  for (let y = 0; y < moduleCount; y += 1) {
    for (let x = 0; x < moduleCount; x += 1) {
      if (qrCode.modules.data[y * moduleCount + x]) {
        rects.push(
          `<rect x="${x + QR_MARGIN}" y="${y + QR_MARGIN}" width="1" height="1"/>`,
        );
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_SIZE}" height="${QR_SIZE}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="${QR_LIGHT}"/>`,
    `<g fill="${QR_DARK}">`,
    rects.join(''),
    '</g>',
    '</svg>',
  ].join('');
}

function svgToPngDataUrl(svgMarkup) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = QR_SIZE;
      canvas.height = QR_SIZE;

      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Unable to prepare the PNG export canvas.'));
        return;
      }

      context.fillStyle = QR_LIGHT;
      context.fillRect(0, 0, QR_SIZE, QR_SIZE);
      context.drawImage(image, 0, 0, QR_SIZE, QR_SIZE);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to render the QR code preview.'));
    };

    image.src = url;
  });
}

function App() {
  const [text, setText] = useState(INITIAL_TEXT);
  const [errorLevel, setErrorLevel] = useState('M');
  const [format, setFormat] = useState('svg');
  const [svgMarkup, setSvgMarkup] = useState('');
  const [pngDataUrl, setPngDataUrl] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedLevel = useMemo(
    () => ERROR_LEVELS.find((level) => level.value === errorLevel),
    [errorLevel],
  );

  useEffect(() => {
    let isCurrent = true;
    const value = text.trim();

    if (!value) {
      setSvgMarkup('');
      setPngDataUrl('');
      setError('');
      setIsGenerating(false);
      return;
    }

    async function generateQrCode() {
      setIsGenerating(true);
      setError('');

      try {
        const nextSvg = buildIndependentModuleSvg(value, errorLevel);
        const nextPng = await svgToPngDataUrl(nextSvg);

        if (!isCurrent) {
          return;
        }

        setSvgMarkup(nextSvg);
        setPngDataUrl(nextPng);
      } catch (generationError) {
        if (!isCurrent) {
          return;
        }

        setSvgMarkup('');
        setPngDataUrl('');
        setError(
          generationError?.message ||
            'This content is too long for the selected QR settings.',
        );
      } finally {
        if (isCurrent) {
          setIsGenerating(false);
        }
      }
    }

    generateQrCode();

    return () => {
      isCurrent = false;
    };
  }, [text, errorLevel]);

  const hasQrCode = Boolean(svgMarkup && pngDataUrl && !error);
  const characterCount = text.trim().length;

  function downloadQrCode() {
    if (!hasQrCode) {
      return;
    }

    const safeName = `qr-code-${selectedLevel.short.toLowerCase()}`;
    const link = document.createElement('a');

    if (format === 'svg') {
      const blob = new Blob([svgMarkup], {
        type: 'image/svg+xml;charset=utf-8',
      });
      link.href = URL.createObjectURL(blob);
      link.download = `${safeName}.svg`;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }

    link.href = pngDataUrl;
    link.download = `${safeName}.png`;
    link.click();
  }

  return (
    <main className="app-shell">
      <section className="workbench" aria-label="QR code generator">
        <div className="control-panel">
          <p className="eyebrow">免費、免登入、本機處理</p>
          <h1>QR Code 產生器</h1>
          <p className="lede">
            輸入網址、文字、Wi‑Fi 設定或聯絡資訊，選擇容錯能力後下載 SVG 或 PNG。
            所有內容都只在你的瀏覽器中處理。
          </p>

          <label className="field">
            <span>內容</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="輸入網址、Wi‑Fi 設定、聯絡資訊或文字"
              rows={7}
            />
          </label>

          <div className="meta-row">
            <span>{characterCount.toLocaleString()} 個字元</span>
            <span>容錯能力：{selectedLevel.label}</span>
          </div>

          <div className="selector-grid">
            <label className="field">
              <span>容錯能力</span>
              <select
                value={errorLevel}
                onChange={(event) => setErrorLevel(event.target.value)}
              >
                {ERROR_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="format-switch">
              <legend>下載格式</legend>
              {FORMAT_OPTIONS.map((option) => (
                <label
                  className={format === option.value ? 'active' : ''}
                  key={option.value}
                >
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={(event) => setFormat(event.target.value)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          </div>

          {error ? <p className="error-message">{error}</p> : null}

          <button
            className="download-button"
            type="button"
            onClick={downloadQrCode}
            disabled={!hasQrCode || isGenerating}
          >
            {isGenerating ? '產生中…' : `下載 ${format.toUpperCase()}`}
          </button>
        </div>

        <div className="preview-panel">
          <div className="preview-header">
            <span>即時預覽</span>
            <strong>{format.toUpperCase()}</strong>
          </div>

          <div className="qr-stage" aria-live="polite">
            {hasQrCode ? (
              format === 'svg' ? (
                <div
                  className="qr-svg"
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                  aria-label="Generated QR code preview"
                />
              ) : (
                <img src={pngDataUrl} alt="產生的 QR Code 預覽" />
              )
            ) : (
              <div className="empty-state">
                <span />
                <p>輸入內容後，即可在本機產生 QR Code。</p>
              </div>
            )}
          </div>

          <dl className="spec-strip">
            <div>
              <dt>預設格式</dt>
              <dd>SVG</dd>
            </div>
            <div>
              <dt>隱私</dt>
              <dd>本機處理</dd>
            </div>
            <div>
              <dt>容錯能力</dt>
              <dd>{selectedLevel.short}</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="seo-content" aria-label="QR Code 產生器說明">
        <div>
          <p className="eyebrow">使用說明</p>
          <h2>幾秒鐘完成一張可用的 QR Code</h2>
        </div>
        <ol className="guide-grid">
          <li><strong>輸入內容</strong><span>貼上網址、文字、Wi‑Fi 設定或聯絡資訊。</span></li>
          <li><strong>選擇容錯</strong><span>一般用途選中等；印刷或可能遮擋時選高。</span></li>
          <li><strong>下載檔案</strong><span>SVG 適合印刷，PNG 適合簡報與數位素材。</span></li>
        </ol>
        <div className="seo-columns">
          <section>
            <h2>常見用途</h2>
            <p>用於網站連結、活動報到、菜單、名片、Wi‑Fi 分享、簡報與印刷品。建立後請先用手機實際掃描，確認內容正確且尺寸足夠。</p>
          </section>
          <section>
            <h2>常見問題</h2>
            <details><summary>產生 QR Code 需要上傳內容嗎？</summary><p>不用。工具在瀏覽器本機產生 QR Code，輸入內容不會傳送到伺服器。</p></details>
            <details><summary>SVG 與 PNG 有什麼差別？</summary><p>SVG 是向量格式，放大印刷仍清晰；PNG 適合直接置入簡報、社群貼文或一般文件。</p></details>
            <details><summary>容錯能力要怎麼選？</summary><p>一般用途可選中等。若 QR Code 可能因印刷、遮擋或環境而受損，請選高或最佳。</p></details>
          </section>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
