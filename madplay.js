const axios = require("axios");
const express = require("express");
const cheerio = require("cheerio");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const url = 'https://madplay.site/movie';
let movieData = []; // 🔧 Make this an array to store all movies

// 🔍 Function to get and scrape the movie list
async function getHtml() {
    try {
        const { data } = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        const $ = cheerio.load(data);

        const movies = [];

  $("div.style_movieList__uKHlZ a.style_MovieCardSmall__3alU4").each((i, el) => {
    const title = $(el).find("p").text().trim();
    const link = $(el).attr("href");
    const image = $(el).find("img").attr("src");

    const idMatch = link?.match(/id=(\d+)/);
    const id = idMatch ? idMatch[1] : null;
    const streamAPI = id ? `https://madplay.site/api/holly?id=${id}` : null;

    if (title && link && image && id) {
        movies.push({
            title,
            id,
            link: `https://madplay.site${link}`,
            image,
            streamAPI
        });
    }
});


        movieData = movies;
    } catch (error) {
        console.error("Error fetching HTML:", error.message);
    }
}

// 🔄 Call this once on startup
getHtml();

// 🟢 Optional: refresh movie data every X minutes
setInterval(getHtml, 1000 * 60 * 10); // every 10 minutes

// 🔻 Add endpoint to return scraped data
app.get("/api/movies", (req, res) => {
    res.json({ success: true, data: movieData });
});

app.listen(3001, () => {
    console.log("running at port 3001");
});
