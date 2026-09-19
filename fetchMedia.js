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
 * Fetch a person's portrait from Wikipedia (or direct URL/file)
 */
async function fetchWikipediaImage(personName, savePath) {
    if (!personName) return null;
    let cleanName = String(personName).trim().replace(/^["']|["']$/g, '').trim();

    // 1. Direct Web URL (handles surrounding spaces, quotes, or markdown)
    const urlMatch = cleanName.match(/https?:\/\/[^\s"'>]+/i);
    if (urlMatch) {
        const rawUrl = urlMatch[0];
        try {
            const fetchUrl = encodeURI(decodeURI(rawUrl));
            console.log(`Downloading direct person portrait URL: ${fetchUrl}`);
            const res = await fetch(fetchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    'Accept': 'image/*,*/*'
                },
                timeout: 6000
            });
            if (res.ok) {
                const buffer = await res.buffer();
                fs.writeFileSync(savePath, buffer);
                return savePath;
            }
        } catch (e) {
            console.warn("Direct person image download failed:", e.message);
        }
    }

    // 2. Direct Base64 Data URI
    if (cleanName.startsWith("data:image/")) {
        try {
            const base64Data = cleanName.replace(/^data:image\/\w+;base64,/, "");
            fs.writeFileSync(savePath, Buffer.from(base64Data, 'base64'));
            return savePath;
        } catch (e) {
            console.warn("Writing person data URI failed:", e.message);
        }
    }

    // 3. Direct Local File Path
    if (cleanName.startsWith("file:///") || fs.existsSync(cleanName)) {
        try {
            let localPath = cleanName.startsWith("file:///") ? cleanName.replace(/^file:\/\/\/?/, '') : cleanName;
            if (process.platform === "win32" && cleanName.startsWith("file:///")) {
                localPath = localPath.replace(/^\/([a-zA-Z]:)/, '$1');
            }
            if (fs.existsSync(localPath)) {
                fs.copyFileSync(localPath, savePath);
                return savePath;
            }
        } catch (e) {
            console.warn("Copying person local file failed:", e.message);
        }
    }

    // 4. Multi-result Wikipedia search with best-match token scoring
    try {
        console.log(`Searching Wikipedia for portrait of '${cleanName}'...`);
        const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanName)}&gsrlimit=5&prop=pageimages&pithumbsize=1200&format=json`;
        const res = await fetch(url, {
            headers: { 'User-Agent': '1affairs-pipeline/2.0 (contact@1affairs.com)' }
        });
        const data = await res.json();
        if (data.query && data.query.pages) {
            const pages = Object.values(data.query.pages);
            const queryTokens = cleanName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            
            let bestPage = null;
            let bestScore = -1;

            for (const page of pages) {
                if (!page.thumbnail?.source) continue;
                const titleLower = (page.title || "").toLowerCase();
                const score = queryTokens.filter(t => titleLower.includes(t)).length;
                if (score > bestScore) {
                    bestScore = score;
                    bestPage = page;
                }
            }

            if (!bestPage && pages[0]?.thumbnail?.source) {
                bestPage = pages[0];
            }

            if (bestPage && bestPage.thumbnail?.source) {
                const imageUrl = bestPage.thumbnail.source;
                console.log(`Found Wikipedia portrait from '${bestPage.title}': ${imageUrl}`);
                const imgRes = await fetch(imageUrl, {
                    headers: { 'User-Agent': '1affairs-pipeline/2.0 (contact@1affairs.com)' }
                });
                const buffer = await imgRes.buffer();
                fs.writeFileSync(savePath, buffer);
                console.log(`Saved person image to ${savePath}`);
                return savePath;
            }
        }
    } catch (err) {
        console.error(`Error fetching Wikipedia image for ${cleanName}:`, err.message);
    }
    return null;
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
/**
 * Helper to download a direct image URL (or extract og:image if HTML page) with 6s timeout
 */
async function downloadDirectImageUrl(rawUrl, savePath) {
    try {
        const fetchUrl = encodeURI(decodeURI(rawUrl));
        console.log(`Fetching direct image URL (6s limit): ${fetchUrl}`);
        const res = await fetch(fetchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': new URL(fetchUrl).origin + '/'
            },
            timeout: 6000
        });

        if (res.ok) {
            const ctype = (res.headers.get('content-type') || '').toLowerCase();
            // If it's an image
            if (ctype.startsWith('image/')) {
                const buffer = await res.buffer();
                if (buffer && buffer.length > 1000) {
                    fs.writeFileSync(savePath, buffer);
                    console.log(`Saved direct URL image (${buffer.length} bytes) to ${savePath}`);
                    return savePath;
                }
            } else if (ctype.includes('text/html')) {
                // It's a webpage! Try to extract og:image
                console.log(`URL returned HTML, searching for og:image meta tag...`);
                const html = await res.text();
                const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                                html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
                if (ogMatch && ogMatch[1]) {
                    const ogUrl = ogMatch[1].startsWith('//') ? 'https:' + ogMatch[1] : ogMatch[1];
                    console.log(`Found og:image: ${ogUrl}, downloading...`);
                    const ogRes = await fetch(ogUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'image/*,*/*'
                        },
                        timeout: 4000
                    });
                    if (ogRes.ok) {
                        const ogBuf = await ogRes.buffer();
                        if (ogBuf && ogBuf.length > 1000) {
                            fs.writeFileSync(savePath, ogBuf);
                            console.log(`Saved og:image to ${savePath}`);
                            return savePath;
                        }
                    }
                }
            }
        } else {
            console.warn(`Direct image URL responded with HTTP ${res.status}: ${rawUrl}`);
        }
    } catch (err) {
        console.warn(`Direct URL request error for '${rawUrl}': ${err.message}`);
    }
    return null;
}

/**
 * Intelligent Multi-Tier Media Acquisition:
 * 1. Direct Primary URL (if provided)
 * 2. Direct Backup URL (if provided and Primary URL fails)
 * 3. Exact Wikipedia topic photo
 * 4. Curated Wikimedia Commons authentic photo
 * 5. Generic photography fallback
 */
async function fetchTopicImage(entityKeyword, savePath, seed = 1, fallbackKeyword = null, backupUrl = null) {
    if (!entityKeyword && !fallbackKeyword) return null;
    let cleanEntity = String(entityKeyword || fallbackKeyword || '').trim().replace(/^["']|["']$/g, '').trim();

    // Determine clean search query in case direct URLs fail
    let topicQuery = "";
    if (fallbackKeyword && typeof fallbackKeyword === 'string' && fallbackKeyword.trim().length > 0 && !fallbackKeyword.startsWith('http')) {
        topicQuery = String(fallbackKeyword).trim();
    } else if (cleanEntity && !cleanEntity.startsWith('http')) {
        topicQuery = cleanEntity;
    } else {
        // Try extracting readable keywords from URL slug
        try {
            const urlObj = new URL(cleanEntity);
            const slug = urlObj.pathname.split('/').filter(Boolean).pop() || '';
            const cleanedSlug = slug.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\d+/g, '').trim();
            if (cleanedSlug.length > 3) topicQuery = cleanedSlug;
        } catch (e) {}
    }
    if (!topicQuery) topicQuery = "India News";

    // 1. Direct web image URLs (Primary and Optional Backup)
    const entityUrls = cleanEntity.match(/https?:\/\/[^\s"'>,;|]+/gi) || [];
    const primaryUrl = entityUrls[0] || (cleanEntity.startsWith('http') ? cleanEntity : null);
    const secondaryUrl = backupUrl || entityUrls[1] || null;

    if (primaryUrl) {
        console.log(`Attempting Primary URL: ${primaryUrl}`);
        const primarySaved = await downloadDirectImageUrl(primaryUrl, savePath);
        if (primarySaved) {
            return primarySaved;
        }

        console.warn(`Primary URL failed or unavailable: ${primaryUrl}`);

        if (secondaryUrl && secondaryUrl !== primaryUrl) {
            console.log(`Attempting Backup URL: ${secondaryUrl}`);
            const backupSaved = await downloadDirectImageUrl(secondaryUrl, savePath);
            if (backupSaved) {
                console.log(`Backup URL succeeded! Saved to ${savePath}`);
                return backupSaved;
            }
            console.warn(`Backup URL also failed: ${secondaryUrl}`);
        }

        console.log(`Direct image URLs unavailable. Falling back to authentic photo search for '${topicQuery}'...`);
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
    if (cleanEntity.startsWith("file:///") || fs.existsSync(cleanEntity)) {
        try {
            let localPath = cleanEntity.startsWith("file:///") ? cleanEntity.replace(/^file:\/\/\/?/, '') : cleanEntity;
            if (process.platform === "win32" && cleanEntity.startsWith("file:///")) {
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
    const cleaned = topicQuery.replace(/^(the|a|an)\s+/i, '').trim();

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
            headers: { 'User-Agent': '1affairs-media-pipeline/2.0' },
            timeout: 8000
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
