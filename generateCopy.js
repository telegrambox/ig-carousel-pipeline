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

        const defaultKeywords = isEnergy
            ? ["solar panel farm", "wind turbine energy", "power transmission grid", "stock market investing", "clean energy city"]
            : isExam
            ? ["student protest demonstration", "government secretariat building", "students in examination hall", "justice supreme court", "university campus"]
            : isTech
            ? ["aerospace aircraft hangar", "semiconductor microchip cleanroom", "high tech robotics", "global trade partnership", "modern smart city"]
            : ["corporate boardroom meeting", "stock exchange trading floor", "financial charts screen", "modern business skyscraper", "global business conference"];

        const slides = [
            {
                text: `Breaking: <span class='highlight'>${story.headline.split(' - ')[0]}</span>`,
                subtext: "Swipe to read more | SWIPE",
                bgKeyword: defaultKeywords[0]
            }
        ];

        for (let i = 1; i < count - 1; i++) {
            slides.push({
                text: `According to recent reports, <span class='highlight'>this could trigger a massive ripple effect across the sector.</span>`,
                subtext: "The impact on the market is huge | SWIPE",
                bgKeyword: defaultKeywords[i % defaultKeywords.length]
            });
        }

        slides.push({
            text: `Will this lead to <span class='highlight'>a permanent shift in the industry?</span>`,
            subtext: "What do you think? | READ CAPTION",
            bgKeyword: defaultKeywords[(count - 1) % defaultKeywords.length]
        });

        return {
            caption: `Breaking News from ${channelName}! 🚀\n\n${story.headline}\n\nWhat are your thoughts on this? Let us know below! 👇\n\n#${channelName} #finance #news`,
            personName: person,
            circleImageKeyword: isEnergy ? "solar panel" : isExam ? "protest sign" : isTech ? "fighter jet" : "stock chart",
            bgKeyword: defaultKeywords[0],
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
    Every single slide MUST have a distinct, highly relevant "bgKeyword" representing what that specific slide discusses (e.g. Slide 1: "solar energy park", Slide 2: "power transmission lines", Slide 3: "wall street trading floor", Slide 4: "clean energy future skyline"). DO NOT repeat the same bgKeyword across slides!

    The output MUST be valid JSON matching exactly this shape:
    {
        "caption": "A short engaging caption for the instagram post, including relevant hashtags.",
        "personName": "Full name of the main person/leader/businessman in this story (e.g., 'Gautam Adani', 'Nirmala Sitharaman', 'Mukesh Ambani'). If none, null.",
        "circleImageKeyword": "A specific 1-2 word keyword for a secondary circular visual (e.g., 'mansion', 'stock market chart', 'rupee money', 'factory', 'cricket stadium').",
        "bgKeyword": "A 1-2 word main topic keyword for slide 1.",
        "slides": [
            {
                "text": "The main hook sentence here. Wrap the most striking stat/claim in <span class='highlight'>bold claim here</span>.",
                "subtext": "A brief supporting quote or stat. | SWIPE",
                "bgKeyword": "Specific 2-3 word keyword for the background photo of THIS slide."
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
