const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Set to ensure no two slides ever use the exact same image
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

        console.log(`Found Wikipedia portrait URL: ${imageUrl}`);
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
 * Search Wikipedia for an article matching the topic and return its authentic lead photo
 */
async function fetchWikipediaArticlePhoto(keyword, savePath) {
    try {
        console.log(`Searching Wikipedia articles for authentic photo of '${keyword}'...`);
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyword)}&srlimit=5&format=json`;
        const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': '1affairs-pipeline/2.0 (contact@1affairs.com)' }
        });
        const searchData = await searchRes.json();
        
        if (searchData.query && searchData.query.search) {
            for (const item of searchData.query.search) {
                const title = item.title;
                const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=1200&format=json`;
                const pageRes = await fetch(pageUrl, {
                    headers: { 'User-Agent': '1affairs-pipeline/2.0 (contact@1affairs.com)' }
                });
                const pageData = await pageRes.json();
                const pages = Object.values(pageData.query?.pages || {});
                const thumb = pages[0]?.thumbnail?.source;
                const lower = (thumb || "").toLowerCase();
                const titleLower = (title || "").toLowerCase();
                
                if (
                    thumb &&
                    !usedImageUrls.has(thumb) &&
                    !lower.includes('.svg') &&
                    !lower.includes('logo') &&
                    !lower.includes('map') &&
                    !titleLower.includes('logo')
                ) {
                    console.log(`Found authentic Wikipedia article photo from '${title}': ${thumb}`);
                    usedImageUrls.add(thumb);
                    const imgRes = await fetch(thumb, {
                        headers: { 'User-Agent': '1affairs-pipeline/2.0 (contact@1affairs.com)' }
                    });
                    const buffer = await imgRes.buffer();
                    fs.writeFileSync(savePath, buffer);
                    console.log(`Saved Wikipedia article photo to ${savePath}`);
                    return savePath;
                }
            }
        }
    } catch (err) {
        console.warn(`Wikipedia article search for '${keyword}' failed:`, err.message);
    }
    return null;
}

/**
 * Search Wikimedia Commons with strict filtering against documents, book scans, and diagrams
 */
async function fetchWikimediaImage(keyword, savePath) {
    try {
        console.log(`Searching Wikimedia Commons for authentic photo of '${keyword}'...`);
        const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(keyword)}&gsrlimit=15&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json`;
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

                const isBad =
                    !imgUrl ||
                    usedImageUrls.has(imgUrl) ||
                    lower.endsWith('.svg') ||
                    lower.endsWith('.tif') ||
                    lower.endsWith('.djvu') ||
                    lower.endsWith('.gif') ||
                    lower.includes('.pdf') ||
                    lower.includes('page1-') ||
                    lower.includes('catalog') ||
                    lower.includes('document') ||
                    lower.includes('bulletin') ||
                    lower.includes('ia_') ||
                    title.includes('pdf') ||
                    title.includes('bulletin') ||
                    title.includes('catalog') ||
                    title.includes('document');

                if (!isBad) {
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
 * Intelligent Multi-Tier Topic Image Fetcher for REAL photos:
 * 1. Supports direct web image URLs (http:// or https://)
 * 2. Supports direct base64 data URIs (data:image/...)
 * 3. Supports local file paths
 * 4. Tries Wikipedia Topic Article lead photo (authentic real-world photo of the topic/event)
 * 5. Tries filtered Wikimedia Commons
 * 6. Falls back to curated photography with unique seed/lock
 */
async function fetchTopicImage(entityKeyword, savePath, seed = 1) {
    if (!entityKeyword) return null;
    const cleanEntity = String(entityKeyword).trim();

    // 1. Direct web image URL
    if (cleanEntity.startsWith("http://") || cleanEntity.startsWith("https://")) {
        try {
            console.log(`Fetching direct image URL: ${cleanEntity}`);
            const res = await fetch(cleanEntity, {
                headers: { 'User-Agent': '1affairs-media-pipeline/2.0' }
            });
            if (res.ok) {
                const buffer = await res.buffer();
                fs.writeFileSync(savePath, buffer);
                console.log(`Saved direct URL image to ${savePath}`);
                return savePath;
            }
        } catch (err) {
            console.warn(`Failed to download direct image URL '${cleanEntity}':`, err.message);
        }
    }

    // 2. Direct data URI (base64)
    if (cleanEntity.startsWith("data:image/")) {
        try {
            const base64Data = cleanEntity.replace(/^data:image\/\w+;base64,/, "");
            fs.writeFileSync(savePath, Buffer.from(base64Data, 'base64'));
            console.log(`Saved base64 data image to ${savePath}`);
            return savePath;
        } catch (err) {
            console.warn("Failed to write data URI to file:", err.message);
        }
    }

    // 3. Direct local file path
    if (cleanEntity.startsWith("file:///")) {
        try {
            let localPath = cleanEntity.replace(/^file:\/\/\/?/, '');
            if (process.platform === "win32") {
                localPath = localPath.replace(/^\/([a-zA-Z]:)/, '$1');
            }
            if (fs.existsSync(localPath)) {
                fs.copyFileSync(localPath, savePath);
                console.log(`Copied local image file to ${savePath}`);
                return savePath;
            }
        } catch (err) {
            console.warn("Failed to copy local file:", err.message);
        }
    }

    // 4. Wikipedia / Wikimedia keyword search
    const cleaned = cleanEntity.replace(/^(the|a|an)\s+/i, '').trim();

    const wikiArticlePhoto = await fetchWikipediaArticlePhoto(cleaned, savePath);
    if (wikiArticlePhoto) return wikiArticlePhoto;

    const wikiCommonsPhoto = await fetchWikimediaImage(cleaned, savePath);
    if (wikiCommonsPhoto) return wikiCommonsPhoto;

    // 5. Fall back to curated photo engine with unique lock
    try {
        const words = cleaned.trim().split(/\s+/).filter(w => w.length > 2);
        const searchTag = encodeURIComponent(words.slice(0, 2).join(',') || "business,news");
        const lockSeed = Math.floor(Math.random() * 1000) + (seed * 43);
        const url = `https://loremflickr.com/1080/1080/${searchTag}?lock=${lockSeed}`;
        console.log(`Fallback: Fetching curated photo with tags '${searchTag}' (lock ${lockSeed})...`);
        const res = await fetch(url, {
            headers: { 'User-Agent': '1affairs-media-pipeline/2.0' }
        });
        const buffer = await res.buffer();
        fs.writeFileSync(savePath, buffer);
        console.log(`Saved curated topic image to ${savePath}`);
        return savePath;
    } catch (err) {
        console.error(`Error fetching topic image for ${cleaned}:`, err.message);
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
        console.warn(`Background removal failed or rembg not ready. Fallback without cutout:`, err.message);
    }
    return null;
}

module.exports = {
    fetchWikipediaImage,
    fetchTopicImage,
    fetchWikimediaImage,
    fetchWikipediaArticlePhoto,
    removeBackground,
    resetUsedMedia
};
