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
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyword)}&srlimit=3&format=json`;
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
        const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(keyword)}&gsrlimit=12&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json`;
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
 * Intelligent Topic Image Fetcher:
 * Tries Pollinations AI (Flux) for highly relevant contextual imagery.
 * Falls back to LoremFlickr on failure.
 */
async function fetchTopicImage(promptText, savePath, seed = 1) {
    try {
        console.log(`Generating AI photo for prompt: '${promptText}'...`);
        // Enhance the prompt for photorealism and contextual relevance
        const enhancedPrompt = `${promptText}, photorealistic, high quality editorial photography, sharp focus`;
        // We use a unique seed for each slide so they don't look identical
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1080&height=1080&model=flux&nologo=true&seed=${Math.floor(Math.random() * 1000000) + seed}`;
        
        const res = await fetch(url, {
            headers: { 'User-Agent': '1affairs-media-pipeline/2.0' }
        });
        
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const buffer = await res.buffer();
        fs.writeFileSync(savePath, buffer);
        console.log(`Saved AI image to ${savePath}`);
        return savePath;
    } catch (err) {
        console.error(`Pollinations AI generation failed for '${promptText}':`, err.message);
        
        // Fall back to curated photo engine with unique lock
        try {
            const words = promptText.trim().split(/\s+/).filter(w => w.length > 2);
            const cleanKeyword = encodeURIComponent(words.slice(0, 2).join(',') || "business,news");
            const lockSeed = Math.floor(Math.random() * 1000) + (seed * 43);
            const url = `https://loremflickr.com/1080/1080/${cleanKeyword}?lock=${lockSeed}`;
            console.log(`Fallback: Fetching curated photo with tags '${cleanKeyword}' (lock ${lockSeed})...`);
            const res = await fetch(url, {
                headers: { 'User-Agent': '1affairs-media-pipeline/2.0' }
            });
            const buffer = await res.buffer();
            fs.writeFileSync(savePath, buffer);
            console.log(`Saved fallback curated topic image to ${savePath}`);
            return savePath;
        } catch (fallbackErr) {
            console.error(`Fallback fetching also failed:`, fallbackErr.message);
            return null;
        }
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
