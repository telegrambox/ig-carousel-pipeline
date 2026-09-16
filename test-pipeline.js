const path = require("path");
const fs = require("fs");
const { getTrendingStats } = require("./source");
const { getUsedUrls } = require("./select");
const { generateCarouselCopy } = require("./generateCopy");
const { renderCarousel } = require("./render");
const fetch = require("node-fetch");

async function runTest() {
    console.log("1. Fetching trending stats...");
    const articles = await getTrendingStats();
    if (!articles || articles.length === 0) {
        console.log("No articles found. Check your NEWS_API_KEY.");
        return;
    }

    // Since we want 3 posts, let's manually sort and pick the top 3 available stories.
    let usedUrls = [];
    try {
        usedUrls = JSON.parse(fs.readFileSync(path.join(__dirname, "used_stories.json"), "utf-8"));
    } catch (e) {
        usedUrls = [];
    }
    
    let available = articles.filter(a => !usedUrls.includes(a.url));
    const numberRegex = /\d+/;
    available.forEach(article => {
        let score = 0;
        const text = (article.headline + " " + article.description).toLowerCase();
        if (numberRegex.test(text)) score += 10;
        if (text.includes("%") || text.includes("percent")) score += 5;
        article.score = score;
    });
    available.sort((a, b) => b.score - a.score);

    const storiesToTest = available.slice(0, 3);
    if (storiesToTest.length === 0) {
        console.log("No unused stories available for testing.");
        return;
    }

    console.log(`Found ${storiesToTest.length} stories for testing.`);

    const os = require("os");
    const baseOutputDir = path.join(os.homedir(), "Pictures", "ind");
    if (fs.existsSync(baseOutputDir)) {
        fs.rmSync(baseOutputDir, { recursive: true, force: true });
    }
    
    for (let i = 0; i < storiesToTest.length; i++) {
        const story = storiesToTest[i];
        console.log(`\n=== Generating Carousel ${i + 1} of ${storiesToTest.length} ===`);
        console.log(`Selected story: ${story.headline}`);
        
        console.log("Generating carousel copy with Claude...");
        let copyData;
        try {
            copyData = await generateCarouselCopy(story);
            console.log(`Generated copy for topic keyword: ${copyData.topicKeyword}`);
        } catch (e) {
            console.error("Error generating copy:", e);
            continue;
        }

        const outputDir = path.join(baseOutputDir, `carousel_${i + 1}`);
        fs.mkdirSync(outputDir, { recursive: true });

        if (copyData.caption) {
            fs.writeFileSync(path.join(outputDir, "caption.txt"), copyData.caption);
        }
        // Save the raw copy data for review too
        fs.writeFileSync(path.join(outputDir, "copy_data.json"), JSON.stringify(copyData, null, 2));

        console.log(`Applying premium CSS gradient for topic: ${copyData.topicKeyword}...`);
        
        const premiumGradients = [
            "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
            "linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)",
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
            "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
        ];
        
        // Pick a random gradient for this carousel
        const selectedGradient = premiumGradients[Math.floor(Math.random() * premiumGradients.length)];
        
        copyData.slides.forEach(slide => {
            slide.bgGradient = selectedGradient;
        });

        console.log("Rendering carousel images...");
        await renderCarousel(copyData.slides, outputDir);
        console.log(`Carousel ${i + 1} saved in ${outputDir}`);
    }
    
    console.log("\nAll test carousels generated successfully!");
    console.log("Note: These stories were NOT marked as used, and they were NOT posted to Instagram.");
}

runTest().catch(console.error);
