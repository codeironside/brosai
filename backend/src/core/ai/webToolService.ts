import { logger } from '../logger/index.js';
import { config } from '../config/index.js';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal'
]);

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  return false;
}

function normalizeUrl(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) throw new Error('url is required');
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed');
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('That address cannot be fetched');
  }
  return parsed.toString();
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function metaContent(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${key}["']`, 'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return '';
}

function extractJsonLd(html: string) {
  const blocks: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    blocks.push(stripHtml(match[1]).slice(0, 2500));
  }
  return blocks.join('\n');
}

function isSpaShell(html: string, text: string) {
  const compact = html.replace(/\s+/g, '');
  return (
    text.length < 500
    || html.length < 4000
    || /create-react-app/i.test(html)
    || /id=["']root["']/.test(html) && text.length < 800
    || /id=["']__next["']/.test(html) && text.length < 800
    || /<div id="app"><\/div>/i.test(compact)
  );
}

function looksUsefulPath(pathname: string) {
  return /about|team|people|leadership|founders|company|who-we-are|our-story|contact|directors/i.test(pathname);
}

function cleanMarkdown(text: string) {
  return text
    .replace(/!\[.*?\]\(<Base64-Image-Removed>\)/g, '')
    .replace(/!\[.*?\]\(data:image\/[^)]+\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class WebToolService {
  async fetchWebpage(rawUrl: string): Promise<{ url: string; title: string; text: string; rendered: boolean }> {
    const url = normalizeUrl(rawUrl);
    try {
      const firecrawl = await this.fetchFirecrawl(url);
      if (firecrawl.text.length > 200) {
        return firecrawl;
      }
    } catch (err: any) {
      logger.warn(`Firecrawl skipped for ${url}: ${err.message}`);
    }

    const htmlResult = await this.fetchHtml(url);
    const jsonLd = extractJsonLd(htmlResult.html);
    const description = metaContent(htmlResult.html, 'description') || metaContent(htmlResult.html, 'og:description');
    const ogTitle = metaContent(htmlResult.html, 'og:title');
    const titleMatch = htmlResult.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = stripHtml(titleMatch?.[1] || ogTitle || '').slice(0, 140) || url;
    const body = stripHtml(htmlResult.html);
    let text = [description && `Summary: ${description}`, jsonLd && `Structured data:\n${jsonLd}`, body]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 14000);

    if (isSpaShell(htmlResult.html, body) || text.length < 400) {
      const rendered = await this.fetchRendered(url);
      if (rendered.text.length > text.length) {
        return rendered;
      }
    }

    if (!text.trim()) {
      throw new Error('The page had no readable text');
    }
    return { url: htmlResult.finalUrl, title, text, rendered: false };
  }

  async fetchWebsite(rawUrl: string): Promise<{ url: string; title: string; text: string; rendered: boolean }> {
    const home = await this.fetchWebpage(rawUrl);
    const origin = new URL(home.url).origin;
    const found = new Set<string>([home.url]);
    const extras: string[] = [];
    const linkRe = /\((https?:\/\/[^)\s]+)\)|href=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;
    const haystack = `${home.text}\n`;
    while ((match = linkRe.exec(haystack)) && extras.length < 4) {
      const raw = match[1] || match[2];
      if (!raw || raw.startsWith('blob:') || raw.startsWith('mailto:')) continue;
      try {
        const next = new URL(raw, origin);
        if (next.origin !== origin) continue;
        next.hash = '';
        if (found.has(next.toString())) continue;
        if (!looksUsefulPath(next.pathname)) continue;
        found.add(next.toString());
        extras.push(next.toString());
      } catch {
        continue;
      }
    }
    if (!extras.some((item) => /about/i.test(item))) {
      extras.unshift(`${origin}/about`);
    }

    const parts = [`SOURCE: ${home.url}\nTITLE: ${home.title}\n\n${home.text}`];
    for (const extra of extras.slice(0, 3)) {
      try {
        const page = await this.fetchWebpage(extra);
        parts.push(`SOURCE: ${page.url}\nTITLE: ${page.title}\n\n${page.text.slice(0, 6000)}`);
      } catch (err: any) {
        logger.warn(`Extra page skipped ${extra}: ${err.message}`);
      }
    }
    return {
      url: home.url,
      title: home.title,
      text: parts.join('\n\n----\n\n').slice(0, 18000),
      rendered: true
    };
  }

  private async fetchFirecrawl(url: string): Promise<{ url: string; title: string; text: string; rendered: boolean }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.ai.firecrawlApiKey) {
      headers.Authorization = `Bearer ${config.ai.firecrawlApiKey}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          url,
          formats: ['markdown'],
          onlyMainContent: true
        })
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Firecrawl ${res.status}`);
      }
      const markdown = cleanMarkdown(String(json.data?.markdown || json.data?.content || ''));
      const title = String(json.data?.metadata?.title || json.data?.title || url).slice(0, 140);
      if (markdown.length < 80) {
        throw new Error('Firecrawl returned little text');
      }
      logger.info(`[Web] Firecrawl scraped ${url} (${markdown.length} chars)`);
      return { url, title, text: markdown.slice(0, 16000), rendered: true };
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      if (!res.ok) {
        throw new Error(`Page returned ${res.status}`);
      }
      const html = (await res.text()).slice(0, 500000);
      return { html, finalUrl: res.url || url };
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchRendered(url: string): Promise<{ url: string; title: string; text: string; rendered: boolean }> {
    const readerUrl = `https://r.jina.ai/${url}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(readerUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'text/plain',
          'User-Agent': BROWSER_UA,
          'X-Retain-Images': 'none'
        }
      });
      if (!res.ok) {
        throw new Error(`Rendered fetch returned ${res.status}`);
      }
      const raw = (await res.text()).replace(/blob:https?:\/\/[^)\s]+/g, '').slice(0, 16000);
      const title = (raw.match(/^Title:\s*(.+)$/m) || [])[1] || url;
      if (raw.replace(/\s+/g, ' ').trim().length < 80) {
        throw new Error('Rendered page had no useful text');
      }
      return { url, title: title.slice(0, 140), text: raw, rendered: true };
    } finally {
      clearTimeout(timer);
    }
  }

  async searchWeb(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const q = String(query || '').trim();
    if (!q) return [];
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html'
        }
      });
      if (!res.ok) {
        logger.warn(`Web search failed: ${res.status}`);
        return [];
      }
      const html = await res.text();
      const results: Array<{ title: string; url: string; snippet: string }> = [];
      const linkRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;
      while ((match = linkRe.exec(html)) && results.length < 5) {
        const href = this.unwrapDuckDuckGo(match[1]);
        const title = stripHtml(match[2]).slice(0, 140);
        if (href.startsWith('http') && title) {
          results.push({ title, url: href, snippet: '' });
        }
      }
      return results;
    } catch (err: any) {
      logger.warn(`Web search skipped: ${err.message}`);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  private unwrapDuckDuckGo(href: string) {
    try {
      const parsed = new URL(href, 'https://html.duckduckgo.com');
      const uddg = parsed.searchParams.get('uddg');
      return uddg ? decodeURIComponent(uddg) : parsed.toString();
    } catch {
      return href;
    }
  }
}

export const webToolService = new WebToolService();
