const { Anthropic } = require("@anthropic-ai/sdk");

async function generateCarouselCopy(story, channelName = '1affairs', slideCount = 3) {
    const count = Math.max(2, Math.min(8, parseInt(slideCount) || 3));

    if (!process.env.ANTHROPIC_API_KEY) {
        console.log(`No ANTHROPIC_API_KEY found, using mock generator for ${count} slides...`);
        let person = null;
        if (/adani/i.test(story.headline)) person = "Gautam Adani";
        else if (/ambani/i.test(story.headline)) person = "Mukesh Ambani";
        else if (/tata/i.test(story.headline)) person = "Ratan Tata";
        else if (/musk/i.test(story.headline)) person = "Elon Musk";
        else if (/modi/i.test(story.headline)) person = "Narendra Modi";

        // Derive distinct topical keywords per slide
        const isEnergy = /energy|solar|green|power|clean/i.test(story.headline);
        const isExam = /exam|protest|jssc|student|paper leak/i.test(story.headline);
        const isTech = /ai|tech|chip|semiconductor|aerospace/i.test(story.headline);

        const defaultEntities = isEnergy
            ? ["Solar power", "Wind turbine", "Electrical grid", "Stock market", "Green energy"]
            : isExam
            ? ["Protest", "Secretariat building", "Examination", "Supreme Court", "University"]
            : isTech
            ? ["Hangar", "Semiconductor", "Industrial robot", "Cargo ship", "Smart city"]
            : ["Boardroom", "Stock exchange", "Financial graph", "Skyscraper", "Business conference"];

        const slides = [
            {
                text: `Breaking: <span class='highlight'>${story.headline.split(' - ')[0]}</span>`,
                subtext: "Swipe to read more | SWIPE",
                imageEntity: defaultEntities[0]
            }
        ];

        for (let i = 1; i < count - 1; i++) {
            slides.push({
                text: `According to recent reports, <span class='highlight'>this could trigger a massive ripple effect across the sector.</span>`,
                subtext: "The impact on the market is huge | SWIPE",
                imageEntity: defaultEntities[i % defaultEntities.length]
            });
        }

        slides.push({
            text: `Will this lead to <span class='highlight'>a permanent shift in the industry?</span>`,
            subtext: "What do you think? | READ CAPTION",
            imageEntity: defaultEntities[(count - 1) % defaultEntities.length]
        });

        return {
            caption: `Breaking News from ${channelName}! 🚀\n\n${story.headline}\n\nWhat are your thoughts on this? Let us know below! 👇\n\n#${channelName} #finance #news`,
            personName: person,
            circleImageKeyword: isEnergy ? "Solar panel" : isExam ? "Protest" : isTech ? "Fighter aircraft" : "Stock market",
            imageEntity: defaultEntities[0],
            slides: slides
        };
    }

    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = `
    You are an expert Instagram copywriter for the media brand '${channelName}'.
    Analyze the following news story and turn it into high-converting, viral carousel copy matching our brand style.

    CRITICAL RULE FOR IMAGES:
    Every single slide MUST have a distinct, highly relevant "imageEntity" representing what that specific slide discusses.
    This entity MUST be a simple 1-2 word real-world physical noun or proper noun that exists on Wikipedia (e.g., 'Stock market', 'Narendra Modi', 'Semiconductor', 'Solar panel', 'Protest'). 
    DO NOT use descriptive adjectives or long phrases.
    DO NOT repeat the same imageEntity across slides!

    The output MUST be valid JSON matching exactly this shape:
    {
        "caption": "A short engaging caption for the instagram post, including relevant hashtags.",
        "personName": "Full name of the main person/leader/businessman in this story (e.g., 'Gautam Adani', 'Nirmala Sitharaman', 'Mukesh Ambani'). If none, null.",
        "circleImageKeyword": "A specific 1-2 word keyword for a secondary circular visual (e.g., 'Mansion', 'Stock market', 'Factory').",
        "imageEntity": "A 1-2 word Wikipedia entity for slide 1.",
        "slides": [
            {
                "text": "The main hook sentence here. Wrap the most striking stat/claim in <span class='highlight'>bold claim here</span>.",
                "subtext": "A brief supporting quote or stat. | SWIPE",
                "imageEntity": "Specific 1-2 word Wikipedia entity for the background photo of THIS slide."
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
        max_tokens: 800,
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
    content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    
    try {
        return JSON.parse(content);
    } catch (e) {
        throw new Error("Failed to parse Claude JSON: " + content);
    }
}

module.exports = { generateCarouselCopy };
