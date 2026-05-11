// dummyBooks comes from data.js

// Pre-process books to match app structure and handle missing fields
const books = dummyBooks
    .filter(b => b.Titulo && b.Titulo.trim() !== '' && b.Titulo !== 'TÍTULO' && b.Autor && b.Autor.trim() !== '')
    .map(b => ({
    id: b.Id,
    title: b.Titulo,
    author: b.Autor,
    publication_year: b.Anio || "",
    target_age: "todos", // We don't have explicit target age in this dataset
    genres: b.Genero ? b.Genero.split(',').map(g => g.trim()) : [],
    themes: b.Etiquetas ? b.Etiquetas.split(',').map(e => e.trim()) : [],
    settings: b.Pais ? [b.Pais] : [],
    characters: [], // No characters field in current data
    synopsis: b.Sinopsis || "No hay sinopsis disponible.",
    cover_image: `portadas/${b.Id}.jpg`
}));

// Mezclar aleatoriamente el array de libros para que no aparezcan siempre los mismos al inicio
for (let i = books.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [books[i], books[j]] = [books[j], books[i]];
}

document.addEventListener('DOMContentLoaded', () => {
    // Populate Genres (only take top 20 genres to avoid clutter, there might be many)
    const genreCounts = {};
    books.forEach(b => {
        b.genres.forEach(g => {
            if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
    });
    const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(x => x[0]);

    const genreContainer = document.getElementById('genreFilters');
    sortedGenres.forEach(genre => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.textContent = genre;
        chip.dataset.value = genre;
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            filterBooks();
        });
        genreContainer.appendChild(chip);
    });

    document.getElementById('searchInput').addEventListener('input', filterBooks);
    document.getElementById('targetAgeFilter').addEventListener('change', filterBooks);
    document.getElementById('closeModal').addEventListener('click', closeModal);

    // Initial Render (only render first 50 to avoid lagging the browser initially)
    renderBooks(books.slice(0, 50));

    // Render Itineraries
    renderItineraries();
});

let currentItineraryBookIds = null;

function renderItineraries() {
    // Si dummyItineraries no existe aún, usa array vacío
    const itinerariesRaw = typeof dummyItineraries !== 'undefined' ? dummyItineraries : [];

    // Filtramos la fila de encabezados si se exportó
    const itineraries = itinerariesRaw.filter(it => it.Titulo && it.Titulo !== 'Titulo' && it.Titulo !== 'Título');

    const container = document.getElementById('itineraryList');
    container.innerHTML = '';

    if (itineraries.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem">Aún no hay itinerarios.</p>';
        return;
    }

    itineraries.forEach(it => {
        const div = document.createElement('div');
        div.className = 'itinerary-item';
        div.innerHTML = `<h4>${it.Titulo}</h4><p>${it.Descripcion || ''}</p>`;
        div.onclick = () => {
            // Check if user clicked the same itinerary to deselect it
            if (div.classList.contains('active-itinerary')) {
                div.classList.remove('active-itinerary');
                currentItineraryBookIds = null;
            } else {
                document.querySelectorAll('.itinerary-item').forEach(i => i.classList.remove('active-itinerary'));
                div.classList.add('active-itinerary');

                if (it.Libros) {
                    currentItineraryBookIds = it.Libros.split(',').map(id => id.trim());
                } else {
                    currentItineraryBookIds = [];
                }
            }

            document.getElementById('searchInput').value = '';
            document.getElementById('targetAgeFilter').value = 'todos';
            document.querySelectorAll('.chip.active').forEach(c => c.classList.remove('active'));
            filterBooks();
        };
        container.appendChild(div);
    });
}

function filterBooks() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const targetAge = document.getElementById('targetAgeFilter').value;
    const activeGenres = Array.from(document.querySelectorAll('.chip.active')).map(c => c.dataset.value);

    let filtered = books;

    // Filter by itinerary first
    if (currentItineraryBookIds) {
        filtered = filtered.filter(book => currentItineraryBookIds.includes(book.id));
    }

    if (searchTerm || activeGenres.length > 0 || targetAge !== 'todos') {
        filtered = filtered.filter(book => {
            const textMatch = !searchTerm ||
                book.title.toLowerCase().includes(searchTerm) ||
                book.author.toLowerCase().includes(searchTerm) ||
                book.synopsis.toLowerCase().includes(searchTerm) ||
                book.themes.some(t => t.toLowerCase().includes(searchTerm));

            const ageMatch = targetAge === 'todos' || book.target_age === targetAge;
            const genreMatch = activeGenres.length === 0 || activeGenres.some(g => book.genres.includes(g));

            return textMatch && ageMatch && genreMatch;
        });
    }

    // Render max 50 results for performance
    renderBooks(filtered.slice(0, 50));
}

function renderBooks(booksToRender) {
    const grid = document.getElementById('bookGrid');
    grid.innerHTML = '';

    if (booksToRender.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">No se encontraron libros que coincidan con tu búsqueda.</p>';
        return;
    }

    booksToRender.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.onclick = () => openModal(book);

        card.innerHTML = `
            <img src="${book.cover_image}" alt="${book.title}" class="book-cover" onerror="this.src='https://placehold.co/400x600/1e293b/f8fafc?text=Sin+Portada'">
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <span class="book-author">${book.author}</span>
                <div class="book-tags">
                    ${book.genres.slice(0, 2).map(g => `<span class="tag">${g}</span>`).join('')}
                    ${book.themes.slice(0, 2).map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function openModal(book) {
    const modal = document.getElementById('bookModal');
    const body = document.getElementById('modalBody');

    body.innerHTML = `
        <img src="${book.cover_image}" alt="${book.title}" class="modal-cover" onerror="this.src='https://placehold.co/400x600/1e293b/f8fafc?text=Sin+Portada'">
        <div class="modal-details">
            <h2 class="modal-title">${book.title}</h2>
            <div class="modal-meta">
                <span>👤 ${book.author}</span>
                <span>📅 ${book.publication_year}</span>
            </div>
            
            <p class="modal-synopsis">${book.synopsis}</p>
            
            <div class="detail-section">
                <h4>Etiquetas</h4>
                <div class="book-tags" style="margin-top:0">
                    ${book.genres.map(g => `<span class="tag" style="background:rgba(99,102,241,0.2); color:#818cf8">${g}</span>`).join('')}
                    ${book.themes.map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
            </div>
            
            ${book.settings.length > 0 ? `
            <div class="detail-section">
                <h4>País</h4>
                <span style="color:var(--text-muted); font-size:0.9rem">🌍 ${book.settings.join(', ')}</span>
            </div>` : ''}
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('bookModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}
