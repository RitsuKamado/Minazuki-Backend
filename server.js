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
        'User-Agent': 'MinazukiApp v1.0.0' // 
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
    console.error("Popular fetch failed:", err.message);
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
    console.error("Search failed:", err.message);
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
    console.error("Scraping error:", err.message);
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
    console.error('Puppeteer error:', err.message);
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
    console.error('Puppeteer error:', err.message);
    res.status(500).json({ error: 'Failed to extract CloudStream video' });
  }
});
app.get('/api/proxy', async (req, res) => {
  const { id, season, episode } = req.query;
  try {
    const response = await axios.get(`https://madplay.site/api/playsrc`, {
      params: { id, season, episode },
    });

    res.json(response.data); // Return the data to your frontend
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data' });
  }
});

app.get('/api/madplay/movie', async (req, res) => {
  const {id} = req.query;
  try {
    const response = await axios.get(`https://madplay.site/api/playsrc`, {
      params: { id },
    });

    res.json(response.data); // Return the data to your frontend
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data' });
  }
})
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
        console.error("Proxy fetch error:", err.message);
        res.status(500).send("Failed to fetch HLS");
    }
});
app.listen(3001, () => {
  console.log('✅ Server running at http://localhost:3001');
});