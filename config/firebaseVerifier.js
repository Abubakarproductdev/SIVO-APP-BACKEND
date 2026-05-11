const https = require('https');
const jwt = require('jsonwebtoken');

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'sivoapp1';
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts = null;
let certsExpireAt = 0;

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let body = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Firebase cert request failed with ${response.statusCode}`));
          return;
        }

        const cacheControl = response.headers['cache-control'] || '';
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
        const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

        try {
          resolve({
            data: JSON.parse(body),
            expiresAt: Date.now() + maxAgeSeconds * 1000,
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    request.setTimeout(10000, () => {
      request.destroy(new Error('Firebase cert request timed out'));
    });
    request.on('error', reject);
  });
}

async function getFirebaseCerts(forceRefresh = false) {
  if (!forceRefresh && cachedCerts && certsExpireAt > Date.now()) {
    return cachedCerts;
  }

  const response = await getJson(CERTS_URL);
  cachedCerts = response.data;
  certsExpireAt = response.expiresAt;
  return cachedCerts;
}

async function verifyFirebaseIdToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: true });

  if (!decoded?.header?.kid) {
    throw new Error('Invalid Firebase token header.');
  }

  let certs = await getFirebaseCerts();
  let cert = certs[decoded.header.kid];

  if (!cert) {
    certs = await getFirebaseCerts(true);
    cert = certs[decoded.header.kid];
  }

  if (!cert) {
    throw new Error('Firebase token signing certificate not found.');
  }

  const payload = jwt.verify(idToken, cert, {
    algorithms: ['RS256'],
    audience: FIREBASE_PROJECT_ID,
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
  });

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Firebase token is missing subject.');
  }

  return {
    uid: payload.sub,
    email: payload.email || '',
    name: payload.name || '',
    picture: payload.picture || '',
  };
}

module.exports = {
  verifyFirebaseIdToken,
};
