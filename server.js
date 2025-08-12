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
  const embedUrl = `https://vidsrc.me/embed/tv/${tmdbId}`;

  try {
    const { data: html } = await axios.get(embedUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(html);
    const episodes = [];

    $('#eps .ep').each((_, el) => {
      episodes.push({
        season: $(el).attr('data-s'),
        episode: $(el).attr('data-e'),
        title: $(el).text().trim(),
        iframe: $(el).attr('data-iframe'),
      });
    });

    res.json({ episodes });

  } catch (err) {
    console.error('Cheerio scraping error:');
    res.status(500).json({ error: 'Failed to extract episode data' });
  }
});
app.get('/api/tv/:tmdbId', async (req, res) => {
  const tmdbId = req.params.tmdbId;
  const { season = 1, episode = 1 } = req.query;

  const embedUrl = `https://hyhd.org/embed/tv?imdb=${tmdbId}&season=${season}&episode=${episode}&color=e600e6`;

  try {
    const { data: html } = await axios.get(embedUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(html);
    const iframeSrc = $('iframe').attr('src');

    if (!iframeSrc) {
      return res.status(404).json({ error: 'Iframe not found (possibly rendered with JS)' });
    }

    res.json({ video: iframeSrc.startsWith('//') ? `https:${iframeSrc}` : iframeSrc });

  } catch (err) {
    console.error('Cheerio iframe error:', err.message);
    res.status(500).json({ error: 'Failed to extract video' });
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
    const playsrcRes = await axios.get(`https://madplay.site/api/vidz`, {
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

    console.warn("ℹ️ Empty result from /playsrc, trying /rogflix");
  } catch (error) {
    console.warn("⚠️ /playsrc failed, trying /rogflix instead");
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
// Proxy endpoint for both .m3u8 and .ts files
app.get("/api/proxy-hls/autoembed", async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing URL");

    try {
        if (!targetUrl.includes("vid1.site/proxy/")) {
            targetUrl = decodeURIComponent(targetUrl);
        }

        const response = await axios.get(targetUrl, {
            responseType: "arraybuffer",
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Referer": "https://autoembed.pro/",
                "Origin": "https://autoembed.pro"
            }
        });

        const contentType = response.headers["content-type"] || "";
        res.setHeader("Access-Control-Allow-Origin", "*");

        // If it's an .m3u8 playlist, rewrite .ts URLs to go through our proxy
        if (contentType.includes("application/vnd.apple.mpegurl") || targetUrl.endsWith(".m3u8")) {
            let playlist = response.data.toString();

            // Replace each line that looks like a .ts URL
            playlist = playlist.replace(/(https?:\/\/[^\s]+)/g, (match) => {
                return `https://minazuki-backend.onrender.com/api/proxy-hls/autoembed?url=${encodeURIComponent(match)}`;
            });

            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            res.send(playlist);
        } else {
            // Pass-through for .ts and other files
            res.setHeader("Content-Type", contentType);
            res.send(response.data);
        }

    } catch (err) {
        console.error("Proxy error:", err.message);
        res.status(500).send("Error fetching the stream");
    }
});
app.get("/api/proxy-hls1", async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing URL");

    try {
        if (!targetUrl.includes("proxy.vidrock.store/")) {
            targetUrl = decodeURIComponent(targetUrl);
        }

        // Forward Range header if present
        const range = req.headers.range;

        const response = await axios.get(targetUrl, {
            responseType: "stream", // Stream for large video files
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
                "Referer": "https://vidrock.net/",
                ...(range ? { Range: range } : {})
            }
        });

        // Pass through important headers for video streaming
        Object.keys(response.headers).forEach(header => {
            res.setHeader(header, response.headers[header]);
        });

        res.status(response.status);
        response.data.pipe(res);

    } catch (err) {
        console.error("Proxy error:", err.message);
        if (err.response) {
            res.status(err.response.status).send("Error fetching video");
        } else {
            res.status(500).send("Internal server error");
        }
    }
});

app.listen(3001, () => {
  console.log('✅ Server running at http://localhost:3001');
});