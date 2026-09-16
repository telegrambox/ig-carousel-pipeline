const path = require("path");
const fs = require("fs");
const { renderCarousel } = require("./render");
const fetch = require("node-fetch");

const mockCarousels = [
    {
        caption: "India's space sector is booming! From historic lunar landings to the upcoming Gaganyaan mission, ISRO is proving that sky is not the limit. What are your thoughts on India's cosmic ambitions? 🚀🇮🇳 #ISRO #SpaceExploration #Gaganyaan #IndianStartups",
        topicKeyword: "space",
        slides: [
            {
                text: "India's space sector is entering a <span class='highlight'>Golden Age.</span>",
                subtext: "ISRO's ambitious roadmap is turning heads globally. | SWIPE"
            },
            {
                text: "With the upcoming <span class='highlight'>Gaganyaan mission</span>...",
                subtext: "India will soon send humans to space on an indigenous rocket. | SWIPE",
                paragraph: "The Gaganyaan project envisages demonstration of human spaceflight capability by launching a crew of 3 members to an orbit of 400 km for a 3 days mission and bring them back safely to earth, by landing in Indian sea waters."
            },
            {
                text: "Private space startups are also <span class='highlight'>fueling the boom.</span>",
                subtext: "Dozens of Indian companies are building rockets and satellites. | SWIPE",
                paragraph: "Following the historic privatization of the space sector, companies like Skyroot and Agnikul Cosmos are developing cutting-edge launch vehicles, democratizing access to space and attracting billions in venture capital."
            },
            {
                text: "The global space economy is projected to hit <span class='highlight'>$1 Trillion.</span>",
                subtext: "And India is poised to claim a massive share. | READ CAPTION"
            }
        ]
    }
];

async function runMockTest() {
    const os = require("os");
    const baseOutputDir = path.join(os.homedir(), "Pictures", "ind");
    if (fs.existsSync(baseOutputDir)) {
        fs.rmSync(baseOutputDir, { recursive: true, force: true });
    }
    
    for (let i = 0; i < mockCarousels.length; i++) {
        const copyData = mockCarousels[i];
        console.log(`\n=== Generating Mock Carousel for topic: ${copyData.topicKeyword} ===`);
        
        const outputDir = path.join(baseOutputDir, `carousel_${i + 1}`);
        fs.mkdirSync(outputDir, { recursive: true });

        fs.writeFileSync(path.join(outputDir, "caption.txt"), copyData.caption);
        fs.writeFileSync(path.join(outputDir, "copy_data.json"), JSON.stringify(copyData, null, 2));

        console.log(`Applying premium CSS gradient for topic: ${copyData.topicKeyword}...`);
        
        const premiumGradients = [
            "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
            "linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)",
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
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
    
    console.log("\nAll mock carousels generated successfully!");
}

runMockTest().catch(console.error);
