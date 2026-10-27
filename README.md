# Property Intelligence AI

A containerized property research chatbot for publicly accessible information from DarGlobal and Wasalt.

## Stack
- React + TypeScript + Vite
- Python + FastAPI
- BeautifulSoup scraper with sitemap/seed URL support
- Lightweight TF-IDF retrieval (no paid vector database required)
- OpenRouter Chat Completions API
- Docker

## Important data collection note
Only collect pages that are publicly accessible and permitted by each website's terms and `robots.txt`. Do not bypass logins, CAPTCHAs, rate limits, or access controls. The scraper is deliberately conservative and has a small page limit. Review each site's terms and robots rules before running it against production sites.

## Run locally with Docker
1. Install Docker Desktop.
2. Copy `.env.example` to `.env`.
3. Add your OpenRouter API key to `.env`.
4. From this folder run:
   ```bash
   docker compose up --build
   ```
5. Open http://localhost:8000

Without an API key, the UI and ingestion/status endpoints work, but chatbot generation returns a helpful configuration error.

## Ingest public pages
From the project root:
```bash
docker compose exec app python -m app.scraper
```
You can set seed URLs in `SEED_URLS` in `.env`, separated by commas. Defaults are the two homepages. The scraper discovers same-domain links from those pages and tries sitemaps, subject to robots rules and `MAX_PAGES`.

For a more reliable submission, inspect the sites manually and add specific public project/listing URLs to `SEED_URLS`. The sites may render some content dynamically or block automated access; do not bypass restrictions. If blocked, use permitted public pages or manually curated public facts with source URLs, clearly documented.

## Deploy to Render
1. Push this repository to your GitHub account.
2. In Render choose **New → Web Service** and connect the repository.
3. Set runtime/language to **Docker**.
4. Add environment variable `OPENROUTER_API_KEY` (secret) and optionally `OPENROUTER_MODEL`.
5. Set health check path to `/health`, then deploy.
6. Wait until the service is live, open the public URL, and test the sample questions below.

The application listens on `0.0.0.0` and uses Render's `PORT` environment variable.

## Suggested demo questions
- What does DarGlobal develop?
- Summarize the property/project information you found from Wasalt.
- Compare the available information from DarGlobal and Wasalt.
- Which sources support your answer?

The chatbot must say when the collected sources do not contain enough evidence. Do not present unverified prices, availability, returns, or legal claims as facts.

## Before submitting
- [ ] Run scraper and confirm `data/documents.json` contains collected pages and source URLs.
- [ ] Test health endpoint and chatbot locally.
- [ ] Test source links and unsupported-question behavior.
- [ ] Confirm the deployed URL works in an incognito window.
- [ ] Include GitHub repo and live URL in your submission.
