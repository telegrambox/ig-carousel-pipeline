/**
 * Modular Instagram Carousel Slide Template
 * Replicates the authentic visual aesthetic of 'ind.file' & 'indian startups':
 * - Heavy condensed headline typography (League Gothic / Anton / Bebas Neue)
 * - Solid brand banner badge highlights: [[phrase in badge]]
 * - Colored text highlights: {{colored phrase}}
 * - Slide counter: 1/N, 2/N at top right
 * - Halftone dot patterns at corners
 * - Story-driven layouts: 'hero', 'pillars', 'bullet_list', 'quote', 'takeaway'
 * - Handwritten script accents (Caveat) & bottom brush / pill footers
 */

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Parses markdown-style markup for bold headlines:
 * [[text]] -> <span class="badge-box">text</span> (solid colored background pill with white text)
 * {{text}} -> <span class="accent-text">text</span> (colored text)
 * **text** -> <span class="accent-text">text</span> (alternative colored text)
 */
function parseHighlighting(rawText, primaryColor = "#581c87", accentColor = "#6b21a8") {
  if (!rawText) return "";
  let text = String(rawText);

  // Parse [[badge]]
  text = text.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
    return `<span class="badge-box">${p1}</span>`;
  });

  // Parse {{accent}}
  text = text.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
    return `<span class="accent-text">${p1}</span>`;
  });

  // Parse **bold** as accent
  text = text.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
    return `<span class="accent-text">${p1}</span>`;
  });

  return text;
}

/**
 * Builds HTML for one 3:4 carousel slide (1080x1440)
 *
 * @param {object} slide
 *   - slideIndex: number (1-based, e.g. 1)
 *   - totalSlides: number (e.g. 5)
 *   - channelName: string (e.g. "1affairs")
 *   - layoutType: "hero" | "pillars" | "bullet_list" | "quote" | "takeaway"
 *   - headline: string (supports [[badge]] and {{accent}})
 *   - subhook: string (short context line)
 *   - bgImagePath: string (base64 or url)
 *   - cutoutImagePath: string (optional transparent portrait)
 *   - circleImagePath: string (optional circular badge image)
 *   - badgeText: string (optional pill badge text)
 *   - scriptText: string (handwritten cursive note, e.g. "Stronger. Together.")
 *   - quote: string (for quote layout)
 *   - quoteAuthor: string
 *   - bullets: array of strings or { icon: string, text: string }
 *   - pillars: array of { icon: string, text: string }
 *   - primaryColor: string (default "#581c87")
 *   - accentColor: string (default "#6b21a8")
 */
