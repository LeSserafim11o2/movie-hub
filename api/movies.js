export default async function handler(req, res) {
  const { endpoint, query, page } = req.query;
  const API_KEY = process.env.TMDB_API_KEY;
  if (!API_KEY) {
      return res.status(500).json({ error: "Missing TMDB_API_KEY" });
  }
  const endpointClean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const queryString = query ? `&${query}` : "";
  const url = `https://api.themoviedb.org/3${endpointClean}?api_key=${API_KEY}${queryString}${page ? `&page=${page}` : ""}`;
  
  try {
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error(`TMDB API error: ${response.status}`);
      }
      const data = await response.json();
      res.status(200).json(data);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
}