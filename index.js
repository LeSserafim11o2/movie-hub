const API_URL = "/api/movies"; // Vercel proxy
const DEFAULT_POSTER = "assets/NoPoster.jpg";

const elements = {
    movieContainer: document.getElementById("movieContainer"),
    movieDetail: document.getElementById("movieDetail"),
    movieName: document.getElementById("movieName"),
    genreSelect: document.getElementById("genreSelect"),
    pagination: document.getElementById("pagination"),
    showFavButton: document.querySelector(".show-fav-button"),
    logo: document.getElementById("logo"),
    detailPoster: document.getElementById("detailPoster"),
    detailTitle: document.getElementById("detailTitle"),
    detailOverview: document.getElementById("detailOverview"),
    detailDate: document.getElementById("detailDate"),
    detailRating: document.getElementById("detailRating"),
    detailGenres: document.getElementById("detailGenres"),
    detailCast: document.getElementById("detailCast"),
    detailTrailer: document.getElementById("detailTrailer"),
    searchButton: document.getElementById("searchButton")
};

const state = {
    currentUrl: "",
    currentPage: 1,
    isViewingFavorites: false,
    favoritesPage: 1
};

const cache = new Map();

async function getMovies(endpoint, page = 1, bypassCache = false, query = "") {
    elements.movieContainer.innerHTML = '<div class="loading-spinner active"><div class="spinner"></div></div>';
    const cacheKey = `${endpoint}&page=${page}${query ? `&${query}` : ""}`;
    if (!bypassCache && cache.has(cacheKey)) {
        renderMovies(cache.get(cacheKey));
        return;
    }
    try {
        const url = query
            ? `${API_URL}?endpoint=${encodeURIComponent(endpoint)}&page=${page}&query=${encodeURIComponent(query)}`
            : `${API_URL}?endpoint=${encodeURIComponent(endpoint)}&page=${page}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Không thể kết nối đến API!");
        const data = await response.json();
        cache.set(cacheKey, data);
        renderMovies(data);
        state.currentUrl = endpoint;
        state.currentPage = page;
    } catch (error) {
        elements.movieContainer.innerHTML = "<p>Đã có lỗi xảy ra, vui lòng kiểm tra kết nối mạng! 😢</p>";
        console.error("Lỗi khi gọi API:", error);
    }
}

function renderMovies(data) {
    elements.movieContainer.innerHTML = "";
    if (data.results && data.results.length > 0) {
        data.results.forEach(movie => {
            let movieCard = document.createElement("div");
            movieCard.classList.add("movie-card");

            let posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : DEFAULT_POSTER;
            let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
            let isFav = favorites.some(f => f.id === movie.id);
            let heartIcon = isFav ? "❤️" : "🤍";

            movieCard.innerHTML = `
                <img src="${posterUrl}" alt="${movie.title}" loading="lazy" onerror="this.src='${DEFAULT_POSTER}'">
                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <p>📅 ${movie.release_date || "Chưa có ngày chiếu"}</p>
                    <p>⭐ ${movie.vote_average || "?"}/10</p>
                    <button class="fav-btn">${heartIcon}</button>
                </div>
            `;

            movieCard.addEventListener("click", () => getMovieDetail(movie.id));
            movieCard.querySelector(".fav-btn").addEventListener("click", (event) => {
                event.stopPropagation();
                toggleFavorite(movie.id, movie.title, posterUrl, movie.release_date, movie.vote_average, movieCard.querySelector(".fav-btn"));
            });
            elements.movieContainer.appendChild(movieCard);
        });
        renderPagination(data.page, data.total_pages, state.currentUrl, false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
        elements.movieContainer.innerHTML = "<p>Không tìm thấy phim nào!</p>";
    }
}

function searchMovies(e) {
    e.preventDefault();
    let movieName = elements.movieName.value.trim();
    if (!movieName) {
        alert("Vui lòng nhập tên phim!");
        return;
    }
    let searchEndpoint = `/search/movie`;
    let searchQuery = `query=${encodeURIComponent(movieName)}`;
    state.currentUrl = searchEndpoint;
    state.isViewingFavorites = false;
    state.currentPage = 1;
    getMovies(searchEndpoint, 1, false, searchQuery);
    saveSearch(movieName);
}

async function getMovieDetail(movieId) {
    try {
        const [movieRes, castRes, videoRes] = await Promise.all([
            fetch(`${API_URL}?endpoint=/movie/${movieId}`),
            fetch(`${API_URL}?endpoint=/movie/${movieId}/credits`),
            fetch(`${API_URL}?endpoint=/movie/${movieId}/videos&language=en-US`)
        ]);
        if (!movieRes.ok || !castRes.ok || !videoRes.ok) throw new Error("Không thể lấy thông tin phim!");
        const movie = await movieRes.json();
        const castData = await castRes.json();
        const videoData = await videoRes.json();

        let posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : DEFAULT_POSTER;
        
        elements.detailPoster.src = posterUrl;
        elements.detailPoster.alt = `${movie.title} poster`;
        elements.detailPoster.onerror = () => { elements.detailPoster.src = DEFAULT_POSTER; };
        elements.detailTitle.textContent = movie.title;
        elements.detailOverview.textContent = movie.overview || "Không có mô tả.";
        elements.detailDate.textContent = movie.release_date || "Chưa rõ";
        elements.detailRating.textContent = movie.vote_average || "?";
        elements.detailGenres.textContent = movie.genres.map(g => g.name).join(", ") || "Không rõ";

        elements.detailCast.innerHTML = "";
        castData.cast.slice(0, 5).forEach(actor => {
            let actorTag = document.createElement("span");
            actorTag.textContent = actor.name;
            elements.detailCast.appendChild(actorTag);
        });

        elements.detailTrailer.innerHTML = "";
        let trailer = videoData.results.find(v => v.site === "YouTube" && v.type === "Trailer");
        if (trailer) {
            elements.detailTrailer.innerHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/${trailer.key}" 
                    allowfullscreen
                    title="Trailer phim ${movie.title}"
                ></iframe>
            `;
        } else {
            elements.detailTrailer.innerHTML = "<p>Không tìm thấy trailer 🥲</p>";
        }

        elements.movieDetail.classList.add("show");
        document.body.style.overflow = "hidden";
    } catch (error) {
        elements.movieContainer.innerHTML = "<p>Đã có lỗi khi lấy chi tiết phim! 😢</p>";
        console.error("Lỗi khi gọi API chi tiết:", error);
    }
}

