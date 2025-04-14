export default async function handler(req, res) {
    const { endpoint, query, page } = req.query;
    const API_KEY = process.env.TMDB_API_KEY; // Lấy từ .env hoặc Vercel
    const url = `https://api.themoviedb.org/3${endpoint}?api_key=${API_KEY}${query ? `&${query}` : ""}${page ? `&page=${page}` : ""}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("TMDB API error");
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
}