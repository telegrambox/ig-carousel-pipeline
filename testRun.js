const path = require("path");
const fs = require("fs");
const { renderCarousel } = require("./render");
const { fetchWikipediaImage, fetchTopicImage, removeBackground } = require("./fetchMedia");

async function runTest() {
    console.log("=== Running Live Test for 1affairs (3:4 Ratio + AI Cutout) ===");

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Topic & Persona: Gautam Adani / Finance News
    const personName = "Gautam Adani";
    console.log(`Step 1: Fetching Wikipedia portrait for ${personName}...`);
    const rawPersonPath = path.join(outputDir, "person_raw.jpg");
    const personDownloaded = await fetchWikipediaImage(personName, rawPersonPath);

    let cutoutUrl = "";
    if (personDownloaded) {
        console.log("Step 2: Removing background using AI (rembg)...");
        const cutoutPath = path.join(outputDir, "person_cutout.png");
        const cutoutGenerated = removeBackground(personDownloaded, cutoutPath);
        if (cutoutGenerated) {
            cutoutUrl = `file:///${cutoutPath.replace(/\\/g, '/')}`;
        }
    }

    // 2. Fetch secondary image for circular badge (Stock market / Green Energy)
    console.log("Step 3: Fetching secondary visual for circular badge...");
    const circleFile = path.join(outputDir, "circle.jpg");
    const circleDownloaded = await fetchTopicImage("stock market chart green", circleFile);
    const circleUrl = circleDownloaded ? `file:///${circleFile.replace(/\\/g, '/')}` : "";

    // 3. Fetch background atmosphere scenes for each slide
    console.log("Step 4: Fetching story-driven background scenes for each slide...");
    
    // Slide 1 Background: Modern luxury boardroom / press conference
    const bg1File = path.join(outputDir, "bg1_boardroom.jpg");
    await fetchTopicImage("modern luxury boardroom conference", bg1File);
    const bg1Url = `file:///${bg1File.replace(/\\/g, '/')}`;

    // Slide 2 Background: Massive solar park / renewable power infrastructure
    const bg2File = path.join(outputDir, "bg2_solarpark.jpg");
    await fetchTopicImage("massive solar panels power plant landscape", bg2File);
    const bg2Url = `file:///${bg2File.replace(/\\/g, '/')}`;

    // Slide 3 Background: Global financial exchange / trading floor
    const bg3File = path.join(outputDir, "bg3_finance.jpg");
    await fetchTopicImage("stock exchange trading floor wall street", bg3File);
    const bg3Url = `file:///${bg3File.replace(/\\/g, '/')}`;

    // 4. Create 3:4 slides matching the 1affairs viral template
    const slidesData = [
        {
            text: "How Gautam Adani's massive ₹10,000 Crore green bet <span class='highlight'>sent renewable shares up 14%.</span>",
            subtext: "The real story behind India's clean energy surge | SWIPE",
            bgImagePath: bg1Url,
            cutoutImagePath: cutoutUrl,
            circleImagePath: circleUrl,
            fullBleed: false
        },
        {
            text: "Adani Green Energy is now targeting <span class='highlight'>45 GW clean capacity by 2030.</span>",
            subtext: "India's largest renewable park is taking shape in Khavda, Gujarat. | SWIPE",
            bgImagePath: bg2Url,
            fullBleed: true
        },
        {
            text: "With global institutions backing the expansion, <span class='highlight'>can India dominate global solar?</span>",
            subtext: "Drop your predictions in the comments below! | READ CAPTION",
            bgImagePath: bg3Url,
            fullBleed: true
        }
    ];

    console.log("Step 5: Rendering 3:4 carousel slides with Puppeteer...");
    const paths = await renderCarousel(slidesData, outputDir);
    console.log("Rendered slides:", paths);
    console.log("=== Test Run Completed Successfully! ===");
}

runTest().catch(console.error);