async function getGenres() {
    try {
        const res = await fetch(`${API_URL}?endpoint=/genre/movie/list`);
        if (!res.ok) throw new Error("Không thể lấy thể loại!");
        const data = await res.json();
        elements.genreSelect.innerHTML = '<option value="">🎭 Tất cả thể loại</option>';
        data.genres.forEach(genre => {
            let option = document.createElement("option");
            option.value = genre.id;
            option.textContent = genre.name;
            elements.genreSelect.appendChild(option);
        });
    } catch (err) {
        elements.genreSelect.innerHTML = '<option value="">Không thể tải thể loại</option>';
        console.error("Lỗi khi lấy thể loại:", err);
    }
}

function filterByGenre() {
    let genreId = elements.genreSelect.value;
    let endpoint = genreId ? `/discover/movie&with_genres=${genreId}` : "/movie/popular";
    state.currentUrl = endpoint;
    state.isViewingFavorites = false;
    getMovies(endpoint, 1, true);
}

function toggleFavorite(id, title, posterUrl, releaseDate, voteAverage, btn) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const index = favorites.findIndex(movie => movie.id === id);
    if (index > -1) {
        if (confirm(`Bạn có muốn xóa "${title}" khỏi danh sách yêu thích?`)) {
            favorites.splice(index, 1);
            btn.textContent = "🤍";
        }
    } else {
        favorites.push({
            id,
            title,
            posterUrl: posterUrl || DEFAULT_POSTER,
            release_date: releaseDate,
            vote_average: voteAverage
        });
        btn.textContent = "❤️";
    }
    localStorage.setItem("favorites", JSON.stringify(favorites));
    if (state.isViewingFavorites) {
        showFavorites(state.favoritesPage);
    }
}

