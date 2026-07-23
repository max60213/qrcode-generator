import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import en from '../src/locales/en.json' with { type: 'json' };
import zhTw from '../src/locales/zh-tw.json' with { type: 'json' };

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const origin = 'https://qr.maxlin.tw';
const pages = [
  { code: 'en', path: '/en/', lang: 'en', locale: 'en_US', data: en },
  { code: 'zh-tw', path: '/zh-tw/', lang: 'zh-Hant', locale: 'zh_TW', data: zhTw },
];

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
const paragraph = (value) => `<p>${escapeHtml(value)}</p>`;

function faqSchema(app) {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
      ['faqPrivacyQuestion', 'faqPrivacyAnswer'], ['faqFormatQuestion', 'faqFormatAnswer'], ['faqCorrectionQuestion', 'faqCorrectionAnswer'],
    ].map(([name, text]) => ({ '@type': 'Question', name: app[name], acceptedAnswer: { '@type': 'Answer', text: app[text] } })),
  };
}

function renderStaticBody(page) {
  const { app } = page.data;
  const alternateLinks = pages.map((item) => `<a href="${item.path}" lang="${item.lang}"${item.code === page.code ? ' aria-current="page"' : ''}>${escapeHtml(item.code === 'en' ? app.english : app.traditionalChinese)}</a>`).join('');
  return `<main class="static-page">
    <nav class="language-switch" aria-label="${escapeHtml(app.language)}">${alternateLinks}</nav>
    <section class="static-intro"><p>${escapeHtml(app.eyebrow)}</p><h1>${escapeHtml(app.title)}</h1>${paragraph(app.lede)}</section>
    <section><h2>${escapeHtml(app.helpTitle)}</h2><ol><li><strong>${escapeHtml(app.stepOneTitle)}</strong>${paragraph(app.stepOneText)}</li><li><strong>${escapeHtml(app.stepTwoTitle)}</strong>${paragraph(app.stepTwoText)}</li><li><strong>${escapeHtml(app.stepThreeTitle)}</strong>${paragraph(app.stepThreeText)}</li></ol></section>
    <section><h2>${escapeHtml(app.usesTitle)}</h2>${paragraph(app.usesText)}</section>
    <section><h2>${escapeHtml(app.faqTitle)}</h2><h3>${escapeHtml(app.faqPrivacyQuestion)}</h3>${paragraph(app.faqPrivacyAnswer)}<h3>${escapeHtml(app.faqFormatQuestion)}</h3>${paragraph(app.faqFormatAnswer)}<h3>${escapeHtml(app.faqCorrectionQuestion)}</h3>${paragraph(app.faqCorrectionAnswer)}</section>
  </main>`;
}

function renderPage(page, assets) {
  const { app, meta } = page.data;
  const canonical = `${origin}${page.path}`;
  const webApplication = { '@context': 'https://schema.org', '@type': 'WebApplication', name: app.title, url: canonical, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web', inLanguage: page.lang, description: meta.description, offers: { '@type': 'Offer', price: '0', priceCurrency: 'TWD' }, featureList: 'QR code generation; SVG and PNG download; local processing' };
  const hreflang = pages.map((item) => `<link rel="alternate" hreflang="${item.lang === 'zh-Hant' ? 'zh-Hant-TW' : item.lang}" href="${origin}${item.path}" />`).join('');
  return `<!doctype html><html lang="${page.lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="robots" content="index, follow" /><meta name="theme-color" content="#0f62fe" /><meta name="description" content="${escapeHtml(meta.description)}" /><link rel="canonical" href="${canonical}" />${hreflang}<link rel="alternate" hreflang="x-default" href="${origin}/zh-tw/" /><meta property="og:type" content="website" /><meta property="og:locale" content="${page.locale}" /><meta property="og:site_name" content="QR Code Generator" /><meta property="og:title" content="${escapeHtml(meta.ogTitle)}" /><meta property="og:description" content="${escapeHtml(meta.ogDescription)}" /><meta property="og:url" content="${canonical}" /><meta name="twitter:card" content="summary" /><meta name="twitter:title" content="${escapeHtml(meta.ogTitle)}" /><meta name="twitter:description" content="${escapeHtml(meta.ogDescription)}" /><title>${escapeHtml(meta.title)}</title><script type="application/ld+json">${JSON.stringify(webApplication)}</script><script type="application/ld+json">${JSON.stringify(faqSchema(app))}</script>${assets.stylesheet}</head><body><div id="root">${renderStaticBody(page)}</div>${assets.script}</body></html>`;
}

const builtIndex = await readFile(resolve(dist, 'index.html'), 'utf8');
const assets = {
  stylesheet: builtIndex.match(/<link rel="stylesheet"[^>]+>/)?.[0] ?? '',
  script: builtIndex.match(/<script type="module"[^>]+><\/script>/)?.[0] ?? '',
};
if (!assets.script || !assets.stylesheet) throw new Error('Unable to find Vite assets in dist/index.html.');

for (const page of pages) {
  const output = resolve(dist, page.code);
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'index.html'), renderPage(page, assets));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages.map((page) => `  <url>\n    <loc>${origin}${page.path}</loc>\n${pages.map((alternate) => `    <xhtml:link rel="alternate" hreflang="${alternate.lang === 'zh-Hant' ? 'zh-Hant-TW' : alternate.lang}" href="${origin}${alternate.path}" />`).join('\n')}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}/zh-tw/" />\n  </url>`).join('\n')}</urlset>\n`;
await writeFile(resolve(dist, 'sitemap.xml'), sitemap);
