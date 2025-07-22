const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 5000;
app.use(cors());

app.get('/api/stream', async (req, res) => {
  try {
    const token = req.query.t;
    if (!token) return res.status(400).send('Missing token');

    const apiUrl = `https://animotvslash.p2pplay.pro/api/v1/player?t=${token}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://animotvslash.p2pplay.pro/',
    };

    const response = await axios.get(apiUrl, { headers });
    res.json(response.data);
  } catch (err) {
    console.error('Failed to get stream:', err.message);
    res.status(500).send('Error fetching stream');
  }
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));