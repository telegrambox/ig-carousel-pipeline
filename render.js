const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const { buildSlideHTML } = require("./templates/slideTemplate");

function toDataUri(filePathOrUrl) {
  if (!filePathOrUrl) return "";
  if (filePathOrUrl.startsWith("data:") || filePathOrUrl.startsWith("http://") || filePathOrUrl.startsWith("https://")) {
    return filePathOrUrl;
  }
  let localPath = filePathOrUrl.replace(/^file:\/\/\/?/, '');
  if (process.platform === "win32") {
    // Clean up file:///C:/... on Windows
    localPath = localPath.replace(/^\/([a-zA-Z]:)/, '$1');
  }
  try {
    if (fs.existsSync(localPath)) {
      const ext = path.extname(localPath).toLowerCase().replace('.', '') || 'png';
      const mime = (ext === 'jpg' || ext === 'jpeg') ? 'jpeg' : 'png';
      const b64 = fs.readFileSync(localPath).toString('base64');
      return `data:image/${mime};base64,${b64}`;
    }
  } catch (e) {
    console.error("toDataUri error:", e.message);
  }
  return filePathOrUrl;
}

function findChromeExecutable() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const winPath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  if (process.platform === 'win32' && fs.existsSync(winPath)) {
    return winPath;
  }
  
  try {
    const defaultPath = puppeteer.executablePath();
    if (defaultPath && fs.existsSync(defaultPath)) {
      return defaultPath;
    }
  } catch (e) {}

  const localCache = path.join(__dirname, '.cache', 'puppeteer');
  if (fs.existsSync(localCache)) {
    function walk(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          results = results.concat(walk(full));
        } else {
          results.push(full);
        }
      }
      return results;
    }
    const allFiles = walk(localCache);
    const chrome = allFiles.find(f => 
      f.endsWith('/chrome') || 
      f.endsWith('\\chrome') || 
      f.endsWith('chrome.exe') || 
      f.endsWith('/chromium') || 
      f.endsWith('\\chromium')
    );
    if (chrome) return chrome;
  }
  return undefined;
}

/**
* Renders one slide of data into a PNG file.
* @param {object} data - see slideTemplate.js for shape
* @param {string} outputPath - where to save the PNG, e.g. "./output/slide1.png"
*/
async function renderSlideWithBrowser(browser, data, outputPath) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1080, height: 1440, deviceScaleFactor: 1 });

    const preparedData = {
      ...data,
      bgImagePath: toDataUri(data.bgImagePath),
      cutoutImagePath: toDataUri(data.cutoutImagePath),
      circleImagePath: toDataUri(data.circleImagePath),
    };

    const html = buildSlideHTML(preparedData);
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.screenshot({ path: outputPath, type: "png" });
    console.log(`Rendered: ${outputPath}`);
  } finally {
    await page.close();
  }
}

async function renderSlide(data, outputPath) {
  const puppeteerOpts = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process"
    ],
  };

  const detectedExec = findChromeExecutable();
  if (detectedExec) {
    puppeteerOpts.executablePath = detectedExec;
  }

  const browser = await puppeteer.launch(puppeteerOpts);
  try {
    await renderSlideWithBrowser(browser, data, outputPath);
  } finally {
    await browser.close();
  }
}

/**
* Renders a full carousel (multiple slides) from an array of slide data.
*/
async function renderCarousel(slidesData, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const puppeteerOpts = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process"
    ],
  };

  const detectedExec = findChromeExecutable();
  if (detectedExec) {
    puppeteerOpts.executablePath = detectedExec;
  }

  const browser = await puppeteer.launch(puppeteerOpts);
  const paths = [];

  try {
    const total = slidesData.length;
    for (let i = 0; i < total; i++) {
      const outPath = path.join(outputDir, `slide-${i + 1}.png`);
      const slideItem = {
        ...slidesData[i],
        slideIndex: slidesData[i].slideIndex || (i + 1),
        totalSlides: slidesData[i].totalSlides || total,
      };
      await renderSlideWithBrowser(browser, slideItem, outPath);
      paths.push(outPath);
    }
  } finally {
    await browser.close();
  }

  return paths;
}

// --- Example usage / test run ---
if (require.main === module) {
  const exampleData = [
    {
      hook: "India has 6.3 Crore graduates aged 20-29.",
      highlight: "graduates make up 67% of Unemployed Youth.",
      subtext: "2 out of every 3 unemployed youth are graduates.",
      bgImagePath: "https://loremflickr.com/1080/1080/business",
      cta: "SWIPE",
    },
    {
      hook: "This points to a massive skills gap.",
      highlight: "Only 1 in 10 are employable.",
      subtext: "Companies struggle to find talent.",
      bgImagePath: "https://loremflickr.com/1080/1080/business",
      cta: "READ CAPTION",
    }
  ];
  
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  renderCarousel(exampleData, outputDir)
    .then(() => console.log("Done."))
    .catch((err) => console.error(err));
}

module.exports = { renderSlide, renderCarousel };
