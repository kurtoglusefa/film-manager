class User {
    /**
     * @param {number} id
     * @param {string} name
     * @param {string} email
     * @param {string=} hash  (server-side only)
     * @param {object=} opts
     * @param {string=} opts.apiBase  Prefix for URLs (default: '')
     */
    constructor(id, name, email, hash, opts = {}) {
        if (id !== undefined && id !== null) this.id = id;

        this.name = name;
        this.email = email;

        if (hash) this.hash = hash;

        const apiBase = opts.apiBase || '';

        // HATEOAS: canonical user resource (adjust if you don’t expose /api/users/{id})
        this.self = `${apiBase}/api/users/${id}`;
    }
}

module.exports = User;
