const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const axiosRetry = require('axios-retry').default;
require("dotenv").config();


const app = express();
app.use(cors());
const API_KEY = '84TGIfWjI08m6NbYqvevGKgE05bG0QZg';

app.get('/api/subtitles', async (req, res) => {
  const { imdb_id } = req.query;

  try {
    const response = await axios.get(`https://api.opensubtitles.com/api/v1/subtitles`, {
      params: {
        imdb_id,
        languages: 'en'
      },
      headers: {
        'Api-Key': API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'MinazukiApp v1.0.0' // ✅ Properly formatted
      }
    });

    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});
const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_KEY";
axiosRetry(axios, { retries: 5, retryDelay: axiosRetry.exponentialDelay });

app.get("/api/popular", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    res.json(response.data.results);
  } catch (err) {
    console.error("Popular fetch failed:");
    res.status(500).json({ error: "Failed to fetch popular movies" });
  }
});

app.get("/api/search", async (req, res) => {
  const query = req.query.query;
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
    );
    res.json(response.data.results);
  } catch (err) {
    console.error("Search failed:");
    res.status(500).json({ error: "Search failed" });
  }
});
const puppeteer = require("puppeteer");

app.get("/api/video/:tmdbId", async (req, res) => {
  const tmdbId = req.params.tmdbId;
  const embedUrl =`https://hyhd.org/embed/movie/${tmdbId}`;

  try {
    const { data } = await axios.get(embedUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);
    let iframeSrc = $("iframe").attr("src");

    if (!iframeSrc) return res.status(404).json({ error: "Iframe not found" });
    if (iframeSrc.startsWith("//")) iframeSrc = "https:" + iframeSrc;
    res.json({ video: iframeSrc });

  } catch (err) {
    console.error("Scraping error:");
    res.status(500).json({ error: "Failed to extract video" });
  }
});
app.get('/api/episodes/:tmdbId', async (req, res) => {
  const tmdbId = req.params.tmdbId;
  const embedUrl = `https://hyhd.org/embed/tv/${tmdbId}`;

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',     // add this
    '--disable-accelerated-2d-canvas',
    '--no-zygote',
    '--single-process',
    '--no-first-run',
    '--no-default-browser-check'
  ]
});
  const page = await browser.newPage();
  await page.goto(embedUrl, { waitUntil: 'networkidle2' });

  try {
    // Wait for the episode list container to load
    await page.waitForSelector('#eps', { timeout: 10000 });

    // Extract the season and episode data
    const episodes = await page.evaluate(() => {
      const eps = [];
      const items = document.querySelectorAll('#eps .ep');
      items.forEach(el => {
        eps.push({
          season: el.getAttribute('data-s'),
          episode: el.getAttribute('data-e'),
          title: el.textContent.trim(),
          iframe: el.getAttribute('data-iframe'),
        });
      });
      return eps;
    });

    await browser.close();
    res.json({ episodes });

  } catch (err) {
    await browser.close();
    console.error('Puppeteer error:');
    res.status(500).json({ error: 'Failed to extract episode data' });
  }
});
app.get('/api/tv/:tmdbId', async (req, res) => {
  const tmdbId = req.params.tmdbId;
  const { season = 1, episode = 1 } = req.query;

  const embedUrl = `https://hyhd.org/embed/tv?imdb=${tmdbId}&season=${season}&episode=${episode}&color=e600e6`;
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',     // add this
    '--disable-accelerated-2d-canvas',
    '--no-zygote',
    '--single-process',
    '--no-first-run',
    '--no-default-browser-check'
  ]
  });

  
  const page = await browser.newPage();
  await page.goto(embedUrl, { waitUntil: 'networkidle2' });

  try {
    // Wait for source options to load
    await page.waitForSelector('iframe, .cloudicon, .dropdown, button', { timeout: 10000 });

    // Click the CloudStream Pro button if necessary
    const cloudStreamSelector = await page.$$eval('button, a', elements =>
      elements.find(el => el.textContent?.toLowerCase().includes('cloudstream'))
    );

    if (cloudStreamSelector) {
      await cloudStreamSelector.click();
      await page.waitForTimeout(3000); // wait for iframe to load
    }

    // Now extract the CloudStream iframe
    const frameSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.src : null;
    });

    await browser.close();

    if (!frameSrc) {
      return res.status(404).json({ error: 'CloudStream iframe not found' });
    }

    res.json({ video: frameSrc });

  } catch (err) {
    await browser.close();
    console.error('Puppeteer error:');
    res.status(500).json({ error: 'Failed to extract CloudStream video' });
  }
});
app.get('/api/proxy', async (req, res) => {
  const { id, season, episode, type } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing required TMDB ID" });
  }

  try {
    // Try /rogflix first
    const rogflixRes = await axios.get(`https://madplay.site/api/rogflix`, {
      params: { id, season, episode, type },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://uembed.site/',
        'Origin': 'https://uembed.site',
        'Accept': 'application/json',
      }
    });

    if (rogflixRes.data && Object.keys(rogflixRes.data).length > 0) {
      return res.json(rogflixRes.data); // ✅ Success from rogflix
    }

    console.warn("ℹ️ Empty result from /rogflix, trying /playsrc");
  } catch (error) {
    console.warn("⚠️ /rogflix failed, falling back to /playsrc");
  }

  // Fallback to /playsrc
  try {
    const fallbackParams = season && episode
      ? { id, season, episode }
      : { id };

    const playsrcRes = await axios.get(`https://madplay.site/api/playsrc`, {
      params: fallbackParams,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://uembed.site/',
        'Origin': 'https://uembed.site',
        'Accept': 'application/json',
      }
    });

    if (playsrcRes.data && Object.keys(playsrcRes.data).length > 0) {
      return res.json(playsrcRes.data); // ✅ Fallback success
    } else {
      console.error("❌ Both /rogflix and /playsrc returned empty");
      return res.status(502).json({ error: "No valid stream found" });
    }
  } catch (error) {
    console.error("❌ Both sources failed:", error.message);
    return res.status(502).json({ error: "Failed to fetch from both sources" });
  }
});

