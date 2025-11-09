class Film {
    /**
     * @param {number} id
     * @param {string} title
     * @param {number} owner
     * @param {boolean} privateFilm
     * @param {string=} watchDate   YYYY-MM-DD
     * @param {number=} rating      0..10
     * @param {boolean=} favorite
     * @param {object=} opts
     * @param {boolean=} opts.publicView  If true (or film is public), build public links
     * @param {string=} opts.apiBase      Prefix for URLs (default: '')
     */
    constructor(id, title, owner, privateFilm, watchDate, rating, favorite, opts = {}) {
        if (id !== undefined && id !== null) this.id = id;

        this.title = title;
        this.owner = owner;
        this.private = privateFilm;

        if (watchDate) this.watchDate = watchDate;
        if (rating !== undefined && rating !== null) this.rating = rating;
        if (favorite !== undefined && favorite !== null) this.favorite = favorite;

        const apiBase = opts.apiBase || '';
        const usePublic = (opts.publicView === true) || (privateFilm === false);

        // HATEOAS: self link (public vs owner context), plus canonical reviews collection
        if (usePublic) {
            this.self = `${apiBase}/api/films/public/${id}`;
            this.reviews = `${apiBase}/api/films/public/${id}/reviews`;
        } else {
            this.self = `${apiBase}/api/films/${id}`;
            this.reviews = `${apiBase}/api/films/${id}/reviews`;
        }
    }
}

module.exports = Film;
