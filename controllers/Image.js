'use strict';

const utils = require('../utils/writer');
const ImageService = require('../service/ImageService');

function handleError(res, err) {
    if (typeof err === 'string') {
        switch (err) {
            case 'NO_FILMS':
            case 'NO_IMAGES':
                return utils.writeJson(res, { error: err }, 404);
            case 'NO_PUBLIC_FILM':
            case 'USER_NOT_AUTHORIZED':
            case 'USER_NOT_OWNER':
                return utils.writeJson(res, { error: err }, 403);
            case 'UNSUPPORTED_MEDIA_TYPE':
                return utils.writeJson(res, { error: err }, 415);
            case 'NO_FILE':
                return utils.writeJson(res, { error: err }, 400);
            case 'FILE_NOT_FOUND':
                return utils.writeJson(res, { error: err }, 500);
            default:
                return utils.writeJson(res, { error: err }, 400);
        }
    }
    console.error(err);
    return utils.writeJson(res, { error: 'Internal server error' }, 500);
}

exports.addImage = function (req, res, next, filmId) {
    ImageService.addImage(req.user.id, filmId, req.file)
        .then((image) => {
            res.setHeader('Location', image.self);
            utils.writeJson(res, image, 201);
        })
        .catch((err) => handleError(res, err));
};

exports.listImages = function (req, res, next, filmId) {
    ImageService.listImages(req.user.id, filmId)
        .then((images) => {
            utils.writeJson(res, images, 200);
        })
        .catch((err) => handleError(res, err));
};
exports.getImage = function (req, res, next, filmId, imageId) {
    const acceptHeader = req.headers['accept'] || '';

    ImageService.getImage(req.user.id, filmId, imageId, acceptHeader)
        .then((result) => {
            if (result.kind === 'json') {
                utils.writeJson(res, result.image, 200);
            } else {
                res.status(200);
                res.setHeader('Content-Type', result.contentType);
                res.sendFile(result.filePath, (err) => {
                    if (err) {
                        console.error('sendFile error:', err);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'FILE_SEND_ERROR' });
                        }
                    }
                });
            }
        })
        .catch((err) => handleError(res, err));
};


exports.deleteImage = function (req, res, next, filmId, imageId) {
    ImageService.deleteImage(req.user.id, filmId, imageId)
        .then(() => {
            res.status(204).end();
        })
        .catch((err) => handleError(res, err));
};
