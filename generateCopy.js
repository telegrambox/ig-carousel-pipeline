const { Anthropic } = require("@anthropic-ai/sdk");

async function generateCarouselCopy(story, channelName = '1affairs', slideCount = 3) {
    const count = Math.max(2, Math.min(8, parseInt(slideCount) || 3));

    if (!process.env.ANTHROPIC_API_KEY) {
        console.log(`No ANTHROPIC_API_KEY found, using mock generator for ${count} slides...`);
        // Mock a successful JSON generation
        let person = "Gautam Adani";
        if (story.headline.includes("Ambani")) person = "Mukesh Ambani";
        if (story.headline.includes("Tata")) person = "Ratan Tata";
        if (story.headline.includes("Musk")) person = "Elon Musk";

        const slides = [
            {
                text: `Breaking: <span class='highlight'>${story.headline.split(' - ')[0]}</span>`,
                subtext: "Swipe to read more | SWIPE"
            }
        ];

        for (let i = 1; i < count - 1; i++) {
            slides.push({
                text: `According to recent reports, <span class='highlight'>this could change everything for the sector.</span>`,
                subtext: "The impact on the market is huge | SWIPE"
            });
        }

        slides.push({
            text: `Will this lead to <span class='highlight'>a massive shift in the industry?</span>`,
            subtext: "What do you think? | READ CAPTION"
        });

        return {
            caption: `Breaking News from ${channelName}! 🚀\n\n${story.headline}\n\nWhat are your thoughts on this? Let us know below! 👇\n\n#${channelName} #finance #news`,
            personName: person,
            circleImageKeyword: "stock market chart",
            bgKeyword: "office boardroom",
            slides: slides
        };
    }

    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `
    You are an expert Instagram copywriter for the media brand '${channelName}'.
    Analyze the following news story and turn it into high-converting, viral carousel copy matching our brand style.

    The output MUST be valid JSON matching exactly this shape:
    {
        "caption": "A short engaging caption for the instagram post, including relevant hashtags.",
        "personName": "Full name of the main person/leader/businessman in this story (e.g., 'Gautam Adani', 'Nirmala Sitharaman', 'Mukesh Ambani'). If none, null.",
        "circleImageKeyword": "A specific 1-2 word keyword for a secondary circular visual (e.g., 'mansion', 'stock market chart', 'rupee money', 'factory', 'cricket stadium').",
        "bgKeyword": "A 1-2 word background scene keyword (e.g., 'press conference', 'office boardroom', 'parliament', 'financial district').",
        "slides": [
            {
                "text": "The main hook sentence here. Wrap the most striking stat/claim in <span class='highlight'>bold claim here</span>.",
                "subtext": "A brief supporting quote or stat. | SWIPE"
            }
        ]
    }
    Generate EXACTLY ${count} slides. The last slide's subtext must end with '| READ CAPTION', all other slides must end with '| SWIPE'.
    
    News Story:
    Headline: ${story.headline}
    Description: ${story.description || ""}
    `;

    const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        temperature: 0.7,
        system: "You output ONLY raw JSON without any markdown formatting. Do not output anything else.",
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    });
    
    let content = response.content[0].text.trim();
    // In case there are markdown ticks, remove them
    content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    
    try {
        return JSON.parse(content);
    } catch (e) {
        throw new Error("Failed to parse Claude JSON: " + content);
    }
}

module.exports = { generateCarouselCopy };
