# Phase 5: Apify Integration for Threads Scraping

## Overview

To improve the reliability and robustness of scraping Threads posts, we have integrated the Apify platform, specifically using the `canadesk/threads` actor. This approach replaces the previous local `puppeteer`-based solution, which was prone to breaking due to changes in the Threads website UI and anti-scraping measures.

## Implementation Details

The core logic is now encapsulated in `src/lib/scraper.ts`, which calls the Apify API.

### API Endpoint

We use the synchronous execution endpoint to run the actor and get the results in a single HTTP request:

`POST https://api.apify.com/v2/acts/canadesk~threads/run-sync-get-dataset-items`

### Authentication

Authentication is handled via an API token. The token must be provided as a query parameter in the request URL.

### Environment Variable

The Apify API token must be stored in the `APIFY_TOKEN` environment variable. Add the following to your `.env` or `.env.local` file:

```
APIFY_TOKEN="your_apify_token_here"
```

The `.env.example` file has been updated to include this new variable.

### Request Payload

To fetch posts for a specific user, we send a JSON payload with the following parameters:

-   `keyword`: An array containing the Threads username.
-   `process`: Set to `'gt'` to specify that we want to "get threads" for the user.
-   `maximum`: The maximum number of posts to retrieve.

### Data Mapping

The data returned by the Apify actor is mapped to our internal `ThreadsPost` type. The mapping is as follows:

-   `ThreadsPost.id`: A newly generated UUID.
-   `ThreadsPost.jobId`: The `jobId` passed to the `scrapeThreads` function.
-   `ThreadsPost.content`: Mapped from the `text` field of the Apify result.
-   `ThreadsPost.imageUrls`: Mapped from the `media` array in the Apify result.
-   `ThreadsPost.postedAt`: Mapped from the `timestamp` field.
-   `ThreadsPost.scrapedAt`: The current date and time.

## Benefits of Using Apify

-   **Reliability**: Apify actors are professionally maintained and updated to work with the target websites.
-   **Scalability**: Apify's platform can handle scraping at a much larger scale than a local script.
-   **Reduced Maintenance**: We no longer need to maintain the scraper code ourselves, saving development time and effort.
-   **Proxy Management**: Apify handles proxies automatically, which helps in avoiding IP-based blocking.
