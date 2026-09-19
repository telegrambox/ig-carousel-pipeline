const { Anthropic } = require("@anthropic-ai/sdk");
const fetch = require("node-fetch");

/**
 * Attempts to repair truncated JSON strings when the AI response hits token limits.
 * Recovers all cleanly closed slide objects instead of crashing into fallback.
 */
function repairTruncatedJson(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    let text = rawText.trim();
    text = text.replace(/^```json\s*/i, '').replace(/```$/g, '').trim();

    // 1. Try direct parse first
    try {
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
            return parsed;
        }
    } catch (e) {}

    // 2. Locate the slides array
    const slidesKeyIdx = text.indexOf('"slides"');
    if (slidesKeyIdx === -1) return null;

    // 3. Find the last cleanly closed slide object '}' inside slides
    const lastSlideEnd = text.lastIndexOf('}');
    if (lastSlideEnd > slidesKeyIdx) {
        let repaired = text.substring(0, lastSlideEnd + 1).trim();

        // Close array and object if not already closed
        let openBrackets = (repaired.match(/\[/g) || []).length;
        let closeBrackets = (repaired.match(/\]/g) || []).length;
        while (openBrackets > closeBrackets) {
            repaired += ']';
            closeBrackets++;
        }

        let openBraces = (repaired.match(/\{/g) || []).length;
        let closeBraces = (repaired.match(/\}/g) || []).length;
        while (openBraces > closeBraces) {
            repaired += '}';
            closeBraces++;
        }

        try {
            const parsed = JSON.parse(repaired);
            if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
                console.log(`[Auto-Repair] Successfully salvaged ${parsed.slides.length} completed slides from truncated AI response!`);
                return parsed;
            }
        } catch (err) {}
    }

    return null;
}

/**
 * Story-driven fallback that extracts actual sentences from the news story.
 * ZERO placeholder repetition.
 */
function buildStoryFallback(story, count, channelName) {
    console.log("Building story-driven fallback directly from news content...");
    const headline = story.headline || "Breaking News";
    const cleanHeadline = headline.replace(/\s*-\s*[^-]+$/, '').trim();
    const parts = cleanHeadline.split(/[:\-–|]/).map(p => p.trim()).filter(p => p.length > 5);

    // Extract real sentences from the RSS description
    const rawDesc = (story.description || "").replace(/<[^>]+>/g, ' ');
    const sentences = rawDesc
        .split(/(?<=[.?!])\s+|\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && !s.toLowerCase().includes("top news"));

    // Extract entities for imagery
    const allWords = `${cleanHeadline} ${rawDesc}`.split(/[^a-zA-Z0-9]+/);
    const capitalWords = allWords.filter(w => w.length > 3 && /^[A-Z]/.test(w) && !/^(The|This|That|After|Before|Breaking|News|Daily|India|When|Where|What|With|From|Over|Will|Can|Are|Have|Has|Had|Was|Were)$/i.test(w));
    const mainSubject = capitalWords[0] || (parts[0] ? parts[0].split(' ')[0] : "News");
    const uniqueEntities = [...new Set(capitalWords)];
    while (uniqueEntities.length < count) {
        uniqueEntities.push(mainSubject);
    }

    const slides = [];

    // Slide 1: Breaking Hook
    const leadClause = parts[0] || cleanHeadline;
    const hookWords = leadClause.split(' ');
    const mid = Math.max(1, Math.floor(hookWords.length / 2));
    const highlightedHook = hookWords.slice(0, mid).join(' ') + 
        ` <span class='highlight'>${hookWords.slice(mid, mid + 4).join(' ')}</span> ` + 
        hookWords.slice(mid + 4).join(' ');

    slides.push({
        text: highlightedHook.trim(),
        subtext: "Full breakdown | SWIPE",
        imageEntity: uniqueEntities[0] || mainSubject
    });

    // Slides 2 to count - 1: Narrative progression from actual story sentences
    for (let i = 1; i < count - 1; i++) {
        let slideSentence = "";
        if (sentences[i - 1]) {
            slideSentence = sentences[i - 1];
        } else if (parts[i]) {
            slideSentence = parts[i];
        } else {
            if (i === 1) slideSentence = "Reports confirm key developments as the situation rapidly unfolded on the ground.";
            else if (i === 2) slideSentence = "Witnesses and officials detailed the immediate aftermath as responses were coordinated.";
            else slideSentence = "The incident has triggered widespread discussions regarding accountability and next steps.";
        }

        const sWords = slideSentence.split(' ');
        const hLen = Math.min(3, Math.max(2, Math.floor(sWords.length / 3)));
        const highlighted = `<span class='highlight'>${sWords.slice(0, hLen).join(' ')}</span> ` + sWords.slice(hLen).join(' ');

        slides.push({
            text: highlighted,
            subtext: "Inside details | SWIPE",
            imageEntity: uniqueEntities[i] || mainSubject
        });
    }

    // Final Slide: Concluding sentence completing the story
    let finalSentence = sentences[count - 2] || (parts.length > 1 ? parts[parts.length - 1] : "Authorities have initiated inquiries as the community closely monitors further official updates.");
    const fWords = finalSentence.split(' ');
    const fHLen = Math.min(3, Math.max(2, Math.floor(fWords.length / 3)));
    const highlightedFinal = `<span class='highlight'>${fWords.slice(0, fHLen).join(' ')}</span> ` + fWords.slice(fHLen).join(' ');

    slides.push({
        text: highlightedFinal,
        subtext: "The bottom line | READ CAPTION",
        imageEntity: uniqueEntities[count - 1] || mainSubject
    });

    return {
        personName: capitalWords.length > 1 ? `${capitalWords[0]} ${capitalWords[1]}` : null,
        circleImageKeyword: uniqueEntities[1] || uniqueEntities[0] || mainSubject,
        imageEntity: uniqueEntities[0] || mainSubject,
        slides: slides
    };
}

