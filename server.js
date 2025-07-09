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
app.listen(3001, () => {
  console.log("✅ Server running at http://localhost:3001");
});