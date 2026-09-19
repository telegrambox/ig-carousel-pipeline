/**
 * Daily News Carousel Template
 * Style inspired by high-engagement 24h India news roundups.
 * Canvas: 1080 x 1350 (standard 4:5 portrait)
 */

function formatDailyNewsFooter(channelName = "ind.file") {
  let clean = String(channelName || "").trim();
  // If empty or legacy default '1affairs', default to 'ind.file'
  if (!clean || clean.toLowerCase() === "1affairs") {
    clean = "ind.file";
  }

  let orangePart = "ind.";
  let whitePart = "file";

  if (clean.includes(".")) {
    const dotIdx = clean.indexOf(".");
    orangePart = clean.substring(0, dotIdx + 1).toLowerCase();
    whitePart = clean.substring(dotIdx + 1).toLowerCase();
  } else if (clean.toLowerCase().endsWith("file") && clean.length > 4) {
    orangePart = clean.substring(0, clean.length - 4).toLowerCase() + ".";
    whitePart = "file";
  } else if (clean.includes(" ")) {
    const parts = clean.split(/\s+/);
    orangePart = parts[0].toLowerCase() + ".";
    whitePart = parts.slice(1).join("").toLowerCase();
  } else if (clean.toLowerCase() === "ind") {
    orangePart = "ind.";
    whitePart = "file";
  } else {
    orangePart = clean.toLowerCase() + ".";
    whitePart = "file";
  }

  return `
    <!-- Image 3 Daily News Custom Brand Footer -->
    <div style="
      position: absolute;
      bottom: 66px;
      left: 0;
      width: 1080px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 58px;
      z-index: 50;
      box-sizing: border-box;
    ">
      <!-- Saffron / Orange Accent Line on Left -->
      <div style="
        flex: 1;
        height: 3px;
        background-color: #ff6200;
        border-radius: 2px;
      "></div>

      <!-- Center Logo Wordmark in Italic Black Sans-serif -->
      <div style="
        font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        font-style: italic;
        font-weight: 900;
        font-size: 54px;
        letter-spacing: -1.2px;
        margin: 0 20px;
        line-height: 1;
        display: flex;
        align-items: center;
        white-space: nowrap;
      ">
        <span style="color: #ff6200;">${orangePart}</span><span style="color: #ffffff;">${whitePart}</span>
      </div>

      <!-- Indian Green Accent Line on Right -->
      <div style="
        flex: 1;
        height: 3px;
        background-color: #108944;
        border-radius: 2px;
      "></div>
    </div>
  `;
}

