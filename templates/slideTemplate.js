/**
 * Builds the HTML for one carousel slide with a premium, furnished aesthetic.
 * Matches Indian Startups / 1affairs style with dynamic channel branding,
 * multiple cutout people (with position X/Y, scale, flip), multiple circular badges (with arrows),
 * and high-impact typography.
 */

function formatBrandLogo(channelName, isFullBleed) {
  const brand = (channelName || '1affairs').trim();
  const textColor = isFullBleed ? '#ffffff' : '#0d0d0d';

  if (brand.toLowerCase() === '1affairs') {
    return `<span class="one" style="font-size:36px;font-weight:900;color:#2b3ef2;margin-right:2px;">1</span><span class="affairs" style="text-decoration:underline;text-decoration-color:#2b3ef2;text-underline-offset:5px;text-decoration-thickness:3.5px;">affairs</span>`;
  }

  const words = brand.split(/\s+/);
  if (words.length > 1) {
    return `
      <div style="display:flex; flex-direction:column; align-items:center; line-height: 1; text-align: center;">
        <span style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: ${textColor}; text-transform: lowercase;">${words[0]}</span>
        <span style="font-size: 17px; font-weight: 700; letter-spacing: 0.5px; color: ${textColor}; opacity: 0.85; text-transform: lowercase;">${words.slice(1).join(' ')}</span>
      </div>
    `;
  }

  return `<span style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: ${textColor}; text-transform: lowercase;">${brand}</span>`;
}

