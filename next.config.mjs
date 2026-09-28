/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1440, 1920],
    imageSizes: [96, 160, 240, 320],
    // Every q the project asks for; the optimizer rejects anything else. 75 default (ShopFront, Composer,
    // admin), 82 (Photo, Lifestyle, year cards, Instagram grid), 85 (lightbox), 72 (scripts/snapshot.mjs).
    qualities: [72, 75, 82, 85],
  },
  async redirects() {
    return [{ source: '/', destination: '/th', permanent: false }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // A design study: never indexed (context/patterns/concept-disclosure.md).
          { key: 'X-Robots-Tag', value: 'noindex, noimageindex' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default nextConfig;
