/**
 * Cloudflare Worker — Level 0 — Night (memory tag)
 * Serves static assets from the /public directory
 */
export default {
  async fetch(request, env) {
    // Let Workers Assets handle all static file serving
    return env.ASSETS.fetch(request);
  },
};
