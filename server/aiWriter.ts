/**
 * AI content generation + auto-blog scheduler.
 *
 * Generation uses the OpenAI Chat Completions API with the key from the
 * OPENAI_API_KEY secret or the admin-panel setting ("openai_key").
 *
 * The scheduler runs hourly: when auto-blog is enabled and the configured
 * frequency has elapsed since the last run, it picks the oldest pending
 * topic, generates content, and publishes it as a blog post or article.
 */
import { storage } from "./storage";
import { insertPostSchema, insertArticleSchema } from "@shared/schema";

export interface GeneratedContent {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  category?: string;
}

export async function getOpenAIKey(): Promise<string | undefined> {
  return process.env.OPENAI_API_KEY || (await storage.getSetting("openai_key")) || undefined;
}

export async function generateAIContent(prompt: string, type: "blog" | "article"): Promise<GeneratedContent> {
  const openaiKey = await getOpenAIKey();
  if (!openaiKey) throw new Error("OpenAI API key not configured. Add it in Admin → AI Writing, or set the OPENAI_API_KEY secret.");

  const systemPrompt = `You are an expert content writer for AddressBay, a global business directory covering India, Australia, the UK, Singapore and the US. Write high-quality, SEO-friendly ${type} content for entrepreneurs, business owners, and professionals. Return JSON with fields: title, slug, content (markdown), excerpt (1-2 sentences), metaTitle, metaDescription, metaKeywords (comma separated), category.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err: any = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`);
  }

  const data: any = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// ─── Auto-blog scheduler ──────────────────────────────────────────────────────

const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

async function runAutoBlogOnce(): Promise<void> {
  const settings = await storage.getSettings(["auto_blog_enabled", "auto_blog_frequency", "auto_blog_last_run"]);
  if (settings["auto_blog_enabled"] !== "on") return;

  const freqMs = FREQUENCY_MS[settings["auto_blog_frequency"] || "weekly"] || FREQUENCY_MS.weekly;
  const lastRun = settings["auto_blog_last_run"] ? new Date(settings["auto_blog_last_run"]).getTime() : 0;
  if (Date.now() - lastRun < freqMs) return;

  // Recover topics stuck in "generating" (e.g. after a crash) older than 2 hours
  await storage.recoverStaleAiTopics(2 * 60 * 60 * 1000);

  // Atomically claim the oldest pending topic (pending → generating) so
  // concurrent ticks or multiple instances can't publish the same topic twice
  const topic = await storage.claimNextPendingAiTopic();
  if (!topic) return; // nothing queued

  console.log(`[auto-blog] Generating ${topic.type} for topic #${topic.id}: ${topic.topic}`);
  try {
    const generated = await generateAIContent(topic.topic, topic.type as "blog" | "article");
    // Make the slug collision-safe
    const slug = `${(generated.slug || generated.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`.substring(0, 110);
    if (topic.type === "article") {
      const parsed = insertArticleSchema.parse({ ...generated, slug, published: true });
      await storage.createArticle(parsed);
    } else {
      const { category: _c, ...rest } = generated;
      const parsed = insertPostSchema.parse({ ...rest, slug, published: true });
      await storage.createPost(parsed);
    }
    await storage.updateAiTopic(topic.id, { status: "generated", resultSlug: slug, generatedAt: new Date() });
    await storage.setSetting("auto_blog_last_run", new Date().toISOString());
    console.log(`[auto-blog] Published ${topic.type} "${generated.title}" (${slug})`);
  } catch (err: any) {
    console.error(`[auto-blog] Failed for topic #${topic.id}:`, err.message);
    await storage.updateAiTopic(topic.id, { status: "failed", errorMessage: String(err.message).slice(0, 500) });
    // Do NOT update last_run on failure so the next pending topic is tried on the next tick
  }
}

export function startAutoBlogScheduler(): void {
  const HOUR = 60 * 60 * 1000;
  // First check shortly after boot, then hourly
  setTimeout(() => runAutoBlogOnce().catch(e => console.error("[auto-blog]", e)), 30 * 1000);
  setInterval(() => runAutoBlogOnce().catch(e => console.error("[auto-blog]", e)), HOUR);
}
