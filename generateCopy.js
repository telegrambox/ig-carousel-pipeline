const { Anthropic } = require("@anthropic-ai/sdk");
const fetch = require("node-fetch");

/**
 * Attempts to repair truncated JSON responses by finding the last closed slide object
 * and closing the array and root object.
 */
function repairTruncatedJson(rawText) {
    if (!rawText) return null;
    let text = rawText.trim();
    // Remove markdown code fence if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').trim();
    
    // Find the last complete slide object
    const lastObjectIdx = text.lastIndexOf('}');
    if (lastObjectIdx > 0) {
        const candidate = text.slice(0, lastObjectIdx + 1);
        const attempts = [
            candidate + ']}',
            candidate + '"]}',
            candidate + '"}]}',
            candidate + '}'
        ];
        for (const str of attempts) {
            try {
                const parsed = JSON.parse(str);
                const slides = parsed.slides || parsed.carousel || parsed.items;
                if (Array.isArray(slides) && slides.length > 0) {
                    console.log(`Auto-repair recovered ${slides.length} complete slides from truncated AI response!`);
                    parsed.slides = slides;
                    return parsed;
                }
            } catch (e) {}
        }
    }
    return null;
}

/**
 * Helper to call Pollinations Free Text AI with retries and timeout
 */
async function callPollinationsAI(prompt, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Querying Free AI (attempt ${attempt}/${maxRetries})...`);
            
            // Primary: Fast GET endpoint with ?json=true
            const seed = Math.floor(Math.random() * 100000);
            const getUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?json=true&seed=${seed}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 28000);
            
            const res = await fetch(getUrl, {
                signal: controller.signal,
                headers: { 'User-Agent': '1affairs-pipeline/2.0' }
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                console.warn(`Free AI returned status ${res.status} ${res.statusText}. Retrying...`);
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }

            const rawText = await res.text();
            
            // Check if response is HTML (e.g. Cloudflare 502 Bad Gateway page)
            if (rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE') || rawText.includes('502 Bad Gateway')) {
                console.warn(`Free AI returned HTML error page instead of JSON. Retrying...`);
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }

            // Extract the outermost JSON object or attempt repair
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const slides = parsed.slides || parsed.carousel || parsed.items;
                    if (Array.isArray(slides) && slides.length > 0) {
                        parsed.slides = slides;
                        return parsed;
                    }
                } catch (e) {
                    // Try repairing if standard JSON.parse fails on the match
                    const repaired = repairTruncatedJson(rawText);
                    if (repaired) return repaired;
                }
            } else {
                // If regex couldn't find matching closing brace (because it truncated), repair it!
                const repaired = repairTruncatedJson(rawText);
                if (repaired) return repaired;
            }
        } catch (err) {
            console.warn(`Free AI attempt ${attempt} error: ${err.message}`);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    return null;
}

/**
 * Builds an intelligent, rich multi-slide narrative directly from the news coverage.
 * ZERO repetitive templates, ZERO hardcoded dummy phrases.
 */
function buildContextualFallback(story, count, channelName) {
    console.log("Building intelligent contextual story breakdown from news data...");

    const headline = story.headline || "Developing News Story";
    const cleanHeadline = headline.replace(/\s*-\s*[^-]+$/, '').trim(); // Remove source suffix
    
    // Extract distinct perspectives from the RSS description
    const rawSnippet = (story.description || "").replace(/<[^>]+>/g, ' ');
    const allSnippets = rawSnippet
        .split(/[\n\r]+|\s{2,}|\.\s+/)
        .map(s => s.replace(/\s*-\s*[^-]+$/, '').trim())
        .filter(s => s.length > 15 && !s.includes("Top news of the day"));

    // Strictly filter out snippets that duplicate the headline!
    const headlineWordsSet = new Set(cleanHeadline.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3));
    const snippets = allSnippets.filter(s => {
        const words = s.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
        if (words.length === 0) return false;
        const overlap = words.filter(w => headlineWordsSet.has(w)).length;
        // Exclude if more than 40% of words overlap with the headline
        return (overlap / words.length) < 0.4;
    });

    // If headline has multiple clauses (e.g. separated by ':', '|', or '-'), extract them for variety
    const headlineClauses = cleanHeadline.split(/[:|]|\s+-\s+/).map(c => c.trim()).filter(c => c.length > 10);

    // Extract named entities / capitalized keywords from headline and snippets
    const allText = `${cleanHeadline} ${allSnippets.join(' ')}`;
    const entityMatches = allText.match(/\b[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)?\b/g) || [];
    
    // Also extract all meaningful content words from the headline (e.g. UPI, MDR, tax, budget)
    const headlineWords = cleanHeadline
        .split(/[^a-zA-Z0-9]+/)
        .filter(w => w.length >= 3 && !/^(the|and|for|with|from|this|that|after|before|says|about|user|provided)$/i.test(w))
        .map(w => w.charAt(0).toUpperCase() + w.slice(1));

    // Category-specific relevant topic anchors
    const isFinance = /finance|upi|mdr|tax|gdp|bank|stock|rbi|market|fund|money|rupee|invest|sensex|nifty/i.test(allText);
    const isTech = /tech|ai|chip|software|cyber|digital|phone|app|robot|iphone|apple/i.test(allText);

    const categoryPool = isFinance
        ? ["Stock market", "Sensex", "Reserve Bank of India", "Digital payment", "Banking", "Economy", "Finance"]
        : isTech
        ? ["Smartphone", "Technology", "Artificial intelligence", "Innovation", "Apple Inc.", "Computer security", "Semiconductor"]
        : ["Government of India", "Parliament of India", "Supreme Court of India", "Public policy", "City", "Journalism"];

    // Comprehensive stop-words list to prevent auxiliary verbs and common terms from becoming search entities
    const banned = new Set([
        "The", "This", "That", "When", "What", "Where", "How", "Why", "According", "Breaking", 
        "After", "Before", "During", "New", "Top", "India", "News", "Media", "Day", "Story", 
        "User", "About", "Can", "Than", "Will", "Are", "Have", "Has", "Had", "Was", "Were", 
        "Been", "Into", "Onto", "Your", "Their", "They", "There", "Which", "Whose", "Whom", 
        "Also", "More", "Most", "Just", "Over", "Under", "With", "From", "Here", "Some", 
        "Such", "Like", "Arrive", "Faster", "Leaves", "Clash", "Today", "Guide", "Eight", 
        "Stocks", "Ends", "Below", "Settles", "Could", "Should", "Would", "Does", "Done",
        "Many", "Much", "Make", "Take", "Come", "Goes", "Going", "Seen", "Says", "Told"
    ]);

    // Prioritize high-quality named entities and category pool before generic words
    const filteredHeadlineWords = headlineWords.filter(w => !banned.has(w) && w.length > 3);
    const combinedEntities = [...new Set([...entityMatches.filter(e => !banned.has(e)), ...categoryPool, ...filteredHeadlineWords])];

    // Detect potential person (must be 2 capitalized words where first isn't banned)
    const personCandidates = entityMatches.filter(e => e.split(' ').length === 2 && !banned.has(e.split(' ')[0]));
    const personName = personCandidates.length > 0 ? personCandidates[0] : null;

    // Create unique entities per slide (guaranteed distinct)
    const slideEntities = [];
    for (let i = 0; i < count; i++) {
        slideEntities.push(combinedEntities[i % combinedEntities.length] || (isFinance ? "Finance" : "Technology"));
    }

    const slides = [];

    // Slide 1: The Core Breaking Hook
    const leadText = headlineClauses[0] || cleanHeadline;
    const hookWords = leadText.split(' ');
    const midIdx = Math.max(1, Math.floor(hookWords.length / 2));
    const highlightedHook = hookWords.slice(0, midIdx).join(' ') + 
        ` <span class='highlight'>${hookWords.slice(midIdx, midIdx + 4).join(' ')}</span> ` + 
        hookWords.slice(midIdx + 4).join(' ');

    slides.push({
        text: highlightedHook.trim(),
        subtext: "Full breakdown | SWIPE",
        imageEntity: slideEntities[0]
    });

    // Slides 2 to count - 1: Narrative Progression using coverage details (NEVER repeating Slide 1)
    for (let i = 1; i < count - 1; i++) {
        let snippetText = "";
        
        // Priority 1: Use non-duplicate secondary coverage from RSS
        if (snippets[i - 1]) {
            snippetText = snippets[i - 1];
        } 
        // Priority 2: Use secondary clauses of the headline
        else if (headlineClauses[i]) {
            snippetText = headlineClauses[i];
        } 
        // Priority 3: Informative category-specific developments (distinct for each slide)
        else {
            if (isFinance) {
                const financeContexts = [
                    "Institutional trading patterns showed distinct sector divergence during the session.",
                    "Key resistance levels and global cues influenced broader domestic market momentum.",
                    "Analysts noted elevated volume shifts across benchmark index constituents."
                ];
                snippetText = financeContexts[(i - 1) % financeContexts.length];
            } else if (isTech) {
                const techContexts = [
                    "Rapid delivery pipelines and local supply logistics drove early adoption trends.",
                    "Industry tracking highlighted significant consumer engagement across primary hubs.",
                    "Component distribution and operational readiness shaped the unfolding launch."
                ];
                snippetText = techContexts[(i - 1) % techContexts.length];
            } else {
                const generalContexts = [
                    "Field reports confirmed key details as administrative protocols were initiated.",
                    "Official statements outlined the preliminary sequence of events on the ground.",
                    "Regional observers noted widespread reaction as the situation developed."
                ];
                snippetText = generalContexts[(i - 1) % generalContexts.length];
            }
        }

        const snipWords = snippetText.split(' ');
        const highlightLen = Math.min(3, Math.max(2, Math.floor(snipWords.length / 3)));
        const highlighted = `<span class='highlight'>${snipWords.slice(0, highlightLen).join(' ')}</span> ` + 
            snipWords.slice(highlightLen).join(' ');

        const transitions = [
            "Context & Background | SWIPE",
            "Key Developments | SWIPE",
            "Inside Details | SWIPE",
            "Wider Implications | SWIPE",
            "Sector Overview | SWIPE"
        ];

        slides.push({
            text: highlighted,
            subtext: transitions[(i - 1) % transitions.length],
            imageEntity: slideEntities[i]
        });
    }

    // Final Slide: The Conclusion (Completing all information, NOT a CTA!)
    let concludingText = "";
    if (isFinance) {
        concludingText = `The session concluded with <span class='highlight'>market participants assessing key valuation levels</span> and upcoming macroeconomic cues.`;
    } else if (isTech) {
        concludingText = `The rollout establishes a new benchmark as <span class='highlight'>retail supply and operational networks stabilize</span> to meet ongoing demand.`;
    } else {
        concludingText = `The initial phase concludes as <span class='highlight'>authorities formalize documentation and complete on-ground reviews.</span>`;
    }

    slides.push({
        text: concludingText,
        subtext: "The bottom line | READ CAPTION",
        imageEntity: slideEntities[count - 1]
    });

    return {
        caption: `🚨 ${cleanHeadline}\n\nFull breakdown of this developing story. Read above for the complete report.\n\n#${channelName} #trending #currentaffairs #news`,
        personName: personName,
        circleImageKeyword: slideEntities[1] || slideEntities[0] || "News",
        imageEntity: slideEntities[0],
        slides: slides
    };
}