function buildDailyNewsSlideHTML(data) {
  const {
    isCover = false,
    isCta = false,
    coverStyle = "styleA", // 'styleA' (Single hero cutout + 3 badges) or 'styleB' (Dual hero cutouts + 3 badges)
    channelName = "ind.file",
    text = "",
    highlightWord = "",
    bgImagePath = "",
    cutoutImagePath = "",
    cutout2ImagePath = "",
    badgeImages = [], // Array of up to 3 image paths
    ctaImagePath = "",
  } = data;

  const watermarkHTML = ""; // Daily News has NO upper logo per user instructions
  const footerHTML = formatDailyNewsFooter(channelName);

  // Common Header styles
  const headStyles = `
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800;900&family=Inter:wght@600;700;800&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1080px;
        height: 1350px;
        background-color: #000000;
        color: #ffffff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        position: relative;
        overflow: hidden;
      }
      .daily-yellow {
        color: #ffe500 !important;
        font-weight: 900 !important;
      }
    </style>
  `;

  // --- CTA SLIDE ---
  if (isCta) {
    if (ctaImagePath) {
      return `
      <!DOCTYPE html><html><head>${headStyles}</head>
      <body>
        <div style="width: 1080px; height: 1350px; background: url('${ctaImagePath}') center/cover no-repeat;"></div>
      </body></html>`;
    }

    return `
    <!DOCTYPE html><html><head>${headStyles}</head>
    <body>
      <div style="
        width: 1080px;
        height: 1220px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 0 80px;
        background: radial-gradient(circle at center, #141414 0%, #000000 100%);
      ">
        <svg style="width: 80px; height: 80px; fill: #ffe500; margin-bottom: 25px;" viewBox="0 0 24 24">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <h1 style="font-size: 64px; font-weight: 900; line-height: 1.25; margin-bottom: 20px;">
          STAY AHEAD WITH <span class="daily-yellow">24-HOUR</span> REAL-TIME UPDATES
        </h1>
        <p style="font-size: 32px; font-weight: 700; color: #a1a1aa; margin-bottom: 40px;">
          What happened in India, delivered in 60 seconds every single day.
        </p>
        <div style="
          background: #ffe500;
          color: #000000;
          padding: 16px 44px;
          border-radius: 50px;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 1px;
        ">
          FOLLOW @${String(channelName).toUpperCase()}
        </div>
      </div>
      ${footerHTML}
    </body></html>`;
  }

  // --- COVER SLIDE (SLIDE 1) ---
  if (isCover) {
    const b1 = badgeImages[0] || "";
    const b2 = badgeImages[1] || "";
    const b3 = badgeImages[2] || "";

    const isStyleB = coverStyle === "styleB";

    return `
    <!DOCTYPE html><html><head>${headStyles}</head>
    <body>
      <!-- Background Atmosphere Scene -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        width: 1080px;
        height: 980px;
        background: url('${bgImagePath}') center/cover no-repeat;
        z-index: 1;
      ">
        <!-- Smooth Bottom Fade into Solid Black -->
        <div style="
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 40%, #000000 85%, #000000 100%);
        "></div>
      </div>

      <!-- BADGES & HERO CUTOUTS -->
      ${!isStyleB ? `
        <!-- STYLE A: 1 Hero Cutout on Left + 3 Badges on Right -->
        ${cutoutImagePath ? `
        <div style="
          position: absolute;
          bottom: 430px;
          left: 0;
          width: 580px;
          height: 680px;
          z-index: 10;
          display: flex;
          align-items: flex-end;
          pointer-events: none;
        ">
          <img src="${cutoutImagePath}" style="
            max-height: 100%;
            max-width: 100%;
            object-fit: contain;
            filter: drop-shadow(-10px 18px 30px rgba(0,0,0,0.7));
          " />
        </div>` : ''}

        <!-- 3 Circular Badges (Style A Layout) -->
        ${b1 ? `
        <div style="
          position: absolute;
          top: 35px;
          left: 410px;
          width: 250px;
          height: 250px;
          border-radius: 50%;
          border: 7px solid #ffe500;
          background: url('${b1}') center/cover no-repeat;
          box-shadow: 0 16px 36px rgba(0,0,0,0.6);
          z-index: 15;
        "></div>` : ''}

        ${b2 ? `
        <div style="
          position: absolute;
          top: 75px;
          left: 650px;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          border: 7px solid #ffe500;
          background: url('${b2}') center/cover no-repeat;
          box-shadow: 0 16px 36px rgba(0,0,0,0.6);
          z-index: 16;
        "></div>` : ''}

        ${b3 ? `
        <div style="
          position: absolute;
          top: 250px;
          left: 740px;
          width: 270px;
          height: 270px;
          border-radius: 50%;
          border: 7px solid #ffe500;
          background: url('${b3}') center/cover no-repeat;
          box-shadow: 0 16px 36px rgba(0,0,0,0.6);
          z-index: 17;
        "></div>` : ''}
      ` : `
        <!-- STYLE B: 2 Cutouts (Left & Right) + 3 Badges Across Top -->
        ${b1 ? `
        <div style="
          position: absolute;
          top: 20px;
          left: 15px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          border: 7px solid #ffe500;
          background: url('${b1}') center/cover no-repeat;
          box-shadow: 0 16px 36px rgba(0,0,0,0.6);
          z-index: 15;
        "></div>` : ''}

        ${b2 ? `
        <div style="
          position: absolute;
          top: 90px;
          left: 360px;
          width: 290px;
          height: 290px;
          border-radius: 50%;
          border: 7px solid #ffe500;
          background: url('${b2}') center/cover no-repeat;
          box-shadow: 0 16px 36px rgba(0,0,0,0.6);
          z-index: 16;
        "></div>` : ''}

        ${b3 ? `
        <div style="
          position: absolute;
          top: 20px;
          right: 15px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          border: 7px solid #ffe500;
          background: url('${b3}') center/cover no-repeat;
          box-shadow: 0 16px 36px rgba(0,0,0,0.6);
          z-index: 15;
        "></div>` : ''}

        <!-- Dual Cutouts -->
        ${cutoutImagePath ? `
        <div style="
          position: absolute;
          bottom: 430px;
          left: -10px;
          width: 530px;
          height: 600px;
          z-index: 20;
          display: flex;
          align-items: flex-end;
          pointer-events: none;
        ">
          <img src="${cutoutImagePath}" style="
            max-height: 100%;
            max-width: 100%;
            object-fit: contain;
            filter: drop-shadow(-8px 18px 30px rgba(0,0,0,0.7));
          " />
        </div>` : ''}

        ${cutout2ImagePath ? `
        <div style="
          position: absolute;
          bottom: 430px;
          right: -10px;
          width: 530px;
          height: 600px;
          z-index: 20;
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          pointer-events: none;
        ">
          <img src="${cutout2ImagePath}" style="
            max-height: 100%;
            max-width: 100%;
            object-fit: contain;
            filter: drop-shadow(-8px 18px 30px rgba(0,0,0,0.7));
          " />
        </div>` : ''}
      `}

      <!-- Bottom Headline & Call to Action Block -->
      <div style="
        position: absolute;
        bottom: 95px;
        left: 0;
        width: 1080px;
        height: 420px;
        background-color: #000000;
        z-index: 30;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        padding: 0 45px;
      ">
        <h1 style="
          font-size: 64px;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -1.2px;
          text-transform: uppercase;
        ">
          WHAT <span class="daily-yellow">HAPPENED</span>
        </h1>
        <h2 style="
          font-size: 60px;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -1px;
          text-transform: uppercase;
          margin-top: 6px;
        ">
          <span class="daily-yellow">IN INDIA</span> - LAST 24 HOURS
        </h2>
        <h3 style="
          font-size: 52px;
          font-weight: 800;
          line-height: 1.2;
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        ">
          <span>IN 60 SECONDS</span>
          <span>🇮🇳</span>
          <span>💭</span>
        </h3>

        <!-- Swipe & Highlight Navigation Indicator -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-top: 24px;
          padding: 0 10px;
        ">
          <!-- Left Swipe Pill -->
          <div style="
            background: #ffffff;
            color: #000000;
            border-radius: 50px;
            padding: 8px 22px;
            font-size: 22px;
            font-weight: 900;
            display: flex;
            align-items: center;
            gap: 10px;
          ">
            <span>&lt;</span>
            <span>SWIPE</span>
            <span style="font-size: 18px;">☰</span>
          </div>

          <!-- Right Action Note -->
          <div style="
            color: #ffe500;
            font-size: 24px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span>( NEWS YOU CAN'T MISS</span>
            <span style="font-size: 28px;">👉</span>
            <span>)</span>
          </div>
        </div>
      </div>

      ${footerHTML}
    </body></html>`;
  }

  // --- SECONDARY NEWS SLIDES (SLIDES 2 TO N-1) ---
  // Ensure highlighted text renders in vibrant yellow
  let processedText = text;
  if (!processedText.includes('class="daily-yellow"') && !processedText.includes("class='daily-yellow'")) {
    processedText = processedText.replace(/<span class=['"]highlight['"]>(.*?)<\/span>/gi, '<span class="daily-yellow">$1</span>');
  }
  // Convert plain newlines to <br/> tags if no HTML formatting exists
  if (!processedText.includes('<br>') && !processedText.includes('<br/>') && !processedText.includes('<p>')) {
    processedText = processedText.replace(/\n/g, '<br/>');
  }

  return `
  <!DOCTYPE html><html><head>${headStyles}</head>
  <body>
    <!-- Full-Bleed Background Visual Scene -->
    <div style="
      position: absolute;
      inset: 0;
      width: 1080px;
      height: 1350px;
      background: url('${bgImagePath}') center/cover no-repeat;
      z-index: 1;
    ">
      <!-- Gentle bottom darkening gradient starting lower down around ~52% -->
      <div style="
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 0) 50%,
          rgba(0, 0, 0, 0.22) 60%,
          rgba(0, 0, 0, 0.62) 70%,
          rgba(0, 0, 0, 0.90) 80%,
          #000000 89%,
          #000000 100%
        );
      "></div>
    </div>

    <!-- News Headline Text positioned over the darkened area -->
    <div style="
      position: absolute;
      bottom: 175px;
      left: 0;
      width: 1080px;
      z-index: 20;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 0 75px;
      box-sizing: border-box;
    ">
      <div style="
        font-size: 56px;
        font-weight: 800;
        line-height: 1.36;
        color: #ffffff;
        letter-spacing: -0.6px;
        text-shadow: 0 3px 12px rgba(0, 0, 0, 0.95), 0 1px 4px rgba(0, 0, 0, 0.9);
      ">
        ${processedText}
      </div>
    </div>

    ${footerHTML}
  </body></html>`;
}

module.exports = { buildDailyNewsSlideHTML };
