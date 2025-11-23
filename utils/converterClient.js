'use strict';

const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = path.join(__dirname, '../grpc/conversion.proto');

// Load proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const conversionProto = grpc.loadPackageDefinition(packageDefinition).conversion;

// gRPC client (Java server listens on 50051 by default)
const converterClient = new conversionProto.Converter(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

/**
 * Convert an image file using the Converter gRPC service.
 *
 * @param {string} sourcePath - path to original image file
 * @param {string} originExt  - without dot: 'png' | 'jpg' | 'gif'
 * @param {string} targetExt  - without dot: 'png' | 'jpg' | 'gif'
 * @returns {Promise<Buffer>} - converted image bytes
 */
function convertImage(sourcePath, originExt, targetExt) {
  return new Promise((resolve, reject) => {
    const call = converterClient.fileConvert();

    let successMeta = null; // true/false/null
    const chunks = [];
    let finished = false;

    const finishOk = (buffer) => {
      if (finished) return;
      finished = true;
      resolve(buffer);
    };

    const finishErr = (err) => {
      if (finished) return;
      finished = true;
      reject(err);
    };

    // Receive from server
    call.on('data', (reply) => {
      if (reply.meta) {
        successMeta = reply.meta.success;
        if (!successMeta) {
          return finishErr(new Error(reply.meta.error || 'Conversion failed'));
        }
      } else if (reply.file) {
        chunks.push(reply.file);
      }
    });

    call.on('error', (err) => {
      finishErr(err);
    });

    call.on('end', () => {
      if (successMeta === true) {
        finishOk(Buffer.concat(chunks));
      } else if (successMeta === null) {
        finishErr(new Error('No metadata reply from converter'));
      }
      // if successMeta === false, we already rejected
    });

    // Send to server: meta + file chunks
    // 1) meta
    call.write({
      meta: {
        file_type_origin: originExt,
        file_type_target: targetExt,
      }
    });

    // 2) file chunks
    const readStream = fs.createReadStream(sourcePath);
    readStream.on('data', (chunk) => {
      call.write({ file: chunk });
    });
    readStream.on('error', (err) => {
      finishErr(err);
      call.end();
    });
    readStream.on('end', () => {
      call.end();
    });
  });
}
module.exports = {
  convertImage,
};
