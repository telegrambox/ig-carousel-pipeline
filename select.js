const fs = require("fs");
const path = require("path");

const USED_STORIES_FILE = path.join(__dirname, "used_stories.json");

function getUsedUrls() {
    if (!fs.existsSync(USED_STORIES_FILE)) {
        return [];
    }
    return JSON.parse(fs.readFileSync(USED_STORIES_FILE, "utf-8"));
}

function markAsUsed(url) {
    const used = getUsedUrls();
    used.push(url);
    fs.writeFileSync(USED_STORIES_FILE, JSON.stringify(used, null, 2));
}

function selectBestStory(articles) {
    const usedUrls = getUsedUrls();
    
    // Filter out used stories
    const available = articles.filter(a => !usedUrls.includes(a.url));
    
    if (available.length === 0) {
        return null;
    }
    
    // Score based on presence of a number/percentage in headline or description
    // since we want stats-driven carousels
    const numberRegex = /\d+/;
    
    available.forEach(article => {
        let score = 0;
        const text = (article.headline + " " + article.description).toLowerCase();
        
        // Bonus for numbers
        if (numberRegex.test(text)) score += 10;
        // Bonus for percentage
        if (text.includes("%") || text.includes("percent")) score += 5;
        
        article.score = score;
    });
    
    // Sort by score descending
    available.sort((a, b) => b.score - a.score);
    
    return available[0];
}

module.exports = { selectBestStory, markAsUsed };
