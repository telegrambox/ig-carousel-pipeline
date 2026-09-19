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

    // Extract real sentences from the context or RSS description
    const fullText = story.contextText || story.description || "";
    const rawDesc = fullText.replace(/<[^>]+>/g, ' ');
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
        imageEntity: uniqueEntities[0] || mainSubject,
        keywordSuggestions: [uniqueEntities[0] || "News", uniqueEntities[1] || "Report"]
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
            imageEntity: uniqueEntities[i] || mainSubject,
            keywordSuggestions: [uniqueEntities[i] || "Update", uniqueEntities[0] || "News"]
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
        imageEntity: uniqueEntities[count - 1] || mainSubject,
        keywordSuggestions: [uniqueEntities[count - 1] || "Conclusion", "News"]
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
async function generatePostCaption(headline, channelName, contextText = "") {
    try {
        const brief = contextText ? `Context: ${contextText.slice(0, 300)}...` : "";
        const prompt = `Write a high-converting 2-sentence viral Instagram caption with 5 relevant trending hashtags for this news headline: "${headline}". ${brief} Media brand: '${channelName}'. Output only the caption text.`;
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
 * Main copy generator: Supports full context summaries, dynamic slide counts,
 * comprehensive story segmentation, and niche-aware image entities.
 */
async function generateCarouselCopy(story, channelName = '1affairs', slideCount = 3) {
    const count = Math.max(2, Math.min(8, parseInt(slideCount) || 3));
    const fullStoryContext = story.contextText || story.description || "";

    const isStructured = /(?:^|\n)\s*(?:(?:Slide|Page)\s*\d+\s*[:\-.]?|\d+[\.)])/i.test(fullStoryContext);
    if (isStructured) {
        console.log("Detected pre-structured slides in context for default carousel. Parsing directly...");
        const slideBlocks = fullStoryContext.split(/(?:^|\n+)\s*(?:(?:Slide|Page)\s*\d+\s*[:\-.]?|\d+[\.)])\s*/i).filter(b => b.trim().length > 0);
        const slides = [];
        const isDirectImage = (u) => /\.(jpe?g|png|webp|gif|avif)($|\?)/i.test(u) || u.includes('/wp-content/') || u.includes('/images/') || u.includes('/img/') || u.includes('/thumb/');

        slideBlocks.forEach((block, idx) => {
            let cleanBlock = block.replace(/^[\s:\-.]+/, '').trim();
            const lines = cleanBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let textLines = [];
            let imageEntity = "";
            let imageUrl = "";
            let backupImageUrl = "";

            lines.forEach(line => {
                if (/^(?:image|keyword|visual|photo|bg|background|img)\s*[:\-=\.]\s*/i.test(line)) {
                    let rawImg = line.replace(/^(?:image|keyword|visual|photo|bg|background|img)\s*[:\-=\.]\s*/i, '').trim();
                    const urls = rawImg.match(/https?:\/\/[^\s"'>,;|]+/gi) || [];
                    if (urls.length > 0) {
                        for (const u of urls) {
                            if (!imageUrl) imageUrl = u;
                            else if (!backupImageUrl && u !== imageUrl) backupImageUrl = u;
                        }
                    } else if (!imageEntity) {
                        imageEntity = rawImg.replace(/^["']|["']$/g, '').trim();
                    }
                } else if (/^(?:backup|alt|secondary|fallback)\s*(?:image|url|img|photo|visual|link)?\s*[:\-=\.]\s*/i.test(line)) {
                    let rawBackup = line.replace(/^(?:backup|alt|secondary|fallback)\s*(?:image|url|img|photo|visual|link)?\s*[:\-=\.]\s*/i, '').trim();
                    const bUrls = rawBackup.match(/https?:\/\/[^\s"'>,;|]+/gi) || [];
                    if (bUrls.length > 0) backupImageUrl = bUrls[0];
                } else {
                    const bareUrls = line.match(/^https?:\/\/[^\s"'>,;|]+$/i);
                    if (bareUrls) {
                        if (!imageUrl) imageUrl = bareUrls[0];
                        else if (!backupImageUrl && bareUrls[0] !== imageUrl) backupImageUrl = bareUrls[0];
                    } else {
                        textLines.push(line);
                    }
                }
            });

            if (backupImageUrl && isDirectImage(backupImageUrl) && !isDirectImage(imageUrl)) {
                const tmp = imageUrl;
                imageUrl = backupImageUrl;
                backupImageUrl = tmp;
            }

            let headline = textLines[0] || "News Update";
            if (!headline.includes("<span class='highlight'>") && !headline.includes('<span class="highlight">')) {
                const words = headline.split(' ');
                if (words.length > 4) {
                    headline = words.slice(0, 2).join(' ') + ` <span class='highlight'>${words.slice(2, 5).join(' ')}</span> ` + words.slice(5).join(' ');
                }
            }

            let fullText = headline;
            if (textLines.length > 1) {
                const details = textLines.slice(1).join(' ');
                fullText += `<br><span style="display:inline-block; margin-top:8px; font-size:0.82em; color:#d4d4d8; font-weight:700;">${details}</span>`;
            }

            let fallbackKeyword = "News";
            const cleanHead = headline.replace(/<[^>]+>/g, '').replace(/[:\-–|]/g, ' ').trim();
            const headWords = cleanHead.split(/\s+/).filter(w => w.length > 3 && !/^(about|after|before|several|nearly|amid|across|official|underway|their|there)$/i.test(w));
            if (headWords.length > 0) fallbackKeyword = headWords.slice(0, 3).join(' ');

            if (!imageEntity || imageEntity.startsWith('http') || imageEntity === 'News') {
                imageEntity = fallbackKeyword;
            }

            slides.push({
                text: fullText.trim(),
                subtext: (idx === slideBlocks.length - 1 ? "The bottom line | READ CAPTION" : "Inside details | SWIPE"),
                imageEntity: imageEntity.trim(),
                imageUrl: imageUrl.trim(),
                backupImageUrl: backupImageUrl.trim(),
                keywordSuggestions: [fallbackKeyword, "News"]
            });
        });

        return {
            personName: null,
            circleImageKeyword: slides[0]?.imageEntity || "News",
            imageEntity: slides[0]?.imageEntity || "News",
            slides: slides
        };
    }

    const prompt = `
    You are an expert Instagram copywriter for the media brand '${channelName}'.
    Analyze the following news story and turn it into high-converting, viral carousel copy matching our brand style across EXACTLY ${count} slides.

    CRITICAL PACING & EQUAL INFORMATION DISTRIBUTION RULES:
    1. SLIDE 1 MUST BE DEFINITELY JUST A HOOK (NO STORY DUMPING):
       - Slide 1 text MUST be strictly 14 to 22 words total (1 or 2 punchy, curiosity-inducing sentences maximum).
       - It must serve SOLELY as an irresistible, shocking hook or breaking headline.
       - NEVER dump facts, explanations, or background context on Slide 1. Keep it clean, dramatic, and focused only on the core event.
       - Wrap the single most striking hook/claim in <span class='highlight'>bold hook</span>.

    2. SLIDES 2 TO ${count} MUST HAVE EQUAL LENGTH & EQUAL INFORMATION WEIGHT:
       - ${fullStoryContext ? `Divide the full story context into EXACTLY ${count - 1} equal, chronological narrative pieces across Slides 2 to ${count}. Ensure all information is distributed evenly across each slide with zero repetition and zero missing facts.` : `Divide the narrative context, key facts, numbers, and developments into ${count - 1} equal, balanced pieces across Slides 2 to ${count}.`}
       - STRICT REQUIREMENT: Each slide from Slide 2 to Slide ${count} MUST have roughly the SAME word count (~25 to 35 words, exactly 2 well-formed sentences per slide).
       - STRICTLY FORBIDDEN: Do NOT cram or dump all facts into Slide 2 or 3! Distribute the narrative evenly across all slides so no slide feels overloaded and no slide feels empty.
       - Slide 2: The catalyst / what sparked the event and immediate background.
       ${count > 3 ? `- Slides 3 to ${count - 1}: The core numbers, turning points, official responses, and direct consequences distributed evenly across these slides.\n` : ''}- Slide ${count}: The final outcome, ongoing status, or concluding takeaway completing the entire story (treat it as completing all story information, not a generic goodbye or CTA).
       - In EVERY slide, wrap 2-4 impactful words in <span class='highlight'>highlight words</span>.

    CRITICAL RULE FOR NICHE-AWARE IMAGES:
    For EVERY slide, choose a UNIQUE 1-2 word Wikipedia topic title for "imageEntity" representing what that specific slide discusses.
    CRITICAL: It MUST remain strictly anchored to the core niche and cultural/geographic setting of the story (e.g. if the story is about an Indian student election clash, use entities like 'Delhi University', 'Student protest', 'Police van', 'Supreme Court of India', NOT generic global photos).
    Also provide 2 alternative keyword suggestions in "keywordSuggestions" for each slide.

    The output MUST be valid JSON matching exactly this shape:
    {
        "personName": "Full name of main person/leader if applicable, else null",
        "circleImageKeyword": "1-2 word keyword for circular badge visual",
        "imageEntity": "1-2 word Wikipedia entity for slide 1",
        "slides": [
            {
                "text": "The main hook or story detail here. Wrap the most striking stat/claim in <span class='highlight'>bold claim here</span>.",
                "subtext": "A brief supporting thought. | SWIPE",
                "imageEntity": "Specific 1-2 word Wikipedia entity for THIS slide",
                "keywordSuggestions": ["Alternative 1", "Alternative 2"]
            }
        ]
    }
    Generate EXACTLY ${count} slides. The last slide's subtext must end with '| READ CAPTION', all other slides must end with '| SWIPE'.
    
    News Story:
    Headline: ${story.headline}
    ${fullStoryContext ? `Detailed Context / Full Story:\n${fullStoryContext}` : ""}
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
        if (!s.keywordSuggestions || !Array.isArray(s.keywordSuggestions)) {
            s.keywordSuggestions = [s.imageEntity, "News"];
        }
    });

    // 6. Batch 2: Generate caption separately
    if (!parsed.caption) {
        console.log("Generating caption in Batch 2...");
        parsed.caption = await generatePostCaption(story.headline, channelName, fullStoryContext);
    }

    return parsed;
}

/**
 * Copy generator for the "Daily News" template:
 * Slide 1: Cover Page (What Happened in India - Last 24 Hours in 60 Seconds)
 * Slides 2 to N-1: Distinct Indian news events from the last 24h
 * Slide N: Final CTA slide
 */
async function generateDailyNewsCopy(options = {}) {
    const {
        story = {},
        bulletins = [],
        channelName = '1affairs',
        slideCount = 5,
        coverStyle = 'styleA',
        topicMode = 'auto'
    } = options;

    const totalSlides = Math.max(3, Math.min(10, parseInt(slideCount) || 5));
    const secondaryCount = totalSlides - 2; // e.g. 5 - 2 = 3 secondary slides

    // 0. Auto-detect if user passed pre-structured slides (e.g. "Slide 1 : ... Image : ...")
    const rawContext = story.contextText || story.description || "";
    const isStructured = /(?:^|\n)\s*(?:(?:Slide|Page)\s*\d+\s*[:\-.]?|\d+[\.)])/i.test(rawContext);
    if (isStructured) {
        console.log("Detected pre-structured slides in context. Parsing directly without AI hallucination...");
        const slideBlocks = rawContext.split(/(?:^|\n+)\s*(?:(?:Slide|Page)\s*\d+\s*[:\-.]?|\d+[\.)])\s*/i).filter(b => b.trim().length > 0);
        const slides = [];
        const isDirectImage = (u) => /\.(jpe?g|png|webp|gif|avif)($|\?)/i.test(u) || u.includes('/wp-content/') || u.includes('/images/') || u.includes('/img/') || u.includes('/thumb/');

        slideBlocks.forEach((block, idx) => {
            let cleanBlock = block.replace(/^[\s:\-.]+/, '').trim();
            const lines = cleanBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let textLines = [];
            let imageEntity = "";
            let imageUrl = "";
            let backupImageUrl = "";

            lines.forEach(line => {
                if (/^(?:image|keyword|visual|photo|bg|background|img)\s*[:\-=\.]\s*/i.test(line)) {
                    let rawImg = line.replace(/^(?:image|keyword|visual|photo|bg|background|img)\s*[:\-=\.]\s*/i, '').trim();
                    const urls = rawImg.match(/https?:\/\/[^\s"'>,;|]+/gi) || [];
                    if (urls.length > 0) {
                        for (const u of urls) {
                            if (!imageUrl) imageUrl = u;
                            else if (!backupImageUrl && u !== imageUrl) backupImageUrl = u;
                        }
                    } else if (!imageEntity) {
                        imageEntity = rawImg.replace(/^["']|["']$/g, '').trim();
                    }
                } else if (/^(?:backup|alt|secondary|fallback)\s*(?:image|url|img|photo|visual|link)?\s*[:\-=\.]\s*/i.test(line)) {
                    let rawBackup = line.replace(/^(?:backup|alt|secondary|fallback)\s*(?:image|url|img|photo|visual|link)?\s*[:\-=\.]\s*/i, '').trim();
                    const bUrls = rawBackup.match(/https?:\/\/[^\s"'>,;|]+/gi) || [];
                    if (bUrls.length > 0) backupImageUrl = bUrls[0];
                } else {
                    const bareUrls = line.match(/^https?:\/\/[^\s"'>,;|]+$/i);
                    if (bareUrls) {
                        if (!imageUrl) imageUrl = bareUrls[0];
                        else if (!backupImageUrl && bareUrls[0] !== imageUrl) backupImageUrl = bareUrls[0];
                    } else {
                        textLines.push(line);
                    }
                }
            });

            if (backupImageUrl && isDirectImage(backupImageUrl) && !isDirectImage(imageUrl)) {
                const tmp = imageUrl;
                imageUrl = backupImageUrl;
                backupImageUrl = tmp;
            }

            let headline = textLines[0] || "News Update";
            if (!headline.includes('class="daily-yellow"') && !headline.includes("class='daily-yellow'")) {
                const words = headline.split(' ');
                if (words.length > 4) {
                    headline = words.slice(0, 2).join(' ') + ` <span class="daily-yellow">${words.slice(2, 5).join(' ')}</span> ` + words.slice(5).join(' ');
                }
            }

            let fullText = headline;
            if (textLines.length > 1) {
                const details = textLines.slice(1).join(' ');
                fullText += `<br><span style="display:inline-block; margin-top:8px; font-size:0.82em; color:#d4d4d8; font-weight:700;">${details}</span>`;
            }

            let fallbackKeyword = "News";
            const cleanHead = headline.replace(/<[^>]+>/g, '').replace(/[:\-–|]/g, ' ').trim();
            const headWords = cleanHead.split(/\s+/).filter(w => w.length > 3 && !/^(about|after|before|several|nearly|amid|across|official|underway|their|there)$/i.test(w));
            if (headWords.length > 0) fallbackKeyword = headWords.slice(0, 3).join(' ');

            if (!imageEntity || imageEntity.startsWith('http') || imageEntity === 'News') {
                imageEntity = fallbackKeyword;
            }

            slides.push({
                template: 'daily_news',
                isCover: false,
                isCta: false,
                channelName: channelName,
                text: fullText.trim(),
                subtext: "",
                imageEntity: imageEntity.trim(),
                imageUrl: imageUrl.trim(),
                backupImageUrl: backupImageUrl.trim(),
                keywordSuggestions: [fallbackKeyword, "News"],
                bgImagePath: ""
            });
        });

        const bulletsList = slides.map((s, idx) => `${idx + 1}. ${s.text.replace(/<[^>]+>/g, '').trim()}`).join('\n\n');
        const caption = `🚨 WHAT HAPPENED IN INDIA - LAST 24 HOURS IN 60 SECONDS 🇮🇳\n\n${bulletsList}\n\nSwipe through the carousel to see the full breakdown! Which story surprised you the most? Drop your reaction below! 👇\n\n#India #DailyNews #CurrentAffairs #${channelName} #BreakingNews #IndiaNews #Headlines`;

        return {
            template: 'daily_news',
            coverStyle: coverStyle || 'styleA',
            personName: null,
            circleImageKeyword: slides[0]?.imageEntity || "India",
            imageEntity: slides[0]?.imageEntity || "India Gate",
            slides: slides,
            caption: caption
        };
    }

    // Prepare story context / bulletin candidates
    let candidateItems = [];
    if (Array.isArray(bulletins) && bulletins.length > 0) {
        candidateItems = bulletins.slice(0, Math.max(secondaryCount, 6));
    } else if (story.contextText || story.description) {
        // Split paragraphs or lines from context
        const rawLines = (story.contextText || story.description)
            .split(/\n+/)
            .map(l => l.trim())
            .filter(l => l.length > 15);
        if (rawLines.length >= secondaryCount) {
            candidateItems = rawLines.map(line => ({ headline: line, description: line }));
        } else {
            candidateItems = [{ headline: story.headline || "Indian National News", description: story.contextText || story.description || "" }];
        }
    } else {
        candidateItems = [{ headline: story.headline || "National News Update", description: "Top development in India today." }];
    }

    const prompt = `
    You are an expert Instagram news editor for '${channelName}' creating a high-engagement "Daily News" carousel.
    The series is titled: "WHAT HAPPENED IN INDIA - LAST 24 HOURS IN 60 SECONDS 🇮🇳 💭".

    We need EXACTLY ${secondaryCount} distinct, high-impact secondary news slides (Slides 2 to ${totalSlides - 1}).
    Each slide covers ONE significant Indian news event from the last 24 hours.

    CRITICAL COPYWRITING RULES FOR SECONDARY NEWS SLIDES:
    1. Each secondary slide text MUST be 18 to 28 words total (2 punchy, readable sentences max).
    2. Bold, objective, high-stakes news voice.
    3. In EVERY secondary slide, wrap 2 to 4 key words in <span class="daily-yellow">highlight words</span> (this renders in vivid yellow).
    4. For EVERY secondary slide, provide:
       - "imageEntity": A specific 1-2 word Wikipedia topic title for an Indian photo (e.g. 'IIT Bombay', 'Supreme Court of India', 'Eknath Shinde', 'Air India', 'Indian Railways', 'BCCI').
       - "keywordSuggestions": 2 alternative search terms.
       - "personName": Name of the main Indian leader/celebrity/official involved if any, else null.

    Candidate Indian News Items:
    ${candidateItems.map((c, i) => `${i + 1}. ${c.headline} - ${c.description || ""}`).join('\n')}

    Output strictly valid JSON with this shape:
    {
        "secondarySlides": [
            {
                "text": "First part of event, <span class=\\"daily-yellow\\">key event words</span> followed by the consequence.",
                "imageEntity": "Specific Indian Wikipedia Entity",
                "keywordSuggestions": ["Alt 1", "Alt 2"],
                "personName": "Full Person Name or null"
            }
        ]
    }
    `;

    let parsed = null;

    // 1. Claude API
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            console.log("Using Anthropic Claude for Daily News copy...");
            const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
            const response = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1000,
                temperature: 0.6,
                system: "You output ONLY raw JSON without markdown or code blocks.",
                messages: [{ role: "user", content: prompt }]
            });
            const content = response.content[0].text.trim();
            const cleaned = content.replace(/^```json\s*/i, '').replace(/```$/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (e) {
            console.warn("Claude API failed for daily news, trying fallback:", e.message);
        }
    }

    // 2. Pollinations Free Text AI
    if (!parsed || !Array.isArray(parsed.secondarySlides)) {
        try {
            console.log("Querying Free AI for Daily News secondary slides...");
            const res = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: "You output ONLY raw JSON without markdown or commentary." },
                        { role: "user", content: prompt }
                    ],
                    jsonMode: true,
                    model: "openai"
                })
            });
            if (res.ok) {
                const text = await res.text();
                const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/g, '').trim();
                parsed = JSON.parse(cleaned);
            }
        } catch (err) {
            console.warn("Pollinations failed for daily news:", err.message);
        }
    }

    // 3. Fallback extraction if AI failed
    let secSlides = (parsed && Array.isArray(parsed.secondarySlides)) ? parsed.secondarySlides : [];
    if (secSlides.length < secondaryCount) {
        console.log(`Using fallback generator for Daily News (${secSlides.length}/${secondaryCount} ready)...`);
        for (let i = secSlides.length; i < secondaryCount; i++) {
            const item = candidateItems[i] || candidateItems[0] || { headline: "National Development Across India" };
            const clean = (item.headline || "Major National Update").replace(/\s*-\s*[^-]+$/, '').trim();
            const words = clean.split(' ');
            const mid = Math.max(1, Math.floor(words.length / 2));
            const highlightLen = Math.min(3, Math.max(2, words.length - mid));
            const highlightedText = words.slice(0, mid).join(' ') + 
                ` <span class="daily-yellow">${words.slice(mid, mid + highlightLen).join(' ')}</span> ` + 
                words.slice(mid + highlightLen).join(' ');

            // Find capital entities
            const capitalWords = clean.split(/[^a-zA-Z0-9]+/).filter(w => w.length > 3 && /^[A-Z]/.test(w));
            const entity = capitalWords[0] || "India News";

            secSlides.push({
                text: highlightedText.trim(),
                imageEntity: entity,
                keywordSuggestions: [entity, "India"],
                personName: capitalWords.length > 1 ? `${capitalWords[0]} ${capitalWords[1]}` : null
            });
        }
    }

    // Trim or pad to exact secondaryCount
    secSlides = secSlides.slice(0, secondaryCount);

    // Build the full carousel array: Slide 1 (Cover) + Slides 2..N-1 (Secondary) + Slide N (CTA)
    const slides = [];

    // Slide 1: Cover Slide
    slides.push({
        template: 'daily_news',
        isCover: true,
        coverStyle: coverStyle || 'styleA',
        channelName: channelName,
        headline: "WHAT HAPPENED IN INDIA - LAST 24 HOURS IN 60 SECONDS 🇮🇳 💭",
        text: "WHAT HAPPENED IN INDIA - LAST 24 HOURS IN 60 SECONDS",
        subtext: "< SWIPE | ( NEWS YOU CAN'T MISS 👉 )",
        imageEntity: secSlides[0]?.imageEntity || "India Gate",
        keywordSuggestions: ["India Gate", "Rashtrapati Bhavan", "Parliament of India"],
        bgImagePath: "",
        cutoutImagePath: "",
        cutout2ImagePath: "",
        badgeImages: [],
        personName: secSlides[0]?.personName || null
    });

    // Slides 2 to N-1: Secondary News Slides
    secSlides.forEach((s, idx) => {
        slides.push({
            template: 'daily_news',
            isCover: false,
            isCta: false,
            channelName: channelName,
            text: s.text,
            subtext: "",
            imageEntity: s.imageEntity || "India News",
            keywordSuggestions: s.keywordSuggestions || [s.imageEntity || "India", "News"],
            personName: s.personName || null,
            bgImagePath: ""
        });
    });

    // Slide N: CTA Slide
    slides.push({
        template: 'daily_news',
        isCover: false,
        isCta: true,
        channelName: channelName,
        text: "STAY AHEAD WITH 24-HOUR REAL-TIME UPDATES",
        subtext: "What happened in India, delivered in 60 seconds every single day.",
        ctaImagePath: "",
        imageEntity: "News"
    });

    // Batch 2: Post Caption
    const bulletsList = secSlides.map((s, idx) => `${idx + 1}. ${s.text.replace(/<[^>]+>/g, '').trim()}`).join('\n\n');
    const caption = `🚨 WHAT HAPPENED IN INDIA - LAST 24 HOURS IN 60 SECONDS 🇮🇳\n\n${bulletsList}\n\nSwipe through the carousel to see the full breakdown! Which story surprised you the most? Drop your reaction below! 👇\n\n#India #DailyNews #CurrentAffairs #${channelName} #BreakingNews #IndiaNews #Headlines`;

    return {
        template: 'daily_news',
        coverStyle: coverStyle || 'styleA',
        personName: secSlides[0]?.personName || null,
        circleImageKeyword: secSlides[1]?.imageEntity || "India",
        imageEntity: secSlides[0]?.imageEntity || "India Gate",
        slides: slides,
        caption: caption
    };
}

module.exports = {
    generateCarouselCopy,
    generateDailyNewsCopy,
    generatePostCaption,
    buildStoryFallback,
    repairTruncatedJson
};