function buildSlideHTML(slide = {}) {
  const {
    slideIndex = 1,
    totalSlides = 3,
    channelName = "1affairs",
    layoutType = "hero",
    headline = "",
    subhook = "",
    bgImagePath = "",
    cutoutImagePath = "",
    circleImagePath = "",
    badgeText = "",
    scriptText = "",
    quote = "",
    quoteAuthor = "",
    bullets = [],
    pillars = [],
    primaryColor = "#581c87",
    accentColor = "#6b21a8",
  } = slide;

  const parsedHeadline = parseHighlighting(headline, primaryColor, accentColor);
  const parsedSubhook = parseHighlighting(subhook, primaryColor, accentColor);
  const parsedQuote = parseHighlighting(quote, primaryColor, accentColor);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Caveat:wght@600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600;1,700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --primary: ${primaryColor};
      --accent: ${accentColor};
      --text-dark: #09090b;
      --text-muted: #475569;
      --bg-light: #ffffff;
    }

    body {
      width: 1080px;
      height: 1440px;
      background-color: var(--bg-light);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: var(--text-dark);
    }

    /* Halftone Dot Matrix Pattern in Corners */
    .halftone-left {
      position: absolute;
      top: 0;
      left: 0;
      width: 320px;
      height: 380px;
      background-image: radial-gradient(#cbd5e1 2.5px, transparent 2.5px);
      background-size: 22px 22px;
      mask-image: radial-gradient(circle at 0% 0%, black 40%, transparent 85%);
      -webkit-mask-image: radial-gradient(circle at 0% 0%, black 40%, transparent 85%);
      pointer-events: none;
      z-index: 1;
    }

    .halftone-right {
      position: absolute;
      top: 0;
      right: 0;
      width: 360px;
      height: 420px;
      background-image: radial-gradient(#cbd5e1 2.5px, transparent 2.5px);
      background-size: 22px 22px;
      mask-image: radial-gradient(circle at 100% 0%, black 40%, transparent 85%);
      -webkit-mask-image: radial-gradient(circle at 100% 0%, black 40%, transparent 85%);
      pointer-events: none;
      z-index: 1;
    }

    /* Top Navigation / Brand Bar */
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 55px 70px 20px 70px;
      position: relative;
      z-index: 10;
    }

    .brand-container {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo-text {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: -1px;
      color: var(--text-dark);
      text-transform: lowercase;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-arrow-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border: 2px solid var(--text-dark);
      border-radius: 50%;
      font-size: 24px;
      font-weight: 700;
      color: var(--text-dark);
    }

    .brand-tagline {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 2px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 4px;
    }

    .slide-counter {
      font-family: 'Anton', 'Bebas Neue', sans-serif;
      font-size: 48px;
      font-weight: 700;
      letter-spacing: 1px;
      color: var(--primary);
      display: flex;
      align-items: baseline;
      position: relative;
    }

    .slide-counter::after {
      content: '';
      position: absolute;
      bottom: -6px;
      right: 0;
      width: 100%;
      height: 4px;
      background: var(--primary);
      border-radius: 2px;
    }

    /* Headline Styles */
    .headline-wrap {
      padding: 20px 70px 0 70px;
      position: relative;
      z-index: 10;
    }

    .main-headline {
      font-family: 'Anton', 'Bebas Neue', 'Plus Jakarta Sans', sans-serif;
      font-size: ${layoutType === 'hero' ? '74px' : '62px'};
      line-height: 1.04;
      letter-spacing: 0.5px;
      color: var(--text-dark);
      text-transform: uppercase;
      margin-bottom: 20px;
      word-break: break-word;
    }

    /* Solid Purple Badge Highlight Block */
    .badge-box {
      background-color: var(--primary);
      color: #ffffff !important;
      padding: 4px 16px;
      display: inline;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      border-radius: 6px;
      margin: 0 4px;
      line-height: 1.3;
      letter-spacing: 0.5px;
    }

    /* Colored Text Accent Highlight */
    .accent-text {
      color: var(--accent);
      font-weight: 800;
    }

    /* Subhook Container with Left Accent Bar */
    .subhook-container {
      display: flex;
      align-items: stretch;
      gap: 18px;
      margin-bottom: 24px;
      max-width: 940px;
    }

    .subhook-bar {
      width: 6px;
      background: var(--primary);
      border-radius: 3px;
      flex-shrink: 0;
    }

    .subhook-text {
      font-size: 24px;
      font-weight: 600;
      line-height: 1.35;
      color: #334155;
    }

    /* Main Visual / Content Container */
    .content-area {
      flex: 1;
      position: relative;
      display: flex;
      flex-direction: column;
      z-index: 5;
    }

    /* Layout 1: Hero */
    .hero-layout {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 10px 70px 30px 70px;
      position: relative;
    }

    .hero-image-frame {
      width: 100%;
      height: 580px;
      border-radius: 26px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
      border: 3px solid #ffffff;
      position: relative;
    }

    .hero-image-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
    }

    .hero-cutout-img {
      position: absolute;
      bottom: 30px;
      left: 70px;
      height: 580px;
      max-width: 750px;
      object-fit: contain;
      object-position: bottom left;
      z-index: 8;
      filter: drop-shadow(0 20px 30px rgba(0,0,0,0.4));
    }

    .hero-circle-badge {
      position: absolute;
      top: 25px;
      right: 90px;
      width: 220px;
      height: 220px;
      border-radius: 50%;
      border: 6px solid #ffffff;
      box-shadow: 0 16px 36px rgba(0,0,0,0.3);
      overflow: hidden;
      z-index: 9;
      background: #ffffff;
    }

    .hero-circle-badge img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Layout 2: Pillars (3 Cards horizontally like AMCA aerospace) */
    .pillars-layout {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 10px 70px 40px 70px;
    }

    .pillars-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
      margin-top: 10px;
      z-index: 10;
    }

    .pillar-card {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 24px 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
    }

    .pillar-icon-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 16px;
      box-shadow: 0 8px 18px rgba(88, 28, 135, 0.3);
    }

    .pillar-text {
      font-size: 19px;
      font-weight: 600;
      line-height: 1.35;
      color: var(--text-dark);
    }

    .pillars-image-container {
      margin-top: 30px;
      width: 100%;
      height: 480px;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.15);
      border: 2px solid #ffffff;
      position: relative;
    }

    .pillars-image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Layout 3: Bullet List (JSSC 3/3 reference with 3 icons + scene) */
    .bullet-layout {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 10px 70px 40px 70px;
    }

    .bullet-split {
      display: flex;
      gap: 36px;
      margin-top: 15px;
      align-items: flex-start;
      z-index: 10;
    }

    .bullet-list-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .bullet-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
      box-shadow: 0 6px 14px rgba(88, 28, 135, 0.25);
    }

    .bullet-item-text {
      font-size: 22px;
      font-weight: 600;
      line-height: 1.38;
      color: var(--text-dark);
    }

    .bullet-image-right {
      width: 440px;
      height: 480px;
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
      border: 3px solid #ffffff;
      flex-shrink: 0;
    }

    .bullet-image-right img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Layout 4: Quote Callout Layout */
    .quote-layout {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 10px 70px 40px 70px;
    }

    .quote-image-hero {
      width: 100%;
      height: 520px;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.15);
      border: 3px solid #ffffff;
      margin-top: 15px;
      position: relative;
    }

    .quote-image-hero img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .quote-banner-card {
      background: linear-gradient(135deg, var(--primary) 0%, #3b0764 100%);
      color: #ffffff;
      padding: 30px 40px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 28px;
      box-shadow: 0 14px 30px rgba(88, 28, 135, 0.35);
      margin-top: 24px;
      z-index: 10;
    }

    .quote-icon-mark {
      font-family: 'Anton', sans-serif;
      font-size: 82px;
      line-height: 0.8;
      color: rgba(255, 255, 255, 0.4);
      flex-shrink: 0;
    }

    .quote-card-text {
      font-size: 26px;
      font-weight: 700;
      line-height: 1.35;
    }

    .quote-card-author {
      font-size: 18px;
      font-weight: 500;
      opacity: 0.85;
      margin-top: 8px;
    }

    /* Bottom Brush Footer Accent */
    .bottom-bar {
      position: relative;
      z-index: 12;
      padding: 24px 70px 45px 70px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .footer-brush-badge {
      background: var(--primary);
      color: #ffffff;
      padding: 16px 36px;
      border-radius: 40px;
      display: inline-flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 8px 24px rgba(88, 28, 135, 0.3);
    }

    .footer-badge-title {
      font-family: 'Anton', 'Bebas Neue', sans-serif;
      font-size: 26px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .footer-script-text {
      font-family: 'Caveat', cursive;
      font-size: 38px;
      font-weight: 700;
      color: var(--primary);
      text-shadow: 0 1px 2px rgba(255,255,255,0.8);
    }

    .footer-follow-text {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.2px;
    }
  </style>
</head>
<body>
  <!-- Halftone Dot Matrix in Corners -->
  <div class="halftone-left"></div>
  <div class="halftone-right"></div>

  <!-- Top Bar -->
  <div class="top-bar">
    <div class="brand-container">
      <div class="brand-logo-text">
        <span>${escapeHtml(channelName)}</span>
        <span class="brand-arrow-icon">→</span>
      </div>
      <div class="brand-tagline">INDIA. INSIGHTS. IMPACT.</div>
    </div>
    <div class="slide-counter">${slideIndex}/${totalSlides}</div>
  </div>

  <!-- Main Headline Block -->
  <div class="headline-wrap">
    <h1 class="main-headline">${parsedHeadline}</h1>
    ${subhook ? `
    <div class="subhook-container">
      <div class="subhook-bar"></div>
      <div class="subhook-text">${parsedSubhook}</div>
    </div>` : ''}
  </div>

  <!-- Dynamic Content Area based on Layout -->
  <div class="content-area">
    ${renderLayoutBody(slide)}
  </div>

  <!-- Bottom Accent / Script Footer -->
  <div class="bottom-bar">
    ${scriptText ? `<div class="footer-script-text">${escapeHtml(scriptText)}</div>` : ''}
    ${badgeText ? `
    <div class="footer-brush-badge">
      <span class="footer-badge-title">${parseHighlighting(badgeText, primaryColor, accentColor)}</span>
    </div>` : ''}
    <div class="footer-follow-text">Thanks for following <strong>${escapeHtml(channelName)}</strong> 💜</div>
  </div>
</body>
</html>`;
}

/**
 * Dispatches HTML rendering for specific layout variations
 */
function renderLayoutBody(slide) {
  const {
    layoutType = "hero",
    bgImagePath = "",
    cutoutImagePath = "",
    circleImagePath = "",
    bullets = [],
    pillars = [],
    quote = "",
    quoteAuthor = "",
    primaryColor = "#581c87",
    accentColor = "#6b21a8",
  } = slide;

  switch (layoutType) {
    case "pillars": {
      const defaultIcons = ["🚀", "🤝", "🛡️", "⚡", "📈"];
      const cardsHtml = pillars.map((p, i) => `
        <div class="pillar-card">
          <div class="pillar-icon-circle">${p.icon || defaultIcons[i % defaultIcons.length]}</div>
          <div class="pillar-text">${parseHighlighting(typeof p === 'string' ? p : p.text, primaryColor, accentColor)}</div>
        </div>
      `).join("");

      return `
      <div class="pillars-layout">
        <div class="pillars-row">${cardsHtml}</div>
        ${bgImagePath ? `
        <div class="pillars-image-container">
          <img src="${bgImagePath}" alt="Visual context" />
        </div>` : ''}
      </div>`;
    }

    case "bullet_list": {
      const defaultIcons = ["✓", "👥", "🛡️", "📌"];
      const itemsHtml = bullets.map((b, i) => `
        <div class="bullet-item">
          <div class="bullet-icon-wrap">${(typeof b === 'object' && b.icon) || defaultIcons[i % defaultIcons.length]}</div>
          <div class="bullet-item-text">${parseHighlighting(typeof b === 'string' ? b : b.text, primaryColor, accentColor)}</div>
        </div>
      `).join("");

      return `
      <div class="bullet-layout">
        <div class="bullet-split">
          <div class="bullet-list-left">${itemsHtml}</div>
          ${bgImagePath ? `
          <div class="bullet-image-right">
            <img src="${bgImagePath}" alt="Visual context" />
          </div>` : ''}
        </div>
      </div>`;
    }

    case "quote": {
      return `
      <div class="quote-layout">
        ${bgImagePath ? `
        <div class="quote-image-hero">
          <img src="${bgImagePath}" alt="Visual context" />
        </div>` : ''}
        <div class="quote-banner-card">
          <div class="quote-icon-mark">“</div>
          <div>
            <div class="quote-card-text">${parseHighlighting(quote, primaryColor, accentColor)}</div>
            ${quoteAuthor ? `<div class="quote-card-author">— ${escapeHtml(quoteAuthor)}</div>` : ''}
          </div>
        </div>
      </div>`;
    }

    case "takeaway":
    case "hero":
    default: {
      return `
      <div class="hero-layout">
        ${bgImagePath ? `
        <div class="hero-image-frame">
          <img src="${bgImagePath}" alt="Main Scene" />
        </div>` : ''}
        ${cutoutImagePath ? `
          <img src="${cutoutImagePath}" class="hero-cutout-img" alt="Main Figure" />
        ` : ''}
        ${circleImagePath ? `
        <div class="hero-circle-badge">
          <img src="${circleImagePath}" alt="Highlight" />
        </div>` : ''}
      </div>`;
    }
  }
}

module.exports = {
  buildSlideHTML,
  parseHighlighting,
};
