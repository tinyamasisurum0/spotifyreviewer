/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
      {
        protocol: 'https',
        hostname: 'image-cdn-fa.spotifycdn.com',
      },
      {
        protocol: 'https',
        hostname: 'image-cdn-ak.spotifycdn.com',
      },
    ],
  },
};

export default nextConfig;
