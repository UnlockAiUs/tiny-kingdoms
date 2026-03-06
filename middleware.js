import { next } from '@vercel/functions';

const AUTH_REALM = 'Tiny Kingdoms';

function unauthorized() {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'Cache-Control': 'no-store',
      'WWW-Authenticate': `Basic realm="${AUTH_REALM}", charset="UTF-8"`,
    },
  });
}

export const config = {
  matcher: '/:path*',
  runtime: 'nodejs',
};

export default function middleware(request) {
  const expectedUsername = process.env.BASIC_AUTH_USERNAME;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return new Response('Authentication is not configured.', {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  const authorization = request.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Basic ')) {
    return unauthorized();
  }

  let decodedCredentials;
  try {
    decodedCredentials = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
  } catch {
    return unauthorized();
  }

  const separatorIndex = decodedCredentials.indexOf(':');
  if (separatorIndex === -1) {
    return unauthorized();
  }

  const suppliedUsername = decodedCredentials.slice(0, separatorIndex);
  const suppliedPassword = decodedCredentials.slice(separatorIndex + 1);

  if (
    suppliedUsername !== expectedUsername ||
    suppliedPassword !== expectedPassword
  ) {
    return unauthorized();
  }

  return next();
}