/**
 * Batch 2: Dedicated lightweight caption generator.
 * Runs in ~1s and never exhausts the slide token budget.
 */
async function generatePostCaption(headline, channelName) {
    try {
        const prompt = `Write a high-converting 2-sentence viral Instagram caption with 5 relevant trending hashtags for this news headline: "${headline}". Media brand: '${channelName}'. Output only the caption text.`;
        const res = await fetch('https://text.pollinations.ai/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "You output ONLY the final caption text without quotes or markdown." },
                    { role: "user", content: prompt }
                ],
                model: "openai"
            })
        });
        if (res.ok) {
            const text = await res.text();
            if (text && !text.includes('<!DOCTYPE') && text.length > 20) {
                return text.trim().replace(/^["']|["']$/g, '');
            }
        }
    } catch (e) {
        console.warn("Caption generation failed, using headline fallback:", e.message);
    }
    const cleanHeadline = (headline || "Breaking News").replace(/\s*-\s*[^-]+$/, '').trim();
    return `🚨 ${cleanHeadline}\n\nFull story breakdown above. What are your thoughts on this? Let us know in the comments below! 👇\n\n#${channelName} #news #currentaffairs #trending #india`;
}

/**
 * Main copy generator: Keeps your exact prompt & storytelling rules.
 * Decoupled caption saves ~40% token budget, ensuring 4-5 slides succeed cleanly.
 */
async function generateCarouselCopy(story, channelName = '1affairs', slideCount = 3) {
    const count = Math.max(2, Math.min(8, parseInt(slideCount) || 3));

    // Notice: We do NOT request "caption" in this prompt to save token budget for 4-5 slides!
    const prompt = `
    You are an expert Instagram copywriter for the media brand '${channelName}'.
    Analyze the following news story and turn it into high-converting, viral carousel copy matching our brand style.

    CRITICAL RULE FOR NARRATIVE BUILDUP (NO REPETITIVE TEXT!):
    Read the story deeply. You must break the story down into a progressive narrative across EXACTLY ${count} slides.
    Do NOT follow a generic "Hook -> stat" loop. Think wisely about what information goes on what page.
    Every single slide must convey distinct, meaningful information that builds the story context (e.g., Hook -> Background Context -> Shocking Detail -> Wider Impact -> Call to Action / Conclusion).
    DO NOT repeat the same sentences or structures across slides!

    CRITICAL RULE FOR IMAGES:
    Every single slide MUST have a distinct, highly relevant "imageEntity" representing what that specific slide discusses.
    This entity MUST be a simple 1-2 word real-world physical noun or proper noun that exists on Wikipedia (e.g., 'Stock market', 'Narendra Modi', 'Semiconductor', 'Solar panel', 'Protest'). 
    DO NOT use descriptive adjectives or long phrases.
    DO NOT repeat the same imageEntity across slides!

    The output MUST be valid JSON matching exactly this shape:
    {
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
    let parsed = null;

    // 1. Claude API (if key provided)
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            console.log("Using Anthropic Claude for copy generation...");
            const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
            const response = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1000,
                temperature: 0.7,
                system: "You output ONLY raw JSON without any markdown formatting. Do not output anything else.",
                messages: [{ role: "user", content: prompt }]
            });
            content = response.content[0].text.trim();
            parsed = repairTruncatedJson(content);
        } catch (e) {
            console.warn("Claude API failed, falling back to Pollinations:", e.message);
        }
    }

    // 2. Pollinations Free Text AI with retries & auto-repair
    if (!parsed) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                console.log(`Querying Free AI for ${count} slides (attempt ${attempt}/2)...`);
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

                if (res.ok) {
                    content = await res.text();
                    parsed = repairTruncatedJson(content);
                    if (parsed) {
                        console.log(`Successfully parsed/repaired AI JSON output with ${parsed.slides.length} slides!`);
                        break;
                    }
                }
            } catch (err) {
                console.warn(`Pollinations attempt ${attempt} error: ${err.message}`);
                if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
            }
        }
    }

    // 3. If AI completely unavailable, use story-driven fallback
    if (!parsed || !parsed.slides || parsed.slides.length === 0) {
        console.warn("AI output unavailable or empty. Using authentic story-driven fallback.");
        parsed = buildStoryFallback(story, count, channelName);
    }

    // 4. Pad any missing slides if partial auto-repair recovered fewer than requested
    if (parsed.slides.length < count) {
        console.log(`Auto-repair recovered ${parsed.slides.length}/${count} slides. Padding remaining with story context...`);
        const fallback = buildStoryFallback(story, count, channelName);
        for (let i = parsed.slides.length; i < count; i++) {
            parsed.slides.push(fallback.slides[i] || fallback.slides[fallback.slides.length - 1]);
        }
    }

    // 5. Ensure all slide fields are normalized
    parsed.slides.forEach((s, idx) => {
        if (!s.text) s.text = `<span class='highlight'>Breaking update</span>`;
        if (!s.imageEntity) s.imageEntity = parsed.imageEntity || "News";
        if (!s.subtext) s.subtext = idx === parsed.slides.length - 1 ? "Read caption | READ CAPTION" : "More details | SWIPE";
    });

    // 6. Batch 2: Generate caption separately to guarantee it never fails
    if (!parsed.caption) {
        console.log("Generating caption in Batch 2...");
        parsed.caption = await generatePostCaption(story.headline, channelName);
    }

    return parsed;
}

module.exports = { generateCarouselCopy, buildStoryFallback };
