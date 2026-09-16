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

module.exports = { getTrendingStats };