function showFavorites(page = 1) {
    state.isViewingFavorites = true;
    state.favoritesPage = page;
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    elements.movieContainer.innerHTML = "";
    elements.pagination.innerHTML = "";

    if (favorites.length === 0) {
        elements.movieContainer.innerHTML = "<p>Danh sách yêu thích trống 😢</p>";
        return;
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(favorites.length / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedFavorites = favorites.slice(start, end);

    paginatedFavorites.forEach(movie => {
        let posterUrl = movie.posterUrl && movie.posterUrl !== "" ? movie.posterUrl : DEFAULT_POSTER;
        let movieCard = document.createElement("div");
        movieCard.classList.add("movie-card");

        movieCard.innerHTML = `
            <img src="${posterUrl}" alt="${movie.title}" loading="lazy" onerror="this.src='${DEFAULT_POSTER}'">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>📅 ${movie.release_date || "Chưa có ngày chiếu"}</p>
                <p>⭐ ${movie.vote_average || "?"}/10</p>
                <button class="fav-btn">❤️</button>
            </div>
        `;

        movieCard.addEventListener("click", () => getMovieDetail(movie.id));
        movieCard.querySelector(".fav-btn").addEventListener("click", (event) => {
            event.stopPropagation();
            toggleFavorite(movie.id, movie.title, posterUrl, movie.release_date, movie.vote_average, movieCard.querySelector(".fav-btn"));
        });
        elements.movieContainer.appendChild(movieCard);
    });

    if (favorites.length > itemsPerPage) {
        renderPagination(page, totalPages, null, true);
    }
}

function closeDetail() {
    elements.movieDetail.classList.remove("show");
    document.body.style.overflow = "";
    let iframe = elements.detailTrailer.querySelector("iframe");
    if (iframe) {
        iframe.src = "";
    }
}

function onOverlayClick(e) {
    if (e.target === elements.movieDetail) {
        closeDetail();
    }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function saveSearch(query) {
    let searches = JSON.parse(localStorage.getItem("searches") || "[]");
    if (!searches.includes(query)) {
        searches.unshift(query);
        searches = searches.slice(0, 5);
        localStorage.setItem("searches", JSON.stringify(searches));
    }
}

function renderPagination(currentPage, totalPages, url, isFavorites = false) {
    elements.pagination.innerHTML = "";
    let maxPages = Math.min(totalPages, 5);
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    if (currentPage > 1) {
        let prevBtn = document.createElement("button");
        prevBtn.textContent = "⬅️";
        prevBtn.onclick = isFavorites 
            ? () => showFavorites(currentPage - 1)
            : () => getMovies(url, currentPage - 1);
        elements.pagination.appendChild(prevBtn);
    }

    for (let i = startPage; i <= endPage; i++) {
        let pageBtn = document.createElement("button");
        pageBtn.textContent = i;
        if (i === currentPage) pageBtn.classList.add("active");
        pageBtn.onclick = isFavorites 
            ? () => showFavorites(i)
            : () => getMovies(url, i);
        elements.pagination.appendChild(pageBtn);
    }

    if (currentPage < totalPages) {
        let nextBtn = document.createElement("button");
        nextBtn.textContent = "➡️";
        nextBtn.onclick = isFavorites 
            ? () => showFavorites(currentPage + 1)
            : () => getMovies(url, currentPage + 1);
        elements.pagination.appendChild(nextBtn);
    }
}

document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") closeDetail();
});

elements.logo.addEventListener("click", () => {
    let popularMoviesEndpoint = "/movie/popular";
    state.currentUrl = popularMoviesEndpoint;
    state.isViewingFavorites = false;
    getMovies(popularMoviesEndpoint, 1);
});

elements.showFavButton.addEventListener("click", () => {
    showFavorites(1);
});

elements.searchButton.addEventListener("click", searchMovies);

elements.movieName.addEventListener("input", debounce(() => {
    if (elements.movieName.value.trim()) {
        searchMovies(new Event("click"));
    }
}, 500));

elements.genreSelect.addEventListener("change", filterByGenre);

document.addEventListener("DOMContentLoaded", () => {
    if (!elements.movieContainer || !elements.genreSelect || !elements.searchButton) {
        console.error("Không tìm thấy movieContainer, genreSelect hoặc searchButton trong DOM!");
        return;
    }
    let popularMoviesEndpoint = "/movie/popular";
    state.currentUrl = popularMoviesEndpoint;
    getMovies(popularMoviesEndpoint, 1);
    getGenres();
});