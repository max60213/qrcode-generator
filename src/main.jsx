import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import './styles.css';

const ERROR_LEVELS = [
  { label: 'Low (7%)', value: 'L', short: 'Low' },
  { label: 'Medium (15%)', value: 'M', short: 'Medium' },
  { label: 'High (25%)', value: 'Q', short: 'High' },
  { label: 'Best (30%)', value: 'H', short: 'Best' },
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
          <p className="eyebrow">Browser-only QR tool</p>
          <h1>QR Code Generator</h1>
          <p className="lede">
            Paste text or a URL, choose the recovery strength, and export a
            clean QR code as SVG or PNG. Everything runs locally in your
            browser.
          </p>

          <label className="field">
            <span>Content</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Enter a URL, Wi-Fi string, contact card, or plain text"
              rows={7}
            />
          </label>

          <div className="meta-row">
            <span>{characterCount.toLocaleString()} characters</span>
            <span>{selectedLevel.label} correction</span>
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
              <legend>Export</legend>
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
            {isGenerating ? 'Generating...' : `Download ${format.toUpperCase()}`}
          </button>
        </div>

        <div className="preview-panel">
          <div className="preview-header">
            <span>Live preview</span>
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
                <img src={pngDataUrl} alt="Generated QR code preview" />
              )
            ) : (
              <div className="empty-state">
                <span />
                <p>Enter content to generate a local QR code.</p>
              </div>
            )}
          </div>

          <dl className="spec-strip">
            <div>
              <dt>Default</dt>
              <dd>SVG</dd>
            </div>
            <div>
              <dt>Privacy</dt>
              <dd>Local</dd>
            </div>
            <div>
              <dt>Correction</dt>
              <dd>{selectedLevel.short}</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
