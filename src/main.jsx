import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import './i18n';
import './styles.css';

const INITIAL_TEXT = 'https://qr.maxlin.tw';
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
        rects.push(`<rect x="${x + QR_MARGIN}" y="${y + QR_MARGIN}" width="1" height="1"/>`);
      }
    }
  }
  return [`<svg xmlns="http://www.w3.org/2000/svg" width="${QR_SIZE}" height="${QR_SIZE}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges">`, `<rect width="100%" height="100%" fill="${QR_LIGHT}"/>`, `<g fill="${QR_DARK}">`, rects.join(''), '</g>', '</svg>'].join('');
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
      if (!context) { URL.revokeObjectURL(url); reject(new Error('canvas')); return; }
      context.fillStyle = QR_LIGHT;
      context.fillRect(0, 0, QR_SIZE, QR_SIZE);
      context.drawImage(image, 0, 0, QR_SIZE, QR_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('image'));
    image.src = url;
  });
}

function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  return <nav className="language-switch" aria-label={t('app.language')}>
    <a className={!isEnglish ? 'active' : ''} href="/zh-tw/" lang="zh-Hant">{t('app.traditionalChinese')}</a>
    <a className={isEnglish ? 'active' : ''} href="/en/" lang="en">{t('app.english')}</a>
  </nav>;
}

function App() {
  const { t } = useTranslation();
  const [text, setText] = useState(INITIAL_TEXT);
  const [errorLevel, setErrorLevel] = useState('M');
  const [format, setFormat] = useState('svg');
  const [svgMarkup, setSvgMarkup] = useState('');
  const [pngDataUrl, setPngDataUrl] = useState('');
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const levels = useMemo(() => [
    { label: t('levels.low'), value: 'L', short: t('levels.lowShort') },
    { label: t('levels.medium'), value: 'M', short: t('levels.mediumShort') },
    { label: t('levels.high'), value: 'Q', short: t('levels.highShort') },
    { label: t('levels.best'), value: 'H', short: t('levels.bestShort') },
  ], [t]);
  const selectedLevel = levels.find((level) => level.value === errorLevel);

  useEffect(() => {
    let isCurrent = true;
    const value = text.trim();
    if (!value) { setSvgMarkup(''); setPngDataUrl(''); setError(''); setIsGenerating(false); return undefined; }
    async function generateQrCode() {
      setIsGenerating(true); setError('');
      try {
        const nextSvg = buildIndependentModuleSvg(value, errorLevel);
        const nextPng = await svgToPngDataUrl(nextSvg);
        if (isCurrent) { setSvgMarkup(nextSvg); setPngDataUrl(nextPng); }
      } catch {
        if (isCurrent) { setSvgMarkup(''); setPngDataUrl(''); setError(t('app.error')); }
      } finally { if (isCurrent) setIsGenerating(false); }
    }
    generateQrCode();
    return () => { isCurrent = false; };
  }, [text, errorLevel, t]);

  const hasQrCode = Boolean(svgMarkup && pngDataUrl && !error);
  function downloadQrCode() {
    if (!hasQrCode) return;
    const link = document.createElement('a');
    const safeName = `qr-code-${selectedLevel.short.toLowerCase()}`;
    if (format === 'svg') {
      link.href = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }));
      link.download = `${safeName}.svg`; link.click(); URL.revokeObjectURL(link.href); return;
    }
    link.href = pngDataUrl; link.download = `${safeName}.png`; link.click();
  }
  const steps = [['stepOneTitle', 'stepOneText'], ['stepTwoTitle', 'stepTwoText'], ['stepThreeTitle', 'stepThreeText']];
  const faqs = [['faqPrivacyQuestion', 'faqPrivacyAnswer'], ['faqFormatQuestion', 'faqFormatAnswer'], ['faqCorrectionQuestion', 'faqCorrectionAnswer']];

  return <main className="app-shell">
    <section className="workbench" aria-label={t('app.title')}>
      <div className="control-panel">
        <div className="control-topline"><p className="eyebrow">{t('app.eyebrow')}</p><LanguageSwitch /></div>
        <h1>{t('app.title')}</h1><p className="lede">{t('app.lede')}</p>
        <label className="field"><span>{t('app.content')}</span><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={t('app.placeholder')} rows={7} /></label>
        <div className="meta-row"><span>{t('app.characters', { count: text.trim().length })}</span><span>{t('app.correction', { level: selectedLevel.label })}</span></div>
        <div className="selector-grid"><label className="field"><span>{t('app.correctionLabel')}</span><select value={errorLevel} onChange={(event) => setErrorLevel(event.target.value)}>{levels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}</select></label>
          <fieldset className="format-switch"><legend>{t('app.format')}</legend>{['svg', 'png'].map((option) => <label className={format === option ? 'active' : ''} key={option}><input type="radio" name="format" value={option} checked={format === option} onChange={(event) => setFormat(event.target.value)} />{option.toUpperCase()}</label>)}</fieldset></div>
        {error ? <p className="error-message">{error}</p> : null}
        <button className="download-button" type="button" onClick={downloadQrCode} disabled={!hasQrCode || isGenerating}>{isGenerating ? t('app.generating') : t('app.download', { format: format.toUpperCase() })}</button>
      </div>
      <div className="preview-panel"><div className="preview-header"><span>{t('app.preview')}</span><strong>{format.toUpperCase()}</strong></div>
        <div className="qr-stage" aria-live="polite">{hasQrCode ? (format === 'svg' ? <div className="qr-svg" dangerouslySetInnerHTML={{ __html: svgMarkup }} aria-label={t('app.previewAlt')} /> : <img src={pngDataUrl} alt={t('app.previewAlt')} />) : <div className="empty-state"><span /><p>{t('app.empty')}</p></div>}</div>
        <dl className="spec-strip"><div><dt>{t('app.defaultFormat')}</dt><dd>SVG</dd></div><div><dt>{t('app.privacy')}</dt><dd>{t('app.local')}</dd></div><div><dt>{t('app.correctionLabel')}</dt><dd>{selectedLevel.short}</dd></div></dl>
      </div>
    </section>
    <section className="seo-content" aria-label={t('app.help')}><div><p className="eyebrow">{t('app.help')}</p><h2>{t('app.helpTitle')}</h2></div>
      <ol className="guide-grid">{steps.map(([title, copy]) => <li key={title}><strong>{t(`app.${title}`)}</strong><span>{t(`app.${copy}`)}</span></li>)}</ol>
      <div className="seo-columns"><section><h2>{t('app.usesTitle')}</h2><p>{t('app.usesText')}</p></section><section><h2>{t('app.faqTitle')}</h2>{faqs.map(([question, answer]) => <details key={question}><summary>{t(`app.${question}`)}</summary><p>{t(`app.${answer}`)}</p></details>)}</section></div>
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
