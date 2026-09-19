/**
* Builds the HTML for one carousel slide with a premium, furnished aesthetic matching 1affairs style.
*
* data = {
*   text: "He came to Mumbai at just 17... <span class='highlight'>Today, Ravi Kishan lives in a ₹20 crore house.</span>",
*   subtext: "Money follows my brotherrr | SWIPE",
*   bgImagePath: "file:///abs/path/to/background.jpg",
*   cutoutImagePath: "file:///abs/path/to/person_cutout.png",
*   circleImagePath: "file:///abs/path/to/secondary.jpg",
*   fullBleed: false
* }
*/
function formatBrandLogo(channelName = "1affairs") {
  const clean = String(channelName || "1affairs").trim();
  if (clean.toLowerCase() === "1affairs") {
    return `<span class="one">1</span><span class="affairs">affairs</span>`;
  }
  
  // If starts with number (e.g. 24news, 1india)
  const numMatch = clean.match(/^(\d+)(.*)$/);
  if (numMatch) {
    return `<span class="one">${numMatch[1]}</span><span class="affairs">${numMatch[2]}</span>`;
  }

  // If two words (e.g. Tech Pulse, Daily News)
  if (clean.includes(' ')) {
    const parts = clean.split(/\s+/);
    return `<span class="one">${parts[0]}</span><span class="affairs">${parts.slice(1).join(' ')}</span>`;
  }

  // If camelCase or PascalCase (e.g. FinNews, NewsHub)
  const camelMatch = clean.match(/^([A-Z][a-z0-9]+)([A-Z].*)$/);
  if (camelMatch) {
    return `<span class="one">${camelMatch[1]}</span><span class="affairs">${camelMatch[2]}</span>`;
  }

  // Single word: highlight first 2-3 letters
  if (clean.length > 4) {
    return `<span class="one">${clean.slice(0, 3)}</span><span class="affairs">${clean.slice(3)}</span>`;
  }

  return `<span class="one">${clean[0]}</span><span class="affairs">${clean.slice(1)}</span>`;
}

function buildSlideHTML(data) {
  const {
    text = "",
    subtext = "",
    paragraph = "",
    bgImagePath = "",
    cutoutImagePath = "",
    circleImagePath = "",
    fullBleed = false,
    bgGradient = "linear-gradient(135deg, #0a1128 0%, #1c2541 50%, #3a506b 100%)",
    channelName = "1affairs",
  } = data;

  const isFullBleed = fullBleed || (!cutoutImagePath && !circleImagePath);

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
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: ${isFullBleed ? '#ffffff' : '#0d0d0d'};
      display: flex;
      align-items: center;
    }
    .logo-brand span.one {
      font-size: 36px;
      font-weight: 900;
      color: #2b3ef2;
      margin-right: 2px;
    }
    .logo-brand span.affairs {
      text-decoration: underline;
      text-decoration-color: #2b3ef2;
      text-underline-offset: 5px;
      text-decoration-thickness: 3.5px;
    }
    .logo-arrow {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2.5px solid ${isFullBleed ? '#ffffff' : '#0d0d0d'};
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 4px;
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
      font-size: 68px;
      font-weight: 800;
      line-height: 1.25;
      color: ${isFullBleed ? '#ffffff' : '#0a0a0a'};
      letter-spacing: -1.8px;
    }
    
    /* Premium Blue/Purple Highlight Box */
    .highlight {
      background-color: #2b3ef2;
      color: #ffffff;
      padding: 3px 18px 5px;
      border-radius: 4px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      display: inline;
    }

    /* ENLARGED SUBTEXT */
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

    /* --- SCENE CONTAINER FOR HERO (SPLIT) MODE --- */
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

    /* Circular Inset Badge with Crisp White Border */
    .circle-badge-container {
      position: absolute;
      left: 55px;
      top: 14%;
      z-index: 15;
      display: ${circleImagePath ? 'block' : 'none'};
    }
    .circle-badge {
      width: 340px;
      height: 340px;
      border-radius: 50%;
      border: 8px solid #ffffff;
      background: url('${circleImagePath}') center/cover no-repeat;
      box-shadow: 0 22px 50px rgba(0, 0, 0, 0.42);
      position: relative;
    }
    
    /* Curved Directional Arrow */
    .curved-arrow {
      position: absolute;
      top: -60px;
      right: -80px;
      width: 125px;
      height: 125px;
      z-index: 20;
      transform: rotate(6deg);
      filter: drop-shadow(0 4px 12px rgba(43, 62, 242, 0.5));
    }

    /* Foreground Cutout Person - BLEED TO EDGES (NO CUTOFF EDGES) */
    .cutout-container {
      position: absolute;
      bottom: 0;
      right: -25px; /* Bleed off the right edge so cut arm is hidden */
      width: ${circleImagePath ? '720px' : '850px'};
      height: 100%;
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      z-index: 10;
      pointer-events: none;
    }
    .cutout-image {
      height: 96%;
      max-width: none;
      object-fit: contain;
      object-position: right bottom;
      filter: drop-shadow(-10px 20px 40px rgba(0, 0, 0, 0.55));
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
    /* Dotted texture on dark overlay */
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

    <!-- Top Brand Logo -->
    <div class="logo-container">
      <div class="logo-brand">${formatBrandLogo(channelName)}</div>
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
    <!-- Split Visual Scene: Atmospheric Background + Circular Inset + Cutout Subject -->
    <div class="scene-container">
      <div class="bg-layer"></div>
      <div class="scene-fade-top"></div>
      
      <!-- Circular Inset with White Border & Curved Arrow -->
      ${circleImagePath ? `
      <div class="circle-badge-container">
        <div class="circle-badge">
          <!-- Curved Arrow SVG pointing towards the person -->
          <svg class="curved-arrow" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 80 C 25 30, 65 20, 85 45" stroke="#2b3ef2" stroke-width="8" stroke-linecap="round"/>
            <polygon points="75,25 95,50 65,55" fill="#2b3ef2"/>
          </svg>
        </div>
      </div>` : ''}

      <!-- Foreground Cutout Person (Bleeding to edges so no cutoff) -->
      ${cutoutImagePath ? `
      <div class="cutout-container">
        <img class="cutout-image" src="${cutoutImagePath}" alt="Subject" />
      </div>` : ''}

      <div class="bottom-vignette"></div>
    </div>
    ` : ''}
    
  </body>
  </html>
  `;
}
module.exports = { buildSlideHTML };
