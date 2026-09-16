# Automated Instagram Carousel Content Pipeline

A fully automated, hands-off pipeline that:
1. Finds a trending stat/news story (India-focused, business/finance) using GNews API.
2. Turns it into short punchy carousel copy using Claude 3.5 Sonnet.
3. Renders that copy into carousel slide images (PNG) matching a fixed visual template.
4. Commits the images to the repository to host them via GitHub.
5. Posts the carousel to Instagram automatically via the Graph API.

## Setup Steps

1. Push this folder to a **public** GitHub repo (private repos work too, just uses your Action minutes).
2. In repo **Settings → Secrets and variables → Actions**, add the following repository secrets:
   - `IG_ACCESS_TOKEN`: long-lived Instagram access token.
   - `IG_USER_ID`: your Instagram Business account ID.
   - `ANTHROPIC_API_KEY`: API key for the Claude API (Anthropic).
   - `NEWS_API_KEY`: API key for GNews (get one at gnews.io).
3. The pipeline runs automatically every day at 9:00 UTC via GitHub Actions. You can edit the cron schedule in `.github/workflows/generate-and-post.yml` if you want a different time.
4. You can also trigger it manually from the GitHub UI (**Actions** -> **Generate and Post Carousel** -> **Run workflow**).

## Local Testing
```bash
npm install
# Set your environment variables locally
export NEWS_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export IG_USER_ID="..."
export IG_ACCESS_TOKEN="..."
export REPO_RAW_BASE="..."

npm start
```

## How free hosting works
- **Compute:** GitHub Actions runs the whole script on a schedule — free for public repos, no server to pay for.
- **Image hosting:** The workflow commits the generated PNGs straight into the repo. Once pushed, each image has a permanent public URL via `raw.githubusercontent.com` which is passed to the Instagram Graph API.
