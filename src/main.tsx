import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isLegacyBackofficeHost } from "./lib/hosts";
import { detectImpersonationFromUrl } from "./lib/impersonation";

if (typeof window !== "undefined") detectImpersonationFromUrl();

if (typeof window !== "undefined" && isLegacyBackofficeHost()) {
  document.documentElement.innerHTML = `
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex, nofollow" />
      <title>404 – Not Found</title>
      <style>
        html, body { height: 100%; margin: 0; background: #0a0f1a; color: #e5e7eb;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .wrap { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .card { text-align: center; max-width: 480px; }
        .code { font-size: 72px; font-weight: 700; color: #3b82f6; margin: 0 0 8px; letter-spacing: 2px; }
        .title { font-size: 20px; font-weight: 600; margin: 0 0 12px; }
        .msg { font-size: 14px; color: #9ca3af; margin: 0; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="card">
          <p class="code">404</p>
          <p class="title">This site does not exist</p>
          <p class="msg">The address you entered is not available.</p>
        </div>
      </div>
    </body>
  `;
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
