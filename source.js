const Parser = require('rss-parser');
const parser = new Parser();

async function getTrendingStats(category = 'business') {
    // Map our UI categories to Google News RSS
    let url = 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en';
    if (category === 'finance' || category === 'business') {
        url = 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en';
    } else if (category === 'tech') {
        url = 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en';
    }
    
    try {
        const feed = await parser.parseURL(url);
        
        return feed.items.map(article => ({
            headline: article.title,
            description: article.contentSnippet || article.title,
            url: article.link,
            publishedAt: article.pubDate
        }));
    } catch (error) {
        console.error("Error fetching news from RSS:", error);
        return [];
    }
}

async function getIndiaDailyNewsBulletins() {
    const urls = [
        'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en',
        'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en'
    ];
    
    const allItems = [];
    const seenTitles = new Set();

    for (const url of urls) {
        try {
            const feed = await parser.parseURL(url);
            for (const item of (feed.items || [])) {
                // Remove publisher attribution like "- NDTV" or "- The Hindu"
                const cleanHeadline = (item.title || "").replace(/\s*-\s*[^-]+$/, '').trim();
                const normKey = cleanHeadline.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanHeadline && !seenTitles.has(normKey)) {
                    seenTitles.add(normKey);
                    allItems.push({
                        headline: cleanHeadline,
                        fullTitle: item.title,
                        description: item.contentSnippet || cleanHeadline,
                        url: item.link,
                        publishedAt: item.pubDate
                    });
                }
            }
        } catch (e) {
            console.warn(`Error fetching RSS feed from ${url}:`, e.message);
        }
    }

    return allItems;
}

module.exports = { getTrendingStats, getIndiaDailyNewsBulletins };
