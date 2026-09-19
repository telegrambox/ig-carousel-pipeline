const path = require("path");
const fs = require("fs");
const { getTrendingStats, getIndiaDailyNewsBulletins } = require("./source");
const { selectBestStory, markAsUsed } = require("./select");
const { generateCarouselCopy, generateDailyNewsCopy } = require("./generateCopy");
const { renderSlide, renderCarousel } = require("./render");
const { fetchWikipediaImage, fetchTopicImage, removeBackground, resetUsedMedia } = require("./fetchMedia");

/**
 * Step 1: Draft and segment the copy without rendering images.
 * Returns the planned copyData with all slides, subtexts, and image search keywords.
 */
async function planCopy(options = {}) {
    const {
        template = 'default',
        coverStyle = 'styleA',
        topicMode = 'auto',
        customTopic = '',
        customContext = '',
        category = 'finance',
        channelName = '1affairs',
        slideCount = 3,
        onProgress = console.log
    } = options;

    if (template === 'daily_news') {
        onProgress(`1. Initializing Daily News template (${slideCount} slides, cover: ${coverStyle})...`);
        let bulletins = [];
        let story = {};

        if (topicMode === 'custom') {
            onProgress("Using custom topic/context for Daily News...");
            story = {
                headline: customTopic || "What Happened in India - Last 24 Hours in 60 Seconds",
                description: customContext || "Top Indian news stories from the last 24 hours.",
                contextText: customContext || "",
                url: "custom-url"
            };
        } else {
            onProgress("Fetching latest 24h Indian national news bulletins from RSS...");
            bulletins = await getIndiaDailyNewsBulletins();
            onProgress(`Fetched ${bulletins.length} Indian news bulletins.`);
            story = {
                headline: "What Happened in India - Last 24 Hours in 60 Seconds",
                description: "24-hour national round-up across India.",
                url: "daily-news-india"
            };
        }

        onProgress(`2. Drafting Daily News copy and segmentation for '${channelName}'...`);
        try {
            const copyData = await generateDailyNewsCopy({
                story,
                bulletins,
                channelName,
                slideCount,
                coverStyle,
                topicMode
            });
            copyData.template = 'daily_news';
            copyData.coverStyle = coverStyle;
            onProgress("Generated Daily News copy successfully.");
            return { bestStory: story, copyData };
        } catch (e) {
            onProgress(`Error generating Daily News copy: ${e.message}`);
            return { error: e.message };
        }
    }

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
        copyData.template = 'default';
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
        channelName = copyData.channelName || '1affairs',
        bestStory = {},
        topicMode = 'auto',
        template = copyData.template || 'default',
        onProgress = console.log
    } = options;

    copyData.template = copyData.template || template || 'default';
    const activeChannel = channelName || copyData.channelName || '1affairs';

    resetUsedMedia();

    onProgress("Preparing assets and rendering carousel images...");
    const outputDir = path.join(__dirname, "output");

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    if (copyData.caption) {
        fs.writeFileSync(path.join(outputDir, "caption.txt"), copyData.caption);
    }

    // ==========================================
    // DAILY NEWS TEMPLATE PIPELINE
    // ==========================================
    if (copyData.template === 'daily_news') {
        onProgress("Rendering Daily News carousel...");
        const totalSlides = copyData.slides.length;
        const secondaryImgPaths = [];

        const isSlide0Cover = (copyData.slides[0]?.isCover === true);
        const lastIdx = totalSlides - 1;
        const isLastCta = (copyData.slides[lastIdx]?.isCta === true);

        // 1. Process all Story Slides (fetch background photos)
        for (let idx = 0; idx < totalSlides; idx++) {
            const slide = copyData.slides[idx];
            slide.template = 'daily_news';
            slide.channelName = activeChannel;

            // Skip Cover or CTA during initial story photo download
            if (idx === 0 && isSlide0Cover) continue;
            if (idx === lastIdx && isLastCta) continue;

            const targetImageOrKeyword = slide.imageUrl || slide.imageEntity || "India";
            const slideImgPath = path.join(outputDir, `slide_bg_${idx + 1}.jpg`);

            let fallbackKeyword = slide.imageEntity;
            if (!fallbackKeyword || fallbackKeyword.startsWith('http')) {
                const cleanText = (slide.text || "").replace(/<[^>]+>/g, '').replace(/[:\-–|]/g, ' ').trim();
                const words = cleanText.split(/\s+/).filter(w => w.length > 3 && !/^(about|after|before|several|nearly|amid|across|official|underway|their|there)$/i.test(w));
                fallbackKeyword = words.slice(0, 3).join(' ') || "India";
            }

            const isDirectUrl = targetImageOrKeyword.startsWith('http://') || targetImageOrKeyword.startsWith('https://');
            const displayLabel = isDirectUrl ? `direct URL (${targetImageOrKeyword.substring(0, 40)}...)` : `'${targetImageOrKeyword}'`;

            onProgress(`[Story Slide ${idx + 1}/${totalSlides}] Fetching visual via ${displayLabel}...`);
            const downloaded = await fetchTopicImage(targetImageOrKeyword, slideImgPath, idx + 1, fallbackKeyword);
            slide.bgImagePath = downloaded ? `file:///${slideImgPath.replace(/\\/g, '/')}` : (slide.imageUrl || "");
            secondaryImgPaths.push(slide.bgImagePath);
            onProgress(`[Story Slide ${idx + 1}/${totalSlides}] Visual ready.`);
        }

        // 2. Prepare Slide N (CTA Slide) ONLY if isLastCta is true
        if (isLastCta) {
            const ctaSlide = copyData.slides[lastIdx];
            ctaSlide.template = 'daily_news';
            ctaSlide.isCta = true;
            ctaSlide.channelName = activeChannel;
        }

        // 3. Assemble Slide 1 (Cover Page with Collaged Elements) ONLY if isSlide0Cover is true
        if (isSlide0Cover) {
            const coverSlide = copyData.slides[0];
            coverSlide.template = 'daily_news';
            coverSlide.isCover = true;
            coverSlide.coverStyle = coverSlide.coverStyle || copyData.coverStyle || 'styleA';
            coverSlide.channelName = activeChannel;

            // Cover Background
            if (!coverSlide.bgImagePath) {
                const coverBgPath = path.join(outputDir, "slide_bg_1.jpg");
                onProgress("Fetching background scene for Cover ('India Gate')...");
                const bgDownloaded = await fetchTopicImage(coverSlide.imageEntity || "India Gate", coverBgPath, 101);
                coverSlide.bgImagePath = bgDownloaded ? `file:///${coverBgPath.replace(/\\/g, '/')}` : (secondaryImgPaths[0] || "");
            }

            // Cover Hero Cutout 1
            let cutoutUrl = coverSlide.cutoutImagePath || "";
            const personTarget = coverSlide.cutoutImageUrl || coverSlide.personName || copyData.personName;
            if (!cutoutUrl && personTarget && personTarget.toLowerCase() !== "none" && personTarget.toLowerCase() !== "null") {
                onProgress(`Fetching portrait cutout for Cover: ${personTarget}...`);
                const rawPersonPath = path.join(outputDir, "person_raw.jpg");
                const personDownloaded = await fetchWikipediaImage(personTarget, rawPersonPath);
                if (personDownloaded) {
                    onProgress("Extracting portrait cutout using rembg...");
                    const cutoutPath = path.join(outputDir, "person_cutout.png");
                    const cutoutGenerated = removeBackground(personDownloaded, cutoutPath);
                    if (cutoutGenerated) {
                        cutoutUrl = `file:///${cutoutPath.replace(/\\/g, '/')}`;
                    }
                }
            }
            coverSlide.cutoutImagePath = cutoutUrl;

            // Cover Hero Cutout 2 (if Style B)
            let cutout2Url = coverSlide.cutout2ImagePath || "";
            const person2Target = coverSlide.cutout2ImageUrl || coverSlide.person2Name;
            if (coverSlide.coverStyle === 'styleB' && !cutout2Url && person2Target) {
                const rawPerson2Path = path.join(outputDir, "person2_raw.jpg");
                const person2Downloaded = await fetchWikipediaImage(person2Target, rawPerson2Path);
                if (person2Downloaded) {
                    const cutout2Path = path.join(outputDir, "person2_cutout.png");
                    const cutout2Generated = removeBackground(person2Downloaded, cutout2Path);
                    if (cutout2Generated) {
                        cutout2Url = `file:///${cutout2Path.replace(/\\/g, '/')}`;
                    }
                }
            }
            coverSlide.cutout2ImagePath = cutout2Url;

            // Cover 3 Badges: Assign from secondary story images if not explicitly specified
            if (!Array.isArray(coverSlide.badgeImages) || coverSlide.badgeImages.length === 0) {
                coverSlide.badgeImages = secondaryImgPaths.slice(0, 3);
                while (coverSlide.badgeImages.length < 3) {
                    coverSlide.badgeImages.push(secondaryImgPaths[0] || coverSlide.bgImagePath);
                }
            }
        }

        onProgress("Rendering all Daily News slides with Puppeteer...");
        const slidePaths = await renderCarousel(copyData.slides, outputDir, onProgress);
        onProgress(`Rendered ${slidePaths.length} Daily News slides.`);

        return {
            slides: slidePaths.map(p => path.basename(p)),
            caption: copyData.caption,
            copyData: copyData
        };
    }

    // ==========================================
    // DEFAULT TEMPLATE PIPELINE (100% PRESERVED)
    // ==========================================
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
        slide.template = 'default';
        const targetImageOrKeyword = slide.imageUrl || slide.imageEntity || copyData.imageEntity || bestStory.headline || "News";
        const slideImgPath = path.join(outputDir, `slide_bg_${idx + 1}.jpg`);

        let fallbackKeyword = slide.imageEntity;
        if (!fallbackKeyword || fallbackKeyword.startsWith('http')) {
            const cleanText = (slide.text || "").replace(/<[^>]+>/g, '').replace(/[:\-–|]/g, ' ').trim();
            const words = cleanText.split(/\s+/).filter(w => w.length > 3 && !/^(about|after|before|several|nearly|amid|across|official|underway|their|there)$/i.test(w));
            fallbackKeyword = words.slice(0, 3).join(' ') || "News";
        }

        const isDirectUrl = targetImageOrKeyword.startsWith('http://') || targetImageOrKeyword.startsWith('https://');
        const displayLabel = isDirectUrl ? `direct URL (${targetImageOrKeyword.substring(0, 40)}...)` : `'${targetImageOrKeyword}'`;

        onProgress(`[Slide ${idx + 1}/${totalSlides}] Fetching visual via ${displayLabel}...`);
        const downloaded = await fetchTopicImage(targetImageOrKeyword, slideImgPath, idx + 1, fallbackKeyword);
        slide.bgImagePath = downloaded ? `file:///${slideImgPath.replace(/\\/g, '/')}` : (slide.imageUrl || "");

        slide.channelName = activeChannel;
        // Slide 1 has the hero person cutout & circular badge
        slide.cutoutImagePath = (idx === 0 && !copyData.removeCutout) ? cutoutUrl : "";
        slide.circleImagePath = (idx === 0 && !copyData.removeCircle) ? circleUrl : "";
    }

    onProgress("Rendering slides with Puppeteer...");
    const slidePaths = await renderCarousel(copyData.slides, outputDir, onProgress);
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

    // Slide 1 Hero Addon handling (Circular badge & Person Cutout for Default template ONLY, or Daily News Cover)
    if (idx === 0 && slideData.template !== 'daily_news') {
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
    } else if (idx === 0 && slideData.template === 'daily_news' && slideData.isCover) {
        // Daily News cover re-assembly
        if (slideData.personName || slideData.cutoutImageUrl) {
            const personTarget = slideData.cutoutImageUrl || slideData.personName;
            if (personTarget && personTarget.toLowerCase() !== "none") {
                const rawPersonPath = path.join(outputDir, "person_raw.jpg");
                const personDownloaded = await fetchWikipediaImage(personTarget, rawPersonPath);
                if (personDownloaded) {
                    const cutoutPath = path.join(outputDir, "person_cutout.png");
                    const cutoutGenerated = removeBackground(personDownloaded, cutoutPath);
                    if (cutoutGenerated) {
                        slideData.cutoutImagePath = `file:///${cutoutPath.replace(/\\/g, '/')}`;
                    }
                }
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
 * Re-assembles and re-renders the Slide 1 Cover page with swapped/updated components
 * (badges 1-3, hero cutout 1, hero cutout 2, background)
 */
async function rebuildDailyNewsCover(coverData, options = {}) {
    const { channelName = '1affairs', onProgress = console.log } = options;
    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    coverData.template = 'daily_news';
    coverData.isCover = true;
    coverData.channelName = channelName || coverData.channelName || '1affairs';

    if (coverData.cutoutImageUrl && !coverData.cutoutImagePath) {
        coverData.cutoutImagePath = coverData.cutoutImageUrl;
    }
    if (coverData.cutout2ImageUrl && !coverData.cutout2ImagePath) {
        coverData.cutout2ImagePath = coverData.cutout2ImageUrl;
    }

    const outPath = path.join(outputDir, "slide-1.png");
    onProgress("Re-assembling Daily News Cover with custom components...");
    await renderSlide(coverData, outPath);
    onProgress("Daily News Cover re-assembled successfully.");

    return {
        slideIndex: 0,
        slideFile: "slide-1.png",
        coverData
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
    rebuildDailyNewsCover,
    run
};
