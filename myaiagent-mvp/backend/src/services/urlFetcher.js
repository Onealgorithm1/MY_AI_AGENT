import * as cheerio from 'cheerio';
import { monitorExternalApi } from '../middleware/performanceMonitoring.js';

/**
 * Fetch and extract content from a URL
 * @param {string} url - The URL to fetch
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} Extracted content and metadata
 */
export async function fetchUrl(url, options = {}) {
  const {
    timeout = 10000,
    maxContentLength = 5 * 1024 * 1024, // 5MB default
    includeImages = true,
    includeLinks = false,
  } = options;

  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are supported');
    }

    // Fetch the URL with monitoring
    const response = await monitorExternalApi('url-fetch', url, async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MyAIAgent/1.0; +https://myaiagent.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
          },
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        // Check content type
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
          throw new Error(`Unsupported content type: ${contentType}`);
        }

        // Check content length
        const contentLength = res.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > maxContentLength) {
          throw new Error(`Content too large: ${contentLength} bytes`);
        }

        return await res.text();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });

    // Parse HTML with Cheerio
    const $ = cheerio.load(response);

    // Remove script, style, and other non-content tags
    $('script, style, noscript, iframe, svg').remove();

    // Extract metadata
    const metadata = {
      title: $('title').text().trim() ||
             $('meta[property="og:title"]').attr('content') ||
             $('meta[name="twitter:title"]').attr('content') ||
             '',

      description: $('meta[name="description"]').attr('content') ||
                   $('meta[property="og:description"]').attr('content') ||
                   $('meta[name="twitter:description"]').attr('content') ||
                   '',

      siteName: $('meta[property="og:site_name"]').attr('content') || '',

      author: $('meta[name="author"]').attr('content') ||
              $('meta[property="article:author"]').attr('content') ||
              '',

      publishedDate: $('meta[property="article:published_time"]').attr('content') ||
                     $('meta[name="date"]').attr('content') ||
                     '',

      keywords: $('meta[name="keywords"]').attr('content') || '',

      canonicalUrl: $('link[rel="canonical"]').attr('href') || url,

      favicon: $('link[rel="icon"], link[rel="shortcut icon"]').attr('href') || '',
    };

    // Extract main content
    // Try to find the main content area
    let mainContent = $('article, main, .content, .post-content, .entry-content, #content').first();
    if (!mainContent.length) {
      mainContent = $('body');
    }

    // Extract clean text
    const textContent = mainContent
      .clone()
      .find('script, style, noscript, iframe, svg, header, footer, nav, aside, .advertisement, .ads')
      .remove()
      .end()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    // Extract images if requested
    let images = [];
    if (includeImages) {
      images = [];

      // Get Open Graph image first
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        images.push({
          url: new URL(ogImage, url).href,
          alt: $('meta[property="og:image:alt"]').attr('content') || '',
          type: 'og:image',
        });
      }

      // Get other images from content
      mainContent.find('img').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && !src.startsWith('data:')) {
          try {
            images.push({
              url: new URL(src, url).href,
              alt: $(elem).attr('alt') || '',
              type: 'content',
            });
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });

      // Limit to top 10 images
      images = images.slice(0, 10);
    }

    // Extract links if requested
    let links = [];
    if (includeLinks) {
      const seenUrls = new Set();
      mainContent.find('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            const absoluteUrl = new URL(href, url).href;
            if (!seenUrls.has(absoluteUrl)) {
              seenUrls.add(absoluteUrl);
              links.push({
                url: absoluteUrl,
                text: $(elem).text().trim(),
              });
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });

      // Limit to top 50 links
      links = links.slice(0, 50);
    }

    // Extract headings for structure
    const headings = [];
    mainContent.find('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text) {
        headings.push({
          level: parseInt(elem.name.substring(1)),
          text: text,
        });
      }
    });

    return {
      success: true,
      url: url,
      canonicalUrl: metadata.canonicalUrl,
      metadata,
      content: {
        text: textContent,
        wordCount: textContent.split(/\s+/).length,
        characterCount: textContent.length,
        headings,
      },
      images,
      links,
      fetchedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('URL fetch error:', error);

    return {
      success: false,
      url: url,
      error: {
        message: error.message,
        type: error.name,
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}

/**
 * Extract text content from HTML string
 * @param {string} html - HTML content
 * @returns {string} Extracted text
 */
export function extractTextFromHtml(html) {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, svg').remove();

  return $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate if a string is a valid URL
 * @param {string} urlString - String to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (e) {
    return false;
  }
}

/**
 * Batch fetch multiple URLs
 * @param {string[]} urls - Array of URLs to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object[]>} Array of fetch results
 */
export async function fetchMultipleUrls(urls, options = {}) {
  const { concurrent = 3 } = options;

  const results = [];

  // Process URLs in batches to avoid overwhelming the system
  for (let i = 0; i < urls.length; i += concurrent) {
    const batch = urls.slice(i, i + concurrent);
    const batchResults = await Promise.all(
      batch.map(url => fetchUrl(url, options))
    );
    results.push(...batchResults);
  }

  return results;
}