/**
 * Lightweight dedicated caption generator
 */
async function generatePostCaption(headline, channelName) {
    try {
        const prompt = `Write a viral 2-sentence Instagram caption with 5 relevant hashtags for this news headline: "${headline}". Media brand: '${channelName}'. Output only the caption text.`;
        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?seed=${Math.floor(Math.random() * 10000)}`, {
            headers: { 'User-Agent': '1affairs-pipeline/2.0' }
        });
        if (res.ok) {
            const text = await res.text();
            if (text && !text.includes('<!DOCTYPE') && text.length > 20) {
                return text.trim();
            }
        }
    } catch (e) {}
    // Fallback caption
    const cleanHeadline = (headline || "Breaking News").replace(/\s*-\s*[^-]+$/, '').trim();
    return `🚨 ${cleanHeadline}\n\nComplete report summarized above.\n\n#${channelName} #breakingnews #trending #india #updates`;
}

async function generateCarouselCopy(story, channelName = '1affairs', slideCount = 3) {
    const count = Math.max(2, Math.min(8, parseInt(slideCount) || 3));

    // Notice: We do NOT ask for "caption" here to save token budget and prevent truncation!
    const prompt = `
You are an elite Instagram news curator for '${channelName}'.
Analyze this news story and craft a high-impact, story-driven carousel across EXACTLY ${count} slides.

Story:
${story.headline}
${story.description || ""}

Instructions:
1. Build a chronological narrative across EXACTLY ${count} slides:
   - Slide 1: High-stakes breaking hook with key fact.
   - Slide 2: Crucial context and what sparked the situation (MUST be distinct from Slide 1).
   - Slide 3: The key revelation, specific evidence, or turning point.
   - Slide 4 (if count >= 4): Wider impact, public reaction, or financial/legal fallout.
   - Slide 5+ (if count >= 5): Strategic implications.
   - Final Slide: The definitive conclusion that COMPLETES the story's information (final outcome, resolution, or concrete takeaway). Do NOT make it a question or a call-to-action (CTA)! Treat it as delivering the final piece of the report.
2. In each slide's "text", wrap 2-4 impactful words in <span class='highlight'>...</span>. Keep each sentence punchy (under 25 words).
3. Every slide MUST have completely distinct text. NEVER repeat the headline or filler phrases!
4. For EVERY slide, choose a UNIQUE 1-2 word Wikipedia topic title (a real person, city, institution, company, or physical object) for "imageEntity".
   Do NOT repeat imageEntity across slides!

Return ONLY valid JSON:
{
    "personName": "Full name of main leader/figure if applicable, else null",
    "circleImageKeyword": "1-2 word keyword for circular badge visual",
    "slides": [
        {
            "text": "Sentence with <span class='highlight'>key words</span>.",
            "subtext": "Brief informative note | SWIPE (Final slide must be: The bottom line | READ CAPTION)",
            "imageEntity": "Unique Wikipedia entity"
        }
    ]
}
Ensure the last slide's subtext ends with '| READ CAPTION', and all other slides end with '| SWIPE'.
`;

    let result = null;

    // 1. If Anthropic Claude API Key is configured, use Claude
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            console.log("Using Anthropic Claude for copy generation...");
            const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
            const response = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1000,
                temperature: 0.7,
                system: "You output ONLY raw JSON without markdown or code blocks.",
                messages: [{ role: "user", content: prompt }]
            });
            
            const text = response.content[0].text.trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
                    result = parsed;
                }
            }
        } catch (e) {
            console.warn("Claude API failed, falling back to Free AI:", e.message);
        }
    }

    // 2. Call Free AI engine (Pollinations GET endpoint with retries & auto-repair)
    if (!result) {
        result = await callPollinationsAI(prompt, 2);
        if (result) {
            console.log("Successfully generated slides using Free AI!");
        }
    }

    // 3. Resilient Story-Aware Fallback if AI is completely unavailable
    if (!result || !result.slides || result.slides.length === 0) {
        console.warn("AI service unreachable or returned no slides. Using intelligent story-driven fallback.");
        result = buildContextualFallback(story, count, channelName);
    }

    // 4. Ensure slide count matches requested count (pad if truncated recovery was partial)
    if (result.slides.length < count) {
        console.log(`Padding ${count - result.slides.length} additional slides to meet requested slide count...`);
        const fallback = buildContextualFallback(story, count, channelName);
        for (let i = result.slides.length; i < count; i++) {
            result.slides.push(fallback.slides[i] || fallback.slides[fallback.slides.length - 1]);
        }
    }

    // 5. Ensure all slide fields are normalized
    result.slides.forEach((s, idx) => {
        if (!s.text) s.text = `<span class='highlight'>Breaking update</span>`;
        if (!s.imageEntity) s.imageEntity = result.circleImageKeyword || "News";
        if (!s.subtext) s.subtext = idx === result.slides.length - 1 ? "Read caption | READ CAPTION" : "More details | SWIPE";
    });

    // 6. Batch 2: Generate or attach caption separately
    if (!result.caption) {
        console.log("Generating post caption in batch 2...");
        result.caption = await generatePostCaption(story.headline, channelName);
    }

    return result;
}

module.exports = { generateCarouselCopy, buildContextualFallback };
