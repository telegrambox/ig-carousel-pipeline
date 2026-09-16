const path = require("path");
const fs = require("fs");
const { renderCarousel } = require("./render");
const fetch = require("node-fetch");

const erupeeCarousel = {
    caption: "The Digital Rupee (e₹) is transforming the Indian economy. From programmable payments to offline transfers, here's everything you need to know about the RBI's latest innovation! 🇮🇳💸 #DigitalRupee #ERupee #RBI #DigitalIndia #Fintech",
    topicKeyword: "currency",
    slides: [
        {
            text: "The RBI is revolutionizing money with the <span class='highlight'>Digital Rupee (e₹).</span>",
            subtext: "A new era of sovereign currency. | SWIPE",
            bgImagePath: "file:///C:/Users/Welcome/.gemini/antigravity/brain/0325522b-db55-45f0-8d34-d65a4985f880/erupee_intro_1786427964599.jpg"
        },
        {
            text: "Unlike UPI, it's not just a payment method... <span class='highlight'>it's digital cash.</span>",
            subtext: "Backed directly by the central bank. | SWIPE",
            bgImagePath: "file:///C:/Users/Welcome/.gemini/antigravity/brain/0325522b-db55-45f0-8d34-d65a4985f880/erupee_cash_1786428086302.jpg"
        },
        {
            text: "The biggest feature? <span class='highlight'>Programmable payments.</span>",
            subtext: "Money coded for specific use cases. | SWIPE",
            paragraph: "Programmable payments allow the government or corporations to issue funds that can only be spent on specific goods or services. For example, agricultural subsidies can be programmed so they are exclusively used to purchase fertilizers. This guarantees that the funds are utilized precisely as intended, drastically reducing fraud, misuse, and inefficiencies in the system.",
            bgImagePath: "file:///C:/Users/Welcome/.gemini/antigravity/brain/0325522b-db55-45f0-8d34-d65a4985f880/erupee_programmable_1786428102135.jpg"
        },
        {
            text: "It also enables <span class='highlight'>offline transactions.</span>",
            subtext: "No internet? No problem. | SWIPE",
            paragraph: "The e-Rupee supports offline transactions using technologies like NFC and Bluetooth. This means you can transfer digital cash seamlessly between devices even in remote rural areas with zero network connectivity. By eliminating the absolute dependency on internet access, it represents a massive leap forward for true financial inclusion across all of India.",
            bgImagePath: "file:///C:/Users/Welcome/.gemini/antigravity/brain/0325522b-db55-45f0-8d34-d65a4985f880/erupee_offline_1786429160688.jpg"
        },
        {
            text: "Welcome to the <span class='highlight'>future of the Indian Economy.</span>",
            subtext: "Are you ready for the e₹? | READ CAPTION",
            bgImagePath: "file:///C:/Users/Welcome/.gemini/antigravity/brain/0325522b-db55-45f0-8d34-d65a4985f880/erupee_future_1786429461734.jpg"
        }
    ]
};

async function runERupee() {
    const os = require("os");
    const baseOutputDir = path.join(os.homedir(), "Pictures", "ind", "erupee_carousel");
    if (fs.existsSync(baseOutputDir)) {
        fs.rmSync(baseOutputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(baseOutputDir, { recursive: true });

    console.log("Generating e-Rupee Carousel (5 Pages with Unique AI Images)...");
    
    fs.writeFileSync(path.join(baseOutputDir, "caption.txt"), erupeeCarousel.caption);
    fs.writeFileSync(path.join(baseOutputDir, "copy_data.json"), JSON.stringify(erupeeCarousel, null, 2));

    // Convert local file paths to base64 so Puppeteer can render them
    for (let slide of erupeeCarousel.slides) {
        if (slide.bgImagePath && slide.bgImagePath.startsWith('file:///')) {
            const localPath = slide.bgImagePath.replace('file:///', '');
            try {
                const buffer = fs.readFileSync(localPath);
                const base64 = buffer.toString('base64');
                slide.bgImagePath = `data:image/jpeg;base64,${base64}`;
            } catch (err) {
                console.error(`Failed to read local image: ${localPath}`, err);
            }
        }
    }

    console.log("Rendering carousel images...");
    await renderCarousel(erupeeCarousel.slides, baseOutputDir);
    console.log(`Carousel saved in ${baseOutputDir}`);
}

runERupee().catch(console.error);
