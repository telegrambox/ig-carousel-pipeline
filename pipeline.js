const path = require("path");
const fs = require("fs");
const { getTrendingStats } = require("./source");
const { selectBestStory, markAsUsed } = require("./select");
const { generateCarouselCopy } = require("./generateCopy");
const { renderCarousel } = require("./render");
const { fetchWikipediaImage, fetchTopicImage, removeBackground } = require("./fetchMedia");

async function run(options = {}) {
    const {
        topicMode = 'auto',
        customTopic = '',
        category = 'finance',
        channelName = '1affairs',
        slideCount = 3,
        onProgress = console.log
    } = options;

    let bestStory;

    if (topicMode === 'custom') {
        onProgress(`1. Using custom topic: ${customTopic}`);
        bestStory = { 
            headline: customTopic, 
            description: `A user-provided story about ${customTopic} in the ${category} category.`, 
            url: "custom-url" 
        };
    } else {
        onProgress(`1. Fetching trending ${category} stats...`);
        const articles = await getTrendingStats(category);
        if (!articles || articles.length === 0) {
            onProgress("No articles found. Exiting.");
            return { error: "No articles found." };
        }

        onProgress(`Fetched ${articles.length} articles. Selecting the best one...`);
        bestStory = selectBestStory(articles);
        if (!bestStory) {
            onProgress("No unused stories available. Exiting.");
            return { error: "No unused stories available." };
        }
    }
    
    onProgress(`Selected story: ${bestStory.headline}`);
    onProgress(`2. Generating carousel copy with Claude for channel: ${channelName}...`);
    let copyData;
    try {
        copyData = await generateCarouselCopy(bestStory, channelName, slideCount);
        onProgress("Generated copy successfully.");
    } catch (e) {
        onProgress(`Error generating copy: ${e.message}`);
        return { error: e.message };
    }

    onProgress("3. Preparing assets and rendering carousel images...");
    const outputDir = path.join(__dirname, "output");
    
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    if (copyData.caption) {
        fs.writeFileSync(path.join(outputDir, "caption.txt"), copyData.caption);
    }

    // A. Fetch background scene
    const bgFile = path.join(outputDir, "bg.jpg");
    const bgKeyword = copyData.bgKeyword || "finance boardroom";
    onProgress(`Fetching background image for keyword: ${bgKeyword}...`);
    const bgDownloaded = await fetchTopicImage(bgKeyword, bgFile);
    const bgUrl = bgDownloaded ? `file:///${bgFile.replace(/\\/g, '/')}` : "";

    // B. Fetch secondary circular badge image
    const circleFile = path.join(outputDir, "circle.jpg");
    const circleKeyword = copyData.circleImageKeyword || "stock chart";
    onProgress(`Fetching secondary image for keyword: ${circleKeyword}...`);
    const circleDownloaded = await fetchTopicImage(circleKeyword, circleFile);
    const circleUrl = circleDownloaded ? `file:///${circleFile.replace(/\\/g, '/')}` : "";

    // C. Fetch person portrait & remove background
    let cutoutUrl = "";
    if (copyData.personName && copyData.personName.toLowerCase() !== "none" && copyData.personName.toLowerCase() !== "null") {
        onProgress(`Fetching Wikipedia portrait for: ${copyData.personName}...`);
        const rawPersonPath = path.join(outputDir, "person_raw.jpg");
        const personDownloaded = await fetchWikipediaImage(copyData.personName, rawPersonPath);
        if (personDownloaded) {
            onProgress("Removing background using AI (rembg)...");
            const cutoutPath = path.join(outputDir, "person_cutout.png");
            const cutoutGenerated = removeBackground(personDownloaded, cutoutPath);
            if (cutoutGenerated) {
                cutoutUrl = `file:///${cutoutPath.replace(/\\/g, '/')}`;
            }
        }
    }

    copyData.slides.forEach((slide, idx) => {
        slide.bgImagePath = bgUrl;
        slide.cutoutImagePath = cutoutUrl;
        slide.circleImagePath = idx === 0 ? circleUrl : "";
    });

    onProgress("Rendering slides with Puppeteer...");
    const slidePaths = await renderCarousel(copyData.slides, outputDir);
    onProgress(`Rendered ${slidePaths.length} slides.`);

    if (topicMode !== 'custom') {
        onProgress("4. Marking story as used...");
        markAsUsed(bestStory.url);
    }

    onProgress("Pipeline completed successfully!");
    
    // Return the generated data to the caller (e.g. Express API)
    return {
        slides: slidePaths.map(p => path.basename(p)),
        caption: copyData.caption
    };
}

if (require.main === module) {
    run().then(res => console.log(res)).catch(console.error);
}

module.exports = { run };
