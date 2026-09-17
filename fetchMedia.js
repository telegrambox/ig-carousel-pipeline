const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Track used URLs in memory to guarantee distinct images across a carousel
const usedImageUrls = new Set();

function resetUsedMedia() {
  usedImageUrls.clear();
}

/**
 * Fetch a person's portrait from Wikipedia
 */
async function fetchWikipediaImage(personName, savePath) {
  if (!personName) return null;
  try {
    console.log(`Searching Wikipedia for portrait of '${personName}'...`);
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(personName)}&gsrlimit=1&prop=pageimages&pithumbsize=1200&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': '1affairs-pipeline/2.0 (contact@1affairs.com)' }
    });
    const data = await res.json();
    if (!data.query || !data.query.pages) {
      console.log(`No Wikipedia page found for ${personName}`);
      return null;
    }
    
    const pages = Object.values(data.query.pages);
    const imageUrl = pages[0]?.thumbnail?.source;
    if (!imageUrl) {
      console.log(`No thumbnail image on Wikipedia for ${personName}`);
      return null;
    }

    console.log(`Found Wikipedia image URL: ${imageUrl}`);
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': '1affairs-pipeline/2.0 (contact@1affairs.com)' }
    });
    const buffer = await imgRes.buffer();
    fs.writeFileSync(savePath, buffer);
    console.log(`Saved person image to ${savePath}`);
    return savePath;
  } catch (err) {
    console.error(`Error fetching Wikipedia image for ${personName}:`, err.message);
    return null;
  }
}

/**
 * Download a genuine, authentic photo from Wikimedia Commons
 * Avoids any previously used URL.
 */
async function fetchWikimediaImage(keyword, savePath) {
  try {
    console.log(`Searching Wikimedia Commons for authentic photo of '${keyword}'...`);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(keyword)}&gsrlimit=10&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': '1affairs-media-pipeline/2.0 (contact@1affairs.com)' }
    });
    const data = await res.json();
    if (data.query && data.query.pages) {
      const pages = Object.values(data.query.pages);
      for (const page of pages) {
        const imgUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;
        const lower = (imgUrl || "").toLowerCase();
        const title = (page?.title || "").toLowerCase();
        
        const isBadFormat =
          !imgUrl ||
          usedImageUrls.has(imgUrl) ||
          lower.endsWith('.svg') ||
          lower.endsWith('.tif') ||
          lower.endsWith('.djvu') ||
          lower.endsWith('.gif') ||
          lower.includes('.pdf') ||
          lower.includes('page1-') ||
          lower.includes('catalog') ||
          lower.includes('seed_store') ||
          lower.includes('wholesale') ||
          lower.includes('bulletin') ||
          lower.includes('ia_') ||
          title.includes('pdf') ||
          title.includes('bulletin') ||
          title.includes('catalog') ||
          title.includes('store');

        if (!isBadFormat) {
          console.log(`Found genuine authentic photo on Wikimedia: ${imgUrl}`);
          usedImageUrls.add(imgUrl);
          const imgRes = await fetch(imgUrl, {
            headers: { 'User-Agent': '1affairs-media-pipeline/2.0 (contact@1affairs.com)' }
          });
          const buffer = await imgRes.buffer();
          fs.writeFileSync(savePath, buffer);
          console.log(`Saved authentic image to ${savePath}`);
          return savePath;
        }
      }
    }
  } catch (err) {
    console.warn(`Wikimedia search for '${keyword}' failed:`, err.message);
  }
  return null;
}

/**
 * Download a generic topic photo (tries Wikimedia first, falls back to LoremFlickr with lock to ensure uniqueness)
 */
async function fetchTopicImage(keyword, savePath, seed = 1) {
  const wikiResult = await fetchWikimediaImage(keyword, savePath);
  if (wikiResult) return wikiResult;

  try {
    // Take the 2 most impactful words for broader photo library matching
    const words = keyword.trim().split(/\s+/).filter(w => w.length > 2);
    const cleanKeyword = encodeURIComponent(words.slice(0, 2).join(',') || "business,news");
    const lockSeed = Math.floor(Math.random() * 1000) + (seed * 41);
    const url = `https://loremflickr.com/1080/1080/${cleanKeyword}?lock=${lockSeed}`;
    console.log(`Fetching photo for '${keyword}' with tags '${cleanKeyword}' (lock ${lockSeed})...`);
    const res = await fetch(url, {
      headers: { 'User-Agent': '1affairs-media-pipeline/2.0' }
    });
    const buffer = await res.buffer();
    fs.writeFileSync(savePath, buffer);
    console.log(`Saved topic image to ${savePath}`);
    return savePath;
  } catch (err) {
    console.error(`Error fetching topic image for ${keyword}:`, err.message);
    return null;
  }
}

/**
 * Run python remove_bg.py to produce transparent PNG
 */
function removeBackground(inputPath, outputPath) {
  try {
    console.log(`Removing background using rembg on ${inputPath}...`);
    const scriptPath = path.join(__dirname, "remove_bg.py");
    execSync(`python "${scriptPath}" "${inputPath}" "${outputPath}"`, { stdio: "inherit" });
    if (fs.existsSync(outputPath)) {
      console.log(`Generated transparent cutout at ${outputPath}`);
      return outputPath;
    }
  } catch (err) {
    console.warn(`Background removal skipped/failed:`, err.message);
  }
  return null;
}

module.exports = {
  fetchWikipediaImage,
  fetchTopicImage,
  fetchWikimediaImage,
  removeBackground,
  resetUsedMedia
};