app.get('/api/madplay/movieold', async (req, res) => {
  const { id } = req.query;

  try {
    const response = await axios.get(`https://madplay.site/api/playsrc`, {
      params: { id },
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://madplay.site/',
        'Accept': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error("❌ Madplay fetch failed:");
    if (error.response) {
      console.error("🔴 Status:", error.response.status);
      console.error("🔴 Data:", error.response.data);
      res.status(error.response.status).json({
        error: 'Madplay responded with an error',
        details: error.response.data
      });
    } else if (error.request) {
      console.error("🔴 No response received:", error.request);
      res.status(500).json({ error: 'No response from Madplay' });
    } else {
      console.error("🔴 Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
});
app.get('/api/madplay/movie', async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing TMDB ID in query" });
  }

  try {
    // First try: /playsrc
    const playsrcRes = await axios.get(`https://madplay.site/api/playsrc`, {
      params: { id },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://uembed.site/',
        'Origin': 'https://uembed.site',
        'Accept': 'application/json',
      }
    });

    if (playsrcRes.data && Object.keys(playsrcRes.data).length > 0) {
      return res.json(playsrcRes.data); // ✅ Successful response
    }

    console.warn("ℹ️ Empty result from /playsrc, trying /rogplay");
  } catch (error) {
    console.warn("⚠️ /playsrc failed, trying /rogplay instead");
  }

  // Fallback to /rogplay
  try {
    const rogplayRes = await axios.get(`https://madplay.site/api/rogflix`, {
      params: { id, type: 'movie' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://uembed.site/',
        'Origin': 'https://uembed.site',
        'Accept': 'application/json',
      }
    });

    if (rogplayRes.data && Object.keys(rogplayRes.data).length > 0) {
      return res.json(rogplayRes.data); // ✅ Fallback worked
    } else {
      console.error("❌ Both /playsrc and /rogplay returned empty");
      return res.status(502).json({ error: "No valid stream found" });
    }
  } catch (error) {
    console.error("❌ Both sources failed:");
    console.error(error.message);
    return res.status(502).json({ error: "Failed to fetch movie from both sources" });
  }
});
app.get("/api/proxy-hls", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing URL");

    const decodedUrl = decodeURIComponent(targetUrl);
    try {
        const response = await axios.get(decodedUrl, {
            responseType: "text",
            headers: {
                "User-Agent": "Mozilla/5.0",
                Accept: "application/vnd.apple.mpegurl"
            }
        });

        let content = response.data;

        // Base URL for relative links inside the .m3u8
        const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1);

        // Rewrite all segment or playlist URLs to go through your proxy again
        content = content.replace(/^(?!#)(.*\.m3u8|.*\.ts)/gm, (line) => {
            const absolute = new URL(line, baseUrl).href;
            return `/api/proxy-hls?url=${encodeURIComponent(absolute)}`;
        });

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.send(content);
    } catch (err) {
        console.error("Proxy fetch error:");
        res.status(500).send("Failed to fetch HLS");
    }
});
app.listen(3001, () => {
  console.log('✅ Server running at http://localhost:3001');
});