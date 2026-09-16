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

/**
* Renders one slide of data into a PNG file.
* @param {object} data - see slideTemplate.js for shape
* @param {string} outputPath - where to save the PNG, e.g. "./output/slide1.png"
*/
async function renderSlide(data, outputPath) {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"], // needed on GitHub Actions runners
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1440 });

  // Convert any local file paths to base64 data URIs
  const preparedData = {
    ...data,
    bgImagePath: toDataUri(data.bgImagePath),
    cutoutImagePath: toDataUri(data.cutoutImagePath),
    circleImagePath: toDataUri(data.circleImagePath),
  };

  const html = buildSlideHTML(preparedData);
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.screenshot({ path: outputPath });
  await browser.close();
  console.log(`Rendered: ${outputPath}`);
}

/**
* Renders a full carousel (multiple slides) from an array of slide data.
*/
async function renderCarousel(slidesData, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const paths = [];
  for (let i = 0; i < slidesData.length; i++) {
    const outPath = path.join(outputDir, `slide-${i + 1}.png`);
    await renderSlide(slidesData[i], outPath);
    paths.push(outPath);
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
