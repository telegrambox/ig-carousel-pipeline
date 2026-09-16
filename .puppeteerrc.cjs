const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to project root so it persists on Render
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
