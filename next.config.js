/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: false, // prevents buggy worker spawning
    },
}

module.exports = nextConfig;