function buildSlideHTML(data) {
  const {
    text = "",
    subtext = "",
    paragraph = "",
    channelName = "1affairs",
    bgImagePath = "",
    cutoutImagePath = "",
    circleImagePath = "",
    cutouts = [],
    badges = [],
    fullBleed = false,
    bgGradient = "linear-gradient(135deg, #0a1128 0%, #1c2541 50%, #3a506b 100%)",
  } = data;

  // Normalize multiple cutouts with backward compatibility
  let allCutouts = Array.isArray(cutouts) && cutouts.length > 0 
    ? cutouts.filter(c => c && c.image)
    : (cutoutImagePath ? [{ image: cutoutImagePath, x: 75, y: 0, scale: 100, flip: false }] : []);

  // Normalize multiple badges with backward compatibility
  let allBadges = Array.isArray(badges) && badges.length > 0
    ? badges.filter(b => b && b.image)
    : (circleImagePath ? [{ image: circleImagePath, x: 14, y: 22, scale: 100, showArrow: true }] : []);

  const hasAddons = allCutouts.length > 0 || allBadges.length > 0;
  const isFullBleed = fullBleed || !hasAddons;

  return `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500;1,600;1,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px;
      height: 1440px;
      background-color: ${isFullBleed ? '#0b0f19' : '#ffffff'};
      ${!isFullBleed ? `
      /* Dotted background texture */
      background-image: radial-gradient(#cad3e3 3.5px, transparent 3.5px);
      background-size: 32px 32px;
      background-position: center top;
      ` : ''}
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    
    /* Top Logo Area */
    .logo-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      padding-top: 45px;
      position: relative;
      z-index: 30;
    }
    .logo-brand {
      display: flex;
      align-items: center;
    }
    .logo-arrow {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2.5px solid ${isFullBleed ? '#ffffff' : '#0d0d0d'};
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 6px;
    }
    .logo-arrow svg {
      width: 18px;
      height: 18px;
    }

    /* Main Headline Block - ENLARGED FOR HIGH IMPACT */
    .text-block {
      position: relative;
      z-index: 30;
      padding: 35px 55px 0;
      text-align: center;
    }
    
    .headline {
      font-size: 66px;
      font-weight: 800;
      line-height: 1.25;
      color: ${isFullBleed ? '#ffffff' : '#0a0a0a'};
      letter-spacing: -1.8px;
    }
    
    /* Signature Indigo/Purple Highlight Box */
    .highlight {
      background-color: #2b3ef2;
      color: #ffffff;
      padding: 3px 18px 5px;
      border-radius: 4px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      display: inline;
    }

    /* Subtext */
    .subtext {
      margin-top: 25px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 34px;
      color: ${isFullBleed ? '#e2e8f0' : '#1e293b'};
      font-weight: 600;
      font-style: italic;
      line-height: 1.35;
    }
    
    .paragraph {
      margin-top: 25px;
      font-family: 'Inter', sans-serif;
      font-size: 28px;
      line-height: 1.5;
      color: ${isFullBleed ? '#cbd5e1' : '#334155'};
      text-align: left;
      font-weight: 400;
      padding: 0 20px;
      display: ${paragraph ? 'block' : 'none'};
    }

    /* --- SCENE CONTAINER FOR HERO / SPLIT MODE --- */
    .scene-container {
      position: absolute;
      top: 36%;
      bottom: 0;
      left: 0;
      width: 100%;
      z-index: 5;
      overflow: hidden;
      display: ${isFullBleed ? 'none' : 'block'};
    }
    
    /* Rich Atmosphere Background */
    .bg-layer {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${bgImagePath ? `url('${bgImagePath}') center/cover no-repeat` : bgGradient};
      filter: ${bgImagePath ? 'brightness(0.92) contrast(1.1) saturate(1.15)' : 'none'};
      z-index: 1;
    }

    /* Smooth Fade from White Dots into the Photo Scene */
    .scene-fade-top {
      position: absolute;
      top: -2px;
      left: 0;
      width: 100%;
      height: 42%;
      background: linear-gradient(to bottom, 
        rgba(255, 255, 255, 1) 0%, 
        rgba(255, 255, 255, 0.95) 20%, 
        rgba(255, 255, 255, 0.4) 65%, 
        rgba(255, 255, 255, 0) 100%);
      z-index: 3;
      pointer-events: none;
    }

    /* Bottom Vignette to ground the subject */
    .bottom-vignette {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 25%;
      background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%);
      z-index: 12;
      pointer-events: none;
    }

    /* --- FULL BLEED CINEMATIC MODE (FOR STORYTELLING BREAKDOWN SLIDES) --- */
    .full-bleed-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${bgImagePath ? `url('${bgImagePath}') center/cover no-repeat` : bgGradient};
      z-index: 1;
      filter: brightness(0.85) contrast(1.15) saturate(1.1);
    }
    .full-bleed-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to bottom, 
        rgba(11, 15, 25, 0.94) 0%, 
        rgba(11, 15, 25, 0.85) 32%, 
        rgba(11, 15, 25, 0.25) 60%, 
        rgba(11, 15, 25, 0.88) 100%);
      z-index: 2;
    }
    .dark-dotted-texture {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 38%;
      background-image: radial-gradient(rgba(255, 255, 255, 0.15) 3px, transparent 3px);
      background-size: 32px 32px;
      z-index: 3;
      pointer-events: none;
    }
  </style>
  </head>
  <body>
    ${isFullBleed ? `
      <!-- Full-bleed Cinematic Story Scene -->
      <div class="full-bleed-bg"></div>
      <div class="full-bleed-overlay"></div>
      <div class="dark-dotted-texture"></div>
    ` : ''}

    <!-- Top Channel Brand Logo -->
    <div class="logo-container">
      <div class="logo-brand">
        ${formatBrandLogo(channelName, isFullBleed)}
      </div>
      <div class="logo-arrow">
        <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="${isFullBleed ? '#ffffff' : '#0d0d0d'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
      </div>
    </div>

    <!-- Main Text Block -->
    <div class="text-block">
      <div class="headline">${text}</div>
      ${subtext ? `<div class="subtext">${subtext}</div>` : ''}
      ${paragraph ? `<div class="paragraph">${paragraph}</div>` : ''}
    </div>
    
    ${!isFullBleed ? `
    <!-- Split Visual Scene: Atmospheric Background + Circular Insets + Cutout Subjects -->
    <div class="scene-container">
      <div class="bg-layer"></div>
      <div class="scene-fade-top"></div>
      
      <!-- Multiple Circular Badges with Arrows -->
      ${allBadges.map((badge, bIdx) => {
        const x = badge.x !== undefined ? Number(badge.x) : (allBadges.length > 1 ? (bIdx === 0 ? 14 : 82) : 14);
        const y = badge.y !== undefined ? Number(badge.y) : (allBadges.length > 1 ? 16 : 20);
        const scale = (badge.scale !== undefined ? Number(badge.scale) : 100) / 100;
        const baseSize = 320;
        const size = Math.round(baseSize * scale);
        const showArrow = badge.showArrow !== false;
        const arrowOnRight = x < 50;

        return `
        <div class="custom-badge-wrapper" style="
          position: absolute;
          left: ${x}%;
          top: ${y}%;
          transform: translate(-50%, -50%);
          z-index: 18;
        ">
          <div style="
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 8px solid #ffffff;
            background: url('${badge.image}') center/cover no-repeat;
            box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
            position: relative;
          ">
            ${showArrow ? `
            <svg class="curved-arrow" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="
              position: absolute;
              ${arrowOnRight ? 'top: -55px; right: -75px; transform: rotate(10deg);' : 'top: -55px; left: -75px; transform: scaleX(-1) rotate(10deg);'}
              width: 120px;
              height: 120px;
              filter: drop-shadow(0 4px 12px rgba(43, 62, 242, 0.5));
              pointer-events: none;
            ">
              <path d="M15 80 C 25 30, 65 20, 85 45" stroke="#2b3ef2" stroke-width="8" stroke-linecap="round"/>
              <polygon points="75,25 95,50 65,55" fill="#2b3ef2"/>
            </svg>
            ` : ''}
          </div>
        </div>
        `;
      }).join('')}

      <!-- Multiple Cutout Subjects (Bleeding to bottom with customizable X, Y, Scale, Flip) -->
      ${allCutouts.map((cutout, cIdx) => {
        const x = cutout.x !== undefined ? Number(cutout.x) : (allCutouts.length > 1 ? (cIdx === 0 ? 25 : 75) : 75);
        const y = cutout.y !== undefined ? Number(cutout.y) : 0;
        const scale = (cutout.scale !== undefined ? Number(cutout.scale) : 100) / 100;
        const flip = cutout.flip ? -1 : 1;
        const z = cutout.zIndex || (10 + cIdx);
        const maxW = allCutouts.length > 1 ? 620 : (allBadges.length > 0 ? 760 : 880);

        return `
        <div class="custom-cutout-wrapper" style="
          position: absolute;
          left: ${x}%;
          bottom: ${y}%;
          transform: translate(-50%, 0) scale(${scale});
          transform-origin: bottom center;
          z-index: ${z};
          pointer-events: none;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          height: 100%;
          max-height: 920px;
        ">
          <img class="cutout-image" src="${cutout.image}" style="
            height: 100%;
            max-width: ${maxW}px;
            object-fit: contain;
            object-position: bottom center;
            transform: scaleX(${flip});
            filter: drop-shadow(-8px 18px 36px rgba(0, 0, 0, 0.52));
          " alt="Cutout ${cIdx + 1}" />
        </div>
        `;
      }).join('')}

      <div class="bottom-vignette"></div>
    </div>
    ` : ''}
    
  </body>
  </html>
  `;
}

module.exports = { buildSlideHTML };
