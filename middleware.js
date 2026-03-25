export const config = {
  matcher: '/:path*',
};

export default function middleware(request) {
  // 1. Figure out which page they are trying to access
  const url = new URL(request.url);
  const isReporting = url.pathname.startsWith('/reporting');

  // 2. Select the correct credentials based on the page
  const expectedUser = isReporting ? process.env.REPORT_AUTH_USER : process.env.BASIC_AUTH_USER;
  const expectedPass = isReporting ? process.env.REPORT_AUTH_PASSWORD : process.env.BASIC_AUTH_PASSWORD;
  const realmName = isReporting ? "Management Reporting" : "PE Fund Time Tracker";

  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    const basicAuth = authHeader.split(' ')[1];
    const [user, password] = atob(basicAuth).split(':');

    if (user === expectedUser && password === expectedPass) {
      return new Response(null, { headers: { 'x-middleware-next': '1' } });
    }
  }

  // 3. If they fail, prompt them with the correct realm name
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realmName}"`,
    },
  });
}
