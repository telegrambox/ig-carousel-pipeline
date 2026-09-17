const { Anthropic } = require("@anthropic-ai/sdk");

/**
 * Intelligent Copywriting Engine for Viral Instagram Carousels (1affairs / ind.file style)
 * Adapts narrative structure dynamically across 3 to 8 slides.
 */

async function generateCarouselCopy(story, channelName = "1affairs", slideCount = 3) {
  const count = Math.max(3, Math.min(8, parseInt(slideCount) || 3));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(`[generateCopy] No ANTHROPIC_API_KEY found. Generating dynamic ${count}-slide intelligent storytelling mock...`);
    return generateDynamicMockCopy(story, channelName, count);
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `
You are the Executive Creative Director & Lead Copywriter for the viral Instagram news & business brand '${channelName}' (similar in style and punchiness to 'ind.file' and 'indian startups').

Turn this news story into a compelling, narrative-driven Instagram carousel consisting of EXACTLY ${count} slides.

NEWS STORY:
Headline: ${story.headline}
Description: ${story.description || story.summary || "No further description provided."}

STORYTELLING & FORMAT RULES:
1. SLIDE 1 (THE HOOK / PUNCHLINE):
   - A scroll-stopping punchline headline. Maximum 12-16 words.
   - Use [[double brackets]] around 2-4 critical impact words to place them in a solid brand highlight badge box (e.g. "GOVERNMENT CONFIRMS [[CANCELLATION]] AND PROMISES {{FRESH & FAIR}} EXAM").
   - Use {{double curly braces}} around 1-3 secondary high-impact words for colored accent text.
   - Subhook: One concise sentence setting up the tension.
   - layoutType: "hero"
   - scriptText: Short cursive accent note at bottom, e.g. "The story unfolds | SWIPE"

2. SLIDES 2 to ${count - 1} (DEVELOPMENT, EVIDENCE & STORYTELLING):
   - Each slide must reveal a deeper layer of the story instead of repeating the same headline.
   - VARY THE LAYOUT TYPE across slides! Choose from:
     * "pillars": Ideal for 3 key capabilities, factors, or drivers. Provide "pillars": [{"icon": "🚀", "text": "..."}, {"icon": "🤝", "text": "..."}, {"icon": "🛡️", "text": "..."}]
     * "bullet_list": Ideal for 3 demands, actions, or key points. Provide "bullets": [{"icon": "✓", "text": "..."}, {"icon": "👥", "text": "..."}, {"icon": "🛡️", "text": "..."}]
     * "quote": Ideal for an emotional quote, statement from leadership, or public reaction. Provide "quote" and "quoteAuthor".
     * "hero": For dramatic visual scene, person focus, or confrontation.
   - Every slide MUST have a UNIQUE, DISTINCT "imageSearchQuery" targeting authentic real-world photography (e.g., "fighter jet hangar sunset", "stock trading floor screens", "crowd holding protest signs", "modern corporate boardroom meeting"). DO NOT REPEAT image queries!

3. SLIDE ${count} (CONCLUSION & IMPACT):
   - The final takeaway or future outlook.
   - An engaging question or call to action encouraging comments.
   - layoutType: "quote" or "takeaway" or "pillars"
   - scriptText: e.g. "Stronger. Together." or "What's your take? 👇"
   - badgeText: A summary pill badge, e.g. "THE FIGHT FOR TRANSPARENCY" or "READY FOR THE FUTURE"

Output MUST be strictly valid JSON matching this exact structure:
{
  "caption": "Full Instagram post caption with storytelling paragraphs and 5-8 relevant hashtags.",
  "personName": "Full name of prominent leader/businessman/official if directly featured, otherwise null",
  "circleImageKeyword": "1-2 word keyword for a secondary circular visual on slide 1 (e.g. 'stocks down', 'gold coin', 'fighter jet')",
  "slides": [
    {
      "slideIndex": 1,
      "layoutType": "hero",
      "headline": "...",
      "subhook": "...",
      "badgeText": "...",
      "scriptText": "...",
      "imageSearchQuery": "..."
    }
  ]
}
Ensure exactly ${count} slides in the "slides" array. Output ONLY raw JSON, no markdown codeblocks or conversational text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      temperature: 0.7,
      system: "You output ONLY valid raw JSON with no backticks, no markdown, and no preamble.",
      messages: [{ role: "user", content: prompt }]
    });

    let content = response.content[0].text.trim();
    content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(content);
  } catch (err) {
    console.warn("[generateCopy] Claude API error or parsing issue, falling back to dynamic mock:", err.message);
    return generateDynamicMockCopy(story, channelName, count);
  }
}

/**
 * Intelligent Dynamic Storytelling Generator (Offline / Fallback mode)
 * Crafts a rich, multi-page narrative adapting to any slide count (3 to 8).
 */
function generateDynamicMockCopy(story, channelName, count) {
  const rawHeadline = (story.headline || "Major Development Shakes Industry").replace(/\s*-\s*.*$/, "");

  // Extract prominent name if present
  let person = null;
  if (/adani/i.test(rawHeadline)) person = "Gautam Adani";
  else if (/ambani/i.test(rawHeadline)) person = "Mukesh Ambani";
  else if (/tata/i.test(rawHeadline)) person = "Ratan Tata";
  else if (/modi/i.test(rawHeadline)) person = "Narendra Modi";
  else if (/sitharaman/i.test(rawHeadline)) person = "Nirmala Sitharaman";

  // Identify theme
  const isDefenceOrTech = /defence|military|amca|jet|aerospace|ai|tech|chip/i.test(rawHeadline);
  const isExamOrStudent = /exam|protest|paper leak|student|jssc|upsc|cgl|neet/i.test(rawHeadline);

  const slides = [];

  // SLIDE 1: PUNCHLINE / HOOK
  slides.push({
    slideIndex: 1,
    layoutType: "hero",
    headline: `THE BIG SHIFT: [[${rawHeadline.slice(0, 50)}]] EXPLAINED`,
    subhook: `A deep dive into what this means for India's future | SWIPE`,
    badgeText: "EXCLUSIVE BREAKDOWN",
    scriptText: "The story unfolds | SWIPE",
    imageSearchQuery: isDefenceOrTech ? "fighter jet hangar sunset" : isExamOrStudent ? "students holding protest signboards crowd" : "business leader press conference boardroom",
  });

  // Intermediate slides (from 2 up to count-1)
  const layoutCycle = isDefenceOrTech
    ? ["pillars", "bullet_list", "quote", "pillars", "bullet_list", "quote"]
    : ["bullet_list", "quote", "pillars", "bullet_list", "quote", "pillars"];

  for (let i = 2; i < count; i++) {
    const layout = layoutCycle[(i - 2) % layoutCycle.length];

    if (layout === "pillars") {
      slides.push({
        slideIndex: i,
        layoutType: "pillars",
        headline: `A STEP TOWARDS [[ATMANIRBHAR BHARAT]] IN {{CAPABILITIES}}.`,
        subhook: `Stronger partnerships. {{Stronger India.}} Stronger future.`,
        pillars: [
          { icon: "🚀", text: "Building world-class capabilities in **India**." },
          { icon: "🤝", text: "A strategic partnership that powers **progress**." },
          { icon: "🛡️", text: "Powering the next generation of **growth**." }
        ],
        scriptText: "The future is taking off.",
        imageSearchQuery: "modern manufacturing high tech assembly facility"
      });
    } else if (layout === "bullet_list") {
      slides.push({
        slideIndex: i,
        layoutType: "bullet_list",
        headline: `KEY DEVELOPMENTS: [[TRANSPARENCY]] AND PROMISES OF {{FRESH REFORMS}}.`,
        subhook: `Official assurances outline a structured pathway forward.`,
        bullets: [
          { icon: "✓", text: "Official confirmation issued following **statewide review**." },
          { icon: "👥", text: "Revised protocols and **rescheduled timelines** announced soon." },
          { icon: "🛡️", text: "Commitment to **transparency** and a level playing field for all." }
        ],
        scriptText: "Accountability matters.",
        imageSearchQuery: "government official press conference microphones"
      });
    } else {
      slides.push({
        slideIndex: i,
        layoutType: "quote",
        headline: `PUBLIC REACTION: [[STAKEHOLDERS]] DEMAND {{FAIR PROCESS}}.`,
        subhook: `Voices across the ground call for immediate clarity and accountability.`,
        quote: "We worked tirelessly for this outcome. Progress should never be halted by avoidable missteps.",
        quoteAuthor: "Representative Statement",
        scriptText: "Voices from the ground.",
        imageSearchQuery: "stock market trading floor screens wall street"
      });
    }
  }

  // FINAL SLIDE: CONCLUSION & CTA
  slides.push({
    slideIndex: count,
    layoutType: "quote",
    headline: `THE ROAD AHEAD: [[A WIN]] FOR {{TRANSPARENCY & INTEGRITY}}.`,
    subhook: `What are your thoughts on this major development? Drop your view below! 👇`,
    quote: "True progress is measured by how swiftly institutions adapt, reform, and deliver fairness.",
    quoteAuthor: "Editorial Perspective",
    badgeText: "THE FIGHT FOR A FAIR FUTURE",
    scriptText: "Stronger. Together.",
    imageSearchQuery: "city skyline sunrise future skyline"
  });

  return {
    caption: `🚨 BREAKING UPDATE: ${rawHeadline}\n\nHere is everything you need to know broken down slide-by-slide.\n\nSwipe through the carousel to see the complete analysis.\n\n💬 What are your thoughts on this? Let us know in the comments below!\n\n#${channelName} #india #news #insights #future #analysis`,
    personName: person,
    circleImageKeyword: isDefenceOrTech ? "fighter jet" : "stock chart",
    slides
  };
}

module.exports = {
  generateCarouselCopy,
  generateDynamicMockCopy
};
