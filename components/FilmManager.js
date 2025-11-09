class FilmManager {
    /**
     * Root discovery document with collection links.
     * @param {object=} opts
     * @param {string=} opts.apiBase  Prefix for URLs (default: '')
     */
    constructor(opts = {}) {
        const apiBase = opts.apiBase || '';

        // Collections
        this.films = `${apiBase}/api/films/me`;                // films owned by current user
        this.privateFilms = `${apiBase}/api/films/me?visibility=private`; // optional filter (implement if desired)
        this.publicFilms = `${apiBase}/api/films/public`;      // public catalog
        this.invitedPublicFilms = `${apiBase}/api/films/reviews/me`; // films I’m invited to review
        this.reviewAssignments = `${apiBase}/api/reviews/auto-assign`; // optional admin endpoint

        // Users & auth (adjust if you expose /api/users)
        this.users = `${apiBase}/api/users`;
        this.usersAuthenticator = `${apiBase}/api/sessions/current`;
    }
}

module.exports = FilmManager;
