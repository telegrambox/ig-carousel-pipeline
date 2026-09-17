const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Fetch a person's portrait from Wikipedia
 */
async function fetchWikipediaImage(personName, savePath) {
    if (!personName) return null;
    try {
        console.log(`Searching Wikipedia for portrait of '${personName}'...`);
        const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(personName)}&gsrlimit=1&prop=pageimages&pithumbsize=1200&format=json`;
        const res = await fetch(url, {
            headers: { 'User-Agent': '1affairs-pipeline/1.0 (contact@1affairs.com)' }
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
            headers: { 'User-Agent': '1affairs-pipeline/1.0 (contact@1affairs.com)' }
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
 * Download a genuine, authentic photo from Wikimedia Commons (real news/topic photography)
 */
async function fetchWikimediaImage(keyword, savePath) {
    try {
        console.log(`Searching Wikimedia Commons for authentic photo of '${keyword}'...`);
        const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(keyword)}&gsrlimit=5&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json`;
        const res = await fetch(url, {
            headers: { 'User-Agent': '1affairs-media-pipeline/1.0 (contact@1affairs.com)' }
        });
        const data = await res.json();
        if (data.query && data.query.pages) {
            const pages = Object.values(data.query.pages);
            for (const page of pages) {
                const imgUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;
                if (imgUrl && !imgUrl.toLowerCase().endsWith('.svg') && !imgUrl.toLowerCase().endsWith('.tif') && !imgUrl.toLowerCase().endsWith('.djvu')) {
                    console.log(`Found authentic photo on Wikimedia: ${imgUrl}`);
                    const imgRes = await fetch(imgUrl, {
                        headers: { 'User-Agent': '1affairs-media-pipeline/1.0 (contact@1affairs.com)' }
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
 * Download a generic topic photo (tries Wikimedia first, falls back to LoremFlickr)
 */
async function fetchTopicImage(keyword, savePath) {
    const wikiResult = await fetchWikimediaImage(keyword, savePath);
    if (wikiResult) return wikiResult;

    try {
        const cleanKeyword = encodeURIComponent(keyword.trim().replace(/\s+/g, ','));
        const url = `https://loremflickr.com/1080/1080/${cleanKeyword}`;
        console.log(`Falling back to LoremFlickr for '${keyword}'...`);
        const res = await fetch(url);
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
        console.warn(`Background removal failed or rembg not ready. Fallback without cutout:`, err.message);
    }
    return null;
}

module.exports = {
    fetchWikipediaImage,
    fetchTopicImage,
    removeBackground
};
