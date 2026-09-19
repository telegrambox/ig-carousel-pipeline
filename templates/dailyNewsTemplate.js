/**
 * Daily News Carousel Template
 * Style inspired by high-engagement 24h India news roundups.
 * Canvas: 1080 x 1350 (standard 4:5 portrait)
 */

function formatBrandWatermark(channelName = "1affairs") {
  const clean = String(channelName || "1affairs").trim().toUpperCase();
  return `
    <div style="
      position: absolute;
      top: 30px;
      right: 35px;
      z-index: 50;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-shadow: 0 3px 8px rgba(0,0,0,0.85);
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg style="width: 28px; height: 28px; fill: #ffe500; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.9));" viewBox="0 0 24 24">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <span style="color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: 1.5px; font-family: 'Plus Jakarta Sans', sans-serif;">
          ${clean}
        </span>
      </div>
      <span style="color: #ffe500; font-size: 11px; font-weight: 800; letter-spacing: 3px; font-family: 'Plus Jakarta Sans', sans-serif; margin-top: -2px;">
        MEDIA
      </span>
    </div>
  `;
}

function formatSocialFooter(channelName = "1affairs") {
  const cleanHandle = String(channelName || "1affairs").trim().toUpperCase();
  return `
    <div style="
      position: absolute;
      bottom: 0;
      left: 0;
      width: 1080px;
      height: 52px;
      background-color: #ffe500;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 45px;
      z-index: 50;
      box-sizing: border-box;
    ">
      <!-- Social Media Icons -->
      <div style="display: flex; align-items: center; gap: 14px;">
        <!-- Facebook -->
        <div style="width: 28px; height: 28px; border-radius: 4px; background: #1877f2; display: flex; align-items: center; justify-content: center;">
          <svg style="width: 16px; height: 16px; fill: #ffffff;" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
        </div>
        <!-- Instagram -->
        <div style="width: 28px; height: 28px; border-radius: 4px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); display: flex; align-items: center; justify-content: center;">
          <svg style="width: 16px; height: 16px; fill: #ffffff;" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        </div>
        <!-- X / Twitter -->
        <div style="width: 28px; height: 28px; border-radius: 4px; background: #000000; display: flex; align-items: center; justify-content: center;">
          <svg style="width: 14px; height: 14px; fill: #ffffff;" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </div>
        <!-- YouTube -->
        <div style="width: 28px; height: 28px; border-radius: 4px; background: #ff0000; display: flex; align-items: center; justify-content: center;">
          <svg style="width: 16px; height: 16px; fill: #ffffff;" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        </div>
      </div>

      <!-- Handle / Website -->
      <div style="
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 20px;
        font-weight: 900;
        color: #000000;
        letter-spacing: 2.5px;
      ">
        / ${cleanHandle.split('').join(' ')} . I N
      </div>
    </div>
  `;
}

function buildDailyNewsSlideHTML(data) {
  const {
    isCover = false,
    isCta = false,
    coverStyle = "styleA", // 'styleA' (Single hero cutout + 3 badges) or 'styleB' (Dual hero cutouts + 3 badges)
    channelName = "1affairs",
    text = "",
    highlightWord = "",
    bgImagePath = "",
    cutoutImagePath = "",
    cutout2ImagePath = "",
    badgeImages = [], // Array of up to 3 image paths
    ctaImagePath = "",
  } = data;

  const watermarkHTML = formatBrandWatermark(channelName);
  const footerHTML = formatSocialFooter(channelName);

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
      ${watermarkHTML}
      <div style="
        width: 1080px;
        height: 1298px;
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
      ${watermarkHTML}

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
        bottom: 52px;
        left: 0;
        width: 1080px;
        height: 440px;
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

  return `
  <!DOCTYPE html><html><head>${headStyles}</head>
  <body>
    ${watermarkHTML}

    <!-- Top Visual Scene (62% height with smooth bottom fade) -->
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 1080px;
      height: 860px;
      background: url('${bgImagePath}') center/cover no-repeat;
      z-index: 1;
    ">
      <!-- Gradient Fade into Solid Black -->
      <div style="
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 50%, #000000 88%, #000000 100%);
      "></div>
    </div>

    <!-- Bottom News Headline Card (Solid Black) -->
    <div style="
      position: absolute;
      bottom: 52px;
      left: 0;
      width: 1080px;
      height: 440px;
      background-color: #000000;
      z-index: 10;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 0 60px;
      box-sizing: border-box;
    ">
      <div style="
        font-size: 54px;
        font-weight: 800;
        line-height: 1.34;
        color: #ffffff;
        letter-spacing: -0.8px;
      ">
        ${processedText}
      </div>
    </div>

    ${footerHTML}
  </body></html>`;
}

module.exports = { buildDailyNewsSlideHTML };
