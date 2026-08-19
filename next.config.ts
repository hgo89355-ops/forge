import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * In a Codespace the browser reaches the dev server through a forwarded
   * host like `name-3000.app.github.dev`, while the server itself is bound to
   * localhost. Next treats that as a cross-origin dev request and blocks the
   * internal `/_next/*` assets unless the host is listed here, which shows up
   * as a page that loads but has no styles and no interactivity.
   */
  allowedDevOrigins: ["*.app.github.dev", "*.github.dev", "*.githubpreview.dev"],
};

export default nextConfig;
