const { Anthropic } = require("@anthropic-ai/sdk");
const fetch = require("node-fetch");

async function generateCarouselCopy(story, channelName = '1affairs', slideCount = 3) {
    const count = Math.max(2, Math.min(8, parseInt(slideCount) || 3));

    const prompt = `
    You are an expert Instagram copywriter for the media brand '${channelName}'.
    Analyze the following news story and turn it into high-converting, viral carousel copy matching our brand style.

    CRITICAL RULE FOR NARRATIVE BUILDUP (NO REPETITIVE TEXT!):
    Read the story deeply. You must break the story down into a progressive narrative across EXACTLY ${count} slides.
    Do NOT follow a generic "Hook -> stat" loop. Think wisely about what information goes on what page.
    Every single slide must convey distinct, meaningful information that builds the story context (e.g., Hook -> Background Context -> Shocking Detail -> Wider Impact -> Call to Action).
    DO NOT repeat the same sentences or structures across slides!

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
                "text": "The main hook or story detail here. Wrap the most striking stat/claim in <span class='highlight'>bold claim here</span>.",
                "subtext": "A brief supporting thought. | SWIPE",
                "imageEntity": "Specific 1-2 word Wikipedia entity for the background photo of THIS slide."
            }
        ]
    }
    Generate EXACTLY ${count} slides. The last slide's subtext must end with '| READ CAPTION', all other slides must end with '| SWIPE'.
    
    News Story:
    Headline: ${story.headline}
    Description: ${story.description || ""}
    `;

    let content = "";

    if (process.env.ANTHROPIC_API_KEY) {
        console.log("Using Anthropic Claude for copy generation...");
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 800,
            temperature: 0.7,
            system: "You output ONLY raw JSON without any markdown formatting. Do not output anything else.",
            messages: [{ role: "user", content: prompt }]
        });
        content = response.content[0].text.trim();
    } else {
        console.log("No ANTHROPIC_API_KEY found, using free Pollinations Text AI for dynamic copy generation...");
        const res = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "You output ONLY raw JSON without any markdown formatting. Do not output anything else." },
                    { role: "user", content: prompt }
                ],
                jsonMode: true,
                model: "openai"
            })
        });
        content = await res.text();
    }
    
    content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    
    try {
        const parsed = JSON.parse(content);
        
        // Validate and repair the output
        if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
            console.warn("AI output missing 'slides' array. Generating smart fallback from story text.");
            parsed.slides = [];
            const parts = story.headline.split(' - ');
            const mainSubject = parts[0].split(' ').slice(0, 2).join(' ') || "News";
            parsed.circleImageKeyword = parsed.circleImageKeyword || mainSubject;
            parsed.imageEntity = parsed.imageEntity || mainSubject;

            parsed.slides.push({
                text: `Breaking: <span class='highlight'>${parts[0]}</span>`,
                subtext: "Swipe to read more | SWIPE",
                imageEntity: mainSubject
            });

            for (let i = 1; i < count; i++) {
                parsed.slides.push({
                    text: `This developing story highlights <span class='highlight'>major impacts ahead.</span>`,
                    subtext: i === count - 1 ? "What do you think? | READ CAPTION" : "More details emerging | SWIPE",
                    imageEntity: mainSubject
                });
            }
        }
        
        // Ensure slides have required fields
        parsed.slides.forEach((s, idx) => {
            if (!s.text) s.text = `<span class='highlight'>Breaking update</span>`;
            if (!s.imageEntity) s.imageEntity = parsed.imageEntity || "News";
        });

        return parsed;
    } catch (e) {
        console.error("AI JSON Parse Error (Output may be truncated). Generating smart fallback. Raw content:", content);
        
        const parts = story.headline.split(' - ');
        const mainSubject = parts[0].split(' ').slice(0, 2).join(' ') || "News";
        
        const fallback = {
            caption: `Breaking News from ${channelName}! 🚀\n\n${story.headline}\n\n#${channelName} #news`,
            personName: null,
            circleImageKeyword: mainSubject,
            imageEntity: mainSubject,
            slides: []
        };
        
        fallback.slides.push({
            text: `Breaking: <span class='highlight'>${parts[0]}</span>`,
            subtext: "Swipe to read more | SWIPE",
            imageEntity: mainSubject
        });

        for (let i = 1; i < count; i++) {
            fallback.slides.push({
                text: `This developing story highlights <span class='highlight'>major impacts ahead.</span>`,
                subtext: i === count - 1 ? "What do you think? | READ CAPTION" : "More details emerging | SWIPE",
                imageEntity: mainSubject
            });
        }
        
        return fallback;
    }
}

module.exports = { generateCarouselCopy };
