const path = require("path");
const fs = require("fs");
const { getTrendingStats } = require("./source");
const { selectBestStory, markAsUsed } = require("./select");
const { generateCarouselCopy } = require("./generateCopy");
const { renderCarousel } = require("./render");
const { fetchWikipediaImage, fetchTopicImage, removeBackground, resetUsedMedia } = require("./fetchMedia");

async function run(options = {}) {
    const {
        topicMode = 'auto',
        customTopic = '',
        category = 'finance',
        channelName = '1affairs',
        slideCount = 3,
        onProgress = console.log
    } = options;

    const numSlides = Math.max(3, Math.min(8, parseInt(slideCount) || 3));
    resetUsedMedia();

    let bestStory;

    if (topicMode === 'custom') {
        onProgress(`1. Using custom topic: ${customTopic}`);
        bestStory = { 
            headline: customTopic, 
            description: `A story about ${customTopic} in the ${category} sector.`, 
            url: "custom-url" 
        };
    } else {
        onProgress(`1. Fetching trending ${category} news...`);
        const articles = await getTrendingStats(category);
        if (!articles || articles.length === 0) {
            onProgress("No articles found. Exiting.");
            return { error: "No articles found." };
        }

        onProgress(`Fetched ${articles.length} articles. Selecting the top story...`);
        bestStory = selectBestStory(articles);
        if (!bestStory) {
            onProgress("No unused stories available. Exiting.");
            return { error: "No unused stories available." };
        }
    }
    
    onProgress(`Selected story: "${bestStory.headline}"`);
    onProgress(`2. Generating dynamic ${numSlides}-slide storytelling copy for ${channelName}...`);
    let copyData;
    try {
        copyData = await generateCarouselCopy(bestStory, channelName, numSlides);
        onProgress(`Generated copy for ${copyData.slides.length} slides.`);
    } catch (e) {
        onProgress(`Error generating copy: ${e.message}`);
        return { error: e.message };
    }

    onProgress("3. Preparing assets & authentic media for each slide...");
    const outputDir = path.join(__dirname, "output");
    
    if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    if (copyData.caption) {
        fs.writeFileSync(path.join(outputDir, "caption.txt"), copyData.caption);
    }

    // A. Fetch secondary circular visual badge for Slide 1
    const circleFile = path.join(outputDir, "circle.jpg");
    const circleKeyword = copyData.circleImageKeyword || "chart";
    const circleDownloaded = await fetchTopicImage(circleKeyword, circleFile, 99);
    const circleUrl = circleDownloaded ? `file:///${circleFile.replace(/\\/g, '/')}` : "";

    // B. Fetch person portrait & cutout if relevant
    let cutoutUrl = "";
    if (copyData.personName && copyData.personName.toLowerCase() !== "none" && copyData.personName.toLowerCase() !== "null") {
        onProgress(`Fetching authentic portrait for: ${copyData.personName}...`);
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

    // C. Fetch a UNIQUE authentic background scene for EVERY slide
    const total = copyData.slides.length;
    for (let i = 0; i < total; i++) {
        const slide = copyData.slides[i];
        const slideImgPath = path.join(outputDir, `slide_bg_${i + 1}.jpg`);
        const query = slide.imageSearchQuery || copyData.bgKeyword || bestStory.headline.slice(0, 30);
        
        onProgress(`Fetching distinct photo for Slide ${i + 1}/${total} ('${query}')...`);
        const downloaded = await fetchTopicImage(query, slideImgPath, i + 1);
        
        slide.bgImagePath = downloaded ? `file:///${slideImgPath.replace(/\\/g, '/')}` : "";
        slide.slideIndex = i + 1;
        slide.totalSlides = total;
        slide.channelName = channelName;

        // Slide 1 attaches cutout and circular badge
        if (i === 0) {
            slide.cutoutImagePath = cutoutUrl;
            slide.circleImagePath = circleUrl;
        }
    }

    onProgress(`4. Rendering ${total} viral 3:4 slides with Puppeteer...`);
    const slidePaths = await renderCarousel(copyData.slides, outputDir);
    onProgress(`Successfully rendered all ${slidePaths.length} slides!`);

    if (topicMode !== 'custom') {
        onProgress("Marking story as used...");
        markAsUsed(bestStory.url);
    }

    onProgress("Pipeline completed successfully!");
    
    return {
        slides: slidePaths.map(p => path.basename(p)),
        caption: copyData.caption,
        slideCount: total
    };
}

if (require.main === module) {
    run().then(res => console.log(res)).catch(console.error);
}

module.exports = { run };
