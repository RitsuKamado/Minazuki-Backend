const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const TMDB_API_KEY = process.env.TMDB_API_KEY || "YOUR_TMDB_KEY";

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
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
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
  const embedUrl = `https://hyhd.org/embed/movie/${tmdbId}`;

  try {
    // Step 1: Load vidsrc.xyz and extract outer iframe (Cloudnestra)
    const { data } = await axios.get(embedUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(data);
    let iframeSrc = $("iframe").attr("src");
    if (!iframeSrc) return res.status(404).json({ error: "Iframe not found" });
    if (iframeSrc.startsWith("//")) iframeSrc = "https:" + iframeSrc;

    // Step 2: Use Puppeteer to extract the real token from Cloudnestra
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.goto(iframeSrc, { waitUntil: "networkidle2" });

    // Simulate the click that loads the iframe
    await page.click("#pl_but");
    await page.waitForSelector("#player_iframe", { timeout: 10000 });

    // Extract the full iframe source
    const tokenizedSrc = await page.$eval("#player_iframe", el => el.src);

    await browser.close();

    // Return the clean iframe
    res.json({ video: tokenizedSrc });

  } catch (err) {
    console.error("Scraping error:", err.message);
    res.status(500).json({ error: "Failed to extract token iframe" });
  }
});
app.listen(3001, () => {
  console.log("✅ Server running at http://localhost:3001");
});