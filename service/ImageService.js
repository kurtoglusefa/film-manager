'use strict';

const db = require('../components/db');
const path = require('path');
const fs = require('fs');
const { uploadDir } = require('../storage');
const { convertImage } = require('../utils/converterClient');

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];

const mimeToExt = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
};

const extToMime = {
    png: 'image/png',
    jpg: 'image/jpeg',
    gif: 'image/gif',
};

/**
 * Check if user is owner or invited reviewer of a public film.
 */
function checkUserCanAccessPublicFilm(userId, filmId) {
    return new Promise((resolve, reject) => {
        const sql = `
      SELECT f.id, f.owner, f.private
      FROM films f
      WHERE f.id = ?
    `;
        db.get(sql, [filmId], (err, film) => {
            if (err) return reject(err);
            if (!film) return reject('NO_FILMS');
            if (film.private === 1) return reject('NO_PUBLIC_FILM');

            if (film.owner === userId) {
                return resolve({ film, role: 'owner' });
            }
            // check reviewer
            const sqlRev = `
        SELECT 1
        FROM reviews r
        WHERE r.filmId = ? AND r.reviewerId = ?
      `;
            db.get(sqlRev, [filmId, userId], (err2, row) => {
                if (err2) return reject(err2);
                if (!row) return reject('USER_NOT_AUTHORIZED');
                resolve({ film, role: 'reviewer' });
            });
        });
    });
}

/**
 * Owner-only check (public film).
 */
function checkOwnerOfPublicFilm(userId, filmId) {
    return new Promise((resolve, reject) => {
        const sql = `
      SELECT f.id, f.owner, f.private
      FROM films f
      WHERE f.id = ?
    `;
        db.get(sql, [filmId], (err, film) => {
            if (err) return reject(err);
            if (!film) return reject('NO_FILMS');
            if (film.private === 1) return reject('NO_PUBLIC_FILM');
            if (film.owner !== userId) return reject('USER_NOT_OWNER');
            resolve(film);
        });
    });
}

/**
 * Add image (owner only).
 */
exports.addImage = function (userId, filmId, file) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!file) {
                return reject('NO_FILE');
            }
            if (!ALLOWED_MIME.includes(file.mimetype)) {
                // remove uploaded file
                try { fs.unlinkSync(file.path); } catch (e) { }
                return reject('UNSUPPORTED_MEDIA_TYPE');
            }

            await checkOwnerOfPublicFilm(userId, filmId);

            const sql = `
        INSERT INTO images(filmId, filename, mediaType)
        VALUES (?, ?, ?)
      `;
            db.run(sql, [filmId, file.filename, file.mimetype], function (err) {
                if (err) return reject(err);

                const id = this.lastID;
                const image = {
                    id,
                    filmId: Number(filmId),
                    filename: file.filename,
                    mediaType: file.mimetype,
                    self: `/api/films/public/${filmId}/images/${id}`,
                };
                resolve(image);
            });
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * List images (owner or reviewer).
 */
exports.listImages = function (userId, filmId) {
    return new Promise(async (resolve, reject) => {
        try {
            await checkUserCanAccessPublicFilm(userId, filmId);

            const sql = `
        SELECT id, filmId, filename, mediaType
        FROM images
        WHERE filmId = ?
      `;
            db.all(sql, [filmId], (err, rows) => {
                if (err) return reject(err);
                const images = rows.map((row) => ({
                    id: row.id,
                    filmId: row.filmId,
                    filename: row.filename,
                    mediaType: row.mediaType,
                    self: `/api/films/public/${filmId}/images/${row.id}`,
                }));
                resolve(images);
            });
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Get image metadata row and auth-check.
 */
function getImageRow(userId, filmId, imageId) {
    return new Promise(async (resolve, reject) => {
        try {
            await checkUserCanAccessPublicFilm(userId, filmId);

            const sql = `
        SELECT id, filmId, filename, mediaType
        FROM images
        WHERE id = ? AND filmId = ?
      `;
            db.get(sql, [imageId, filmId], (err, row) => {
                if (err) return reject(err);
                if (!row) return reject('NO_IMAGES');
                resolve(row);
            });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Get image — either JSON or file, depending on Accept header.
 *
 * Returns:
 *  { kind: 'json', image }
 *  OR
 *  { kind: 'file', contentType, filePath }
 */
exports.getImage = function (userId, filmId, imageId, acceptHeader) {
    return new Promise(async (resolve, reject) => {
        try {
            const image = await getImageRow(userId, filmId, imageId);
            const requested = (acceptHeader || '').split(',')[0].trim().toLowerCase();

            if (!requested || requested === '*/*' || requested === 'application/json') {
                return resolve({
                    kind: 'json',
                    image: {
                        id: image.id,
                        filmId: image.filmId,
                        filename: image.filename,
                        mediaType: image.mediaType,
                        self: `/api/films/public/${filmId}/images/${image.id}`,
                    },
                });
            }

            if (!ALLOWED_MIME.includes(requested)) {
                return reject('UNSUPPORTED_MEDIA_TYPE');
            }

            const storedMime = image.mediaType;
            const storedExt = mimeToExt[storedMime];
            const targetExt = mimeToExt[requested];
            const baseName = path.basename(image.filename, path.extname(image.filename));

            const originalPath = path.join(uploadDir, `${baseName}.${storedExt}`);
            if (!fs.existsSync(originalPath)) {
                return reject('FILE_NOT_FOUND');
            }

            // If we already have that type stored locally, just serve it.
            const targetPath = path.join(uploadDir, `${baseName}.${targetExt}`);
            if (storedExt === targetExt && fs.existsSync(originalPath)) {
                return resolve({
                    kind: 'file',
                    contentType: storedMime,
                    filePath: originalPath,
                });
            }

            if (fs.existsSync(targetPath)) {
                // conversion was done in the past, reuse
                return resolve({
                    kind: 'file',
                    contentType: extToMime[targetExt],
                    filePath: targetPath,
                });
            }

            // Need conversion via gRPC
            const buffer = await convertImage(originalPath, storedExt, targetExt);
            fs.writeFileSync(targetPath, buffer);

            resolve({
                kind: 'file',
                contentType: extToMime[targetExt],
                filePath: targetPath,
            });
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Delete image (owner only) + all local variants.
 */
exports.deleteImage = function (userId, filmId, imageId) {
    return new Promise(async (resolve, reject) => {
        try {
            await checkOwnerOfPublicFilm(userId, filmId);

            const sql = `
        SELECT id, filmId, filename, mediaType
        FROM images
        WHERE id = ? AND filmId = ?
      `;
            db.get(sql, [imageId, filmId], (err, row) => {
                if (err) return reject(err);
                if (!row) return reject('NO_IMAGES');

                const baseName = path.basename(row.filename, path.extname(row.filename));

                // Delete DB row first
                const delSql = 'DELETE FROM images WHERE id = ?';
                db.run(delSql, [imageId], (err2) => {
                    if (err2) return reject(err2);

                    // Now delete files (all 3 possible extensions)
                    ['png', 'jpg', 'gif'].forEach((ext) => {
                        const p = path.join(uploadDir, `${baseName}.${ext}`);
                        if (fs.existsSync(p)) {
                            try { fs.unlinkSync(p); } catch (e) { }
                        }
                    });

                    resolve();
                });
            });
        } catch (err) {
            reject(err);
        }
    });
};
