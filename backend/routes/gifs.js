const router = require("express").Router();

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

// Curated coding, tech, and developer reaction GIFs to ensure the feature is fully operational
// out of the box even without a Giphy API key.
const FALLBACK_GIFS = [
  { id: "LmNtrgZ1x530MXVe0l", title: "Coding Keyboard", url: "https://media.giphy.com/media/LmNtrgZ1x530MXVe0l/giphy.gif" },
  { id: "3o7abKhOpu0NXS3HLG", title: "Success Kid", url: "https://media.giphy.com/media/3o7abKhOpu0NXS3HLG/giphy.gif" },
  { id: "26ufdipQqU2lhNA4g", title: "Mind Blown", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
  { id: "l0amJzVHIAfl7jMDc4", title: "Celebration Dance", url: "https://media.giphy.com/media/l0amJzVHIAfl7jMDc4/giphy.gif" },
  { id: "3o7qDEq2bMbcbPRVP2", title: "Applause", url: "https://media.giphy.com/media/3o7qDEq2bMbcbPRVP2/giphy.gif" },
  { id: "9Q09QVCBMrcPK", title: "Working Hard", url: "https://media.giphy.com/media/9Q09QVCBMrcPK/giphy.gif" },
  { id: "tIeCLkB8geYtW", title: "Thumbs Up", url: "https://media.giphy.com/media/tIeCLkB8geYtW/giphy.gif" },
  { id: "3o6Zt8qDiPE2d3kayI", title: "Thank You", url: "https://media.giphy.com/media/3o6Zt8qDiPE2d3kayI/giphy.gif" },
  { id: "XD9o33QG9BoMis7iM4", title: "Welcome", url: "https://media.giphy.com/media/XD9o33QG9BoMis7iM4/giphy.gif" },
  { id: "du3J3cXyzhj75IOgvA", title: "Need Coffee", url: "https://media.giphy.com/media/du3J3cXyzhj75IOgvA/giphy.gif" }
];

// GET /api/gifs/trending
router.get("/trending", async (req, res) => {
  if (!GIPHY_API_KEY) {
    return res.json({ gifs: FALLBACK_GIFS });
  }

  try {
    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=12&rating=g`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      return res.json({ gifs: FALLBACK_GIFS });
    }

    const gifs = data.data.map(item => ({
      id: item.id,
      title: item.title || "GIF",
      url: item.images?.fixed_height?.url || item.images?.original?.url
    })).filter(g => g.url);

    res.json({ gifs });
  } catch (error) {
    console.error("Giphy trending API error:", error);
    res.json({ gifs: FALLBACK_GIFS });
  }
});

// GET /api/gifs/search?q=query
router.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Search query is required" });
  }

  if (!GIPHY_API_KEY) {
    // Filter local fallback list by query keyword
    const filtered = FALLBACK_GIFS.filter(gif => 
      gif.title.toLowerCase().includes(query.toLowerCase())
    );
    return res.json({ gifs: filtered });
  }

  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=12&rating=g`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return res.json({ gifs: [] });
    }

    const gifs = data.data.map(item => ({
      id: item.id,
      title: item.title || "GIF",
      url: item.images?.fixed_height?.url || item.images?.original?.url
    })).filter(g => g.url);

    res.json({ gifs });
  } catch (error) {
    console.error("Giphy search API error:", error);
    res.status(500).json({ error: "Failed to query Giphy API" });
  }
});

module.exports = router;
