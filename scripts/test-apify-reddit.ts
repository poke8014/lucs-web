import { scrapeRedditPosts } from "../src/lib/apify-reddit";
import { analyzeRedditSentiment } from "../src/lib/sentiment";

async function main() {
  const query = process.argv[2] || "Thorne Magnesium Bisglycinate";
  console.log(`Testing Apify Reddit Scraper for: "${query}"\n`);

  // Step 1: Scrape Reddit
  console.log("=== Step 1: Scraping Reddit via Apify ===\n");
  const posts = await scrapeRedditPosts(query);

  console.log(`Total posts returned: ${posts.length}`);
  const withComments = posts.filter((p) => p.comments.length > 0);
  console.log(`Posts with comments: ${withComments.length}`);
  console.log(
    `Total comments: ${posts.reduce((sum, p) => sum + p.comments.length, 0)}\n`,
  );

  for (const post of posts.slice(0, 5)) {
    console.log("---");
    console.log(`Title: ${post.title}`);
    console.log(
      `Score: ${post.score} | numComments: ${post.numComments} | Engagement: ${post.engagementLevel ?? "n/a"}`,
    );
    console.log(`Comments fetched: ${post.comments.length}`);
    if (post.comments.length > 0) {
      console.log(
        `  Top comment (score ${post.comments[0].score}): ${post.comments[0].text.slice(0, 120)}`,
      );
    }
    console.log();
  }

  // Step 2: Sentiment analysis
  console.log("=== Step 2: Gemini Sentiment Analysis ===\n");
  const sentiment = await analyzeRedditSentiment(query, posts);

  console.log(`Overall score: ${sentiment.overallScore}/10`);
  console.log(`Confidence: ${sentiment.confidenceLevel}`);
  console.log(`Total mentions: ${sentiment.totalMentions}`);
  console.log(`Themes (${sentiment.themes.length}):`);
  for (const t of sentiment.themes) {
    console.log(`  [${t.sentiment}] ${t.label} (${t.mentionCount}x)`);
  }
  console.log(`\nQuotes (${sentiment.representativeQuotes.length}):`);
  for (const q of sentiment.representativeQuotes) {
    console.log(`  [${q.sentiment}] "${q.text.slice(0, 100)}..."`);
    console.log(`    Source: ${q.source}`);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
