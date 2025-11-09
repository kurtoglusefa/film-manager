class Review {
    /**
     * @param {number} filmId
     * @param {number} reviewerId
     * @param {boolean} completed
     * @param {string=} reviewDate  YYYY-MM-DD (when completed)
     * @param {number=} rating      0..10 (when completed)
     * @param {string=} review      <=1000 chars (when completed)
     * @param {object=} opts
     * @param {boolean=} opts.publicView  If true, link to public review URI
     * @param {string=} opts.apiBase      Prefix for URLs (default: '')
     */
    constructor(filmId, reviewerId, completed, reviewDate, rating, review, opts = {}) {
        this.filmId = filmId;
        this.reviewerId = reviewerId;
        this.completed = completed;

        if (reviewDate) this.reviewDate = reviewDate;
        if (rating !== undefined && rating !== null) this.rating = rating;
        if (review) this.review = review;

        const apiBase = opts.apiBase || '';
        const usePublic = opts.publicView === true;

        // HATEOAS: self link to the review resource (public or authenticated context)
        if (usePublic) {
            this.self = `${apiBase}/api/films/public/${filmId}/reviews/${reviewerId}`;
        } else {
            this.self = `${apiBase}/api/films/${filmId}/reviews/${reviewerId}`;
        }
    }
}

module.exports = Review;
