const path = require("path");
const fs = require("fs");
const { getTrendingStats } = require("./source");
const { selectBestStory, markAsUsed } = require("./select");
const { generateCarouselCopy } = require("./generateCopy");
const { renderSlide, renderCarousel } = require("./render");
const { fetchWikipediaImage, fetchTopicImage, removeBackground, resetUsedMedia } = require("./fetchMedia");

/**
 * Step 1: Draft and segment the copy without rendering images.
 * Returns the planned copyData with all slides, subtexts, and image search keywords.
 */
async function planCopy(options = {}) {
    const {
        topicMode = 'auto',
        customTopic = '',
        customContext = '',
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
            description: customContext || `A user-provided story about ${customTopic} in the ${category} category.`,
            contextText: customContext || "",
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
    onProgress(`2. Generating carousel copy for channel: ${channelName} (${slideCount} slides)...`);

    try {
        const copyData = await generateCarouselCopy(bestStory, channelName, slideCount);
        onProgress("Generated copy successfully.");
        return { bestStory, copyData };
    } catch (e) {
        onProgress(`Error generating copy: ${e.message}`);
        return { error: e.message };
    }
}

/**
 * Step 2: Render images from confirmed/edited copyData.
 */
async function renderFromCopyData(copyData, options = {}) {
    const {
        channelName = '1affairs',
        bestStory = {},
        topicMode = 'auto',
        onProgress = console.log
    } = options;

    resetUsedMedia();

    onProgress("Preparing assets and rendering carousel images...");
    const outputDir = path.join(__dirname, "output");

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    if (copyData.caption) {
        fs.writeFileSync(path.join(outputDir, "caption.txt"), copyData.caption);
    }

    // A. Fetch secondary circular badge image (for Slide 1)
    let circleUrl = "";
    if (!copyData.removeCircle) {
        const circleTarget = copyData.circleImageUrl || copyData.circleImageKeyword || copyData.imageEntity || "stock chart";
        if (circleTarget && circleTarget.toLowerCase() !== "none" && circleTarget.toLowerCase() !== "null") {
            const circleFile = path.join(outputDir, "circle.jpg");
            onProgress(`Fetching secondary image for keyword: ${circleTarget}...`);
            const circleDownloaded = await fetchTopicImage(circleTarget, circleFile, 99);
            circleUrl = circleDownloaded ? `file:///${circleFile.replace(/\\/g, '/')}` : "";
        }
    }

    // C. Fetch person portrait & remove background (for Slide 1 Hero)
    let cutoutUrl = "";
    const personTarget = copyData.cutoutImageUrl || copyData.personName;
    if (!copyData.removeCutout && personTarget && personTarget.toLowerCase() !== "none" && personTarget.toLowerCase() !== "null") {
        onProgress(`Fetching authentic portrait for: ${personTarget}...`);
        const rawPersonPath = path.join(outputDir, "person_raw.jpg");
        const personDownloaded = await fetchWikipediaImage(personTarget, rawPersonPath);
        if (personDownloaded) {
            onProgress("Removing background using AI (rembg)...");
            const cutoutPath = path.join(outputDir, "person_cutout.png");
            const cutoutGenerated = removeBackground(personDownloaded, cutoutPath);
            if (cutoutGenerated) {
                cutoutUrl = `file:///${cutoutPath.replace(/\\/g, '/')}`;
            }
        }
    }

    // D. Fetch a UNIQUE, distinct background photo for EVERY slide
    const totalSlides = copyData.slides.length;
    for (let idx = 0; idx < totalSlides; idx++) {
        const slide = copyData.slides[idx];
        const targetImageOrKeyword = slide.imageUrl || slide.imageEntity || copyData.imageEntity || bestStory.headline || "News";
        const slideImgPath = path.join(outputDir, `slide_bg_${idx + 1}.jpg`);

        onProgress(`Fetching photo for Slide ${idx + 1}/${totalSlides} ('${targetImageOrKeyword}')...`);
        const downloaded = await fetchTopicImage(targetImageOrKeyword, slideImgPath, idx + 1);
        slide.bgImagePath = downloaded ? `file:///${slideImgPath.replace(/\\/g, '/')}` : (slide.imageUrl || "");

        slide.channelName = channelName;
        // Slide 1 has the hero person cutout & circular badge
        slide.cutoutImagePath = (idx === 0 && !copyData.removeCutout) ? cutoutUrl : "";
        slide.circleImagePath = (idx === 0 && !copyData.removeCircle) ? circleUrl : "";
    }

    onProgress("Rendering slides with Puppeteer...");
    const slidePaths = await renderCarousel(copyData.slides, outputDir);
    onProgress(`Rendered ${slidePaths.length} slides.`);

    if (topicMode === 'auto' && bestStory && bestStory.url && bestStory.url !== 'custom-url') {
        onProgress("Marking story as used...");
        markAsUsed(bestStory.url);
    }

    onProgress("Carousel generation completed successfully!");

    return {
        slides: slidePaths.map(p => path.basename(p)),
        caption: copyData.caption,
        copyData: copyData
    };
}

/**
 * Step 3: Re-render only ONE specific slide on demand (e.g. retry image or tweak text).
 */
async function regenerateSingleSlide(slideIndex, slideData, options = {}) {
    const { channelName = '1affairs', onProgress = console.log } = options;
    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    slideData.channelName = channelName || slideData.channelName || '1affairs';

    const idx = parseInt(slideIndex) || 0;
    const slideImgPath = path.join(outputDir, `slide_bg_${idx + 1}.jpg`);
    const targetImageOrKeyword = slideData.imageUrl || slideData.imageEntity || "News";

    onProgress(`Re-fetching image for Slide ${idx + 1} ('${targetImageOrKeyword}')...`);
    const seed = Math.floor(Math.random() * 1000) + (idx + 1) * 73;
    const downloaded = await fetchTopicImage(targetImageOrKeyword, slideImgPath, seed);
    slideData.bgImagePath = downloaded ? `file:///${slideImgPath.replace(/\\/g, '/')}` : (slideData.imageUrl || "");

    // Slide 1 Hero Addon handling (Circular badge & Person Cutout)
    if (idx === 0) {
        // Circular Badge
        if (slideData.removeCircle) {
            slideData.circleImagePath = "";
        } else if (slideData.circleImageUrl || slideData.circleImageKeyword) {
            const circleTarget = slideData.circleImageUrl || slideData.circleImageKeyword;
            const circleFile = path.join(outputDir, "circle.jpg");
            onProgress(`Updating circular badge image ('${circleTarget}')...`);
            const circleDownloaded = await fetchTopicImage(circleTarget, circleFile, 99);
            if (circleDownloaded) {
                slideData.circleImagePath = `file:///${circleFile.replace(/\\/g, '/')}`;
            }
        } else if (slideData.circleImagePath) {
            // Keep existing circle image path
        } else {
            const circlePath = path.join(outputDir, "circle.jpg");
            if (fs.existsSync(circlePath)) {
                slideData.circleImagePath = `file:///${circlePath.replace(/\\/g, '/')}`;
            }
        }

        // Person Cutout
        if (slideData.removeCutout) {
            slideData.cutoutImagePath = "";
        } else if (slideData.cutoutImageUrl || slideData.personName) {
            const personTarget = slideData.cutoutImageUrl || slideData.personName;
            if (personTarget.toLowerCase() !== "none" && personTarget.toLowerCase() !== "null") {
                onProgress(`Updating person portrait for: ${personTarget}...`);
                const rawPersonPath = path.join(outputDir, "person_raw.jpg");
                const personDownloaded = await fetchWikipediaImage(personTarget, rawPersonPath);
                if (personDownloaded) {
                    onProgress("Generating transparent person cutout...");
                    const cutoutPath = path.join(outputDir, "person_cutout.png");
                    const cutoutGenerated = removeBackground(personDownloaded, cutoutPath);
                    if (cutoutGenerated) {
                        slideData.cutoutImagePath = `file:///${cutoutPath.replace(/\\/g, '/')}`;
                    }
                }
            }
        } else if (slideData.cutoutImagePath) {
            // Keep existing cutout image path
        } else {
            const cutoutPath = path.join(outputDir, "person_cutout.png");
            if (fs.existsSync(cutoutPath)) {
                slideData.cutoutImagePath = `file:///${cutoutPath.replace(/\\/g, '/')}`;
            }
        }
    } else {
        slideData.cutoutImagePath = "";
        slideData.circleImagePath = "";
    }

    const outPath = path.join(outputDir, `slide-${idx + 1}.png`);
    onProgress(`Re-rendering Slide ${idx + 1}...`);
    await renderSlide(slideData, outPath);
    onProgress(`Slide ${idx + 1} re-rendered successfully.`);

    return {
        slideIndex: idx,
        slideFile: `slide-${idx + 1}.png`,
        slideData: slideData
    };
}

/**
 * Unified run function (retains 100% backward compatibility for automated/CLI runs).
 */
async function run(options = {}) {
    const planResult = await planCopy(options);
    if (planResult.error) return planResult;

    return await renderFromCopyData(planResult.copyData, {
        ...options,
        bestStory: planResult.bestStory
    });
}

if (require.main === module) {
    run().then(res => console.log(res)).catch(console.error);
}

module.exports = {
    planCopy,
    renderFromCopyData,
    regenerateSingleSlide,
    run
};
