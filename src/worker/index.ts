/**
 * Redefine-X Version API - Cloudflare Worker
 * Author: Jason-JP-Yang
 * GitHub: https://github.com/Jason-JP-Yang/hexo-theme-Redefine-X
 * Based on hexo-theme-redefine by EvanNotFound
 */

export interface Env {
  VERSION_CACHE: KVNamespace;
  REFRESH_SECRET: string;
}

interface VersionData {
  npmVersion: string;
  jsdelivrCDN: boolean;
  unpkgCDN: boolean;
  cdnjsCDN: boolean;
  zstaticCDN: boolean;
  npmmirrorCDN: boolean;
  lastUpdated: number;
}

// 获取npm最新版本
async function fetchNPMVersion(): Promise<string> {
  try {
    const response = await fetch(
      "https://registry.npmjs.org/hexo-theme-redefine-x"
    );
    const data = await response.json() as any;
    return data["dist-tags"].latest;
  } catch (error) {
    console.error("Failed to fetch npm version:", error);
    return "unknown";
  }
}

// 测试CDN可用性
async function testCDN(baseUrl: string, version: string): Promise<boolean> {
  const url = baseUrl.replace("{version}", version);
  let attempts = 0;
  let success = false;

  while (attempts < 3 && !success) {
    attempts++;
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        success = true;
      }
    } catch (error) {
      // 继续尝试
    }
  }

  return success;
}

// 刷新版本数据
async function refreshVersionData(env: Env): Promise<VersionData> {
  const npmVersion = await fetchNPMVersion();

  const [
    jsdelivrCDN,
    unpkgCDN,
    cdnjsCDN,
    zstaticCDN,
    npmmirrorCDN,
  ] = await Promise.all([
    testCDN(
      "https://cdn.jsdelivr.net/npm/hexo-theme-redefine-x@{version}/source/js/build/main.js",
      npmVersion
    ),
    testCDN(
      "https://unpkg.com/hexo-theme-redefine-x@{version}/source/js/build/main.js",
      npmVersion
    ),
    testCDN(
      "https://cdnjs.cloudflare.com/ajax/libs/hexo-theme-redefine-x/{version}/source/js/build/main.js",
      npmVersion
    ),
    testCDN(
      "https://s4.zstatic.net/ajax/libs/hexo-theme-redefine-x/{version}/source/js/build/main.js",
      npmVersion
    ),
    testCDN(
      "https://registry.npmmirror.com/hexo-theme-redefine-x/{version}/files/source/js/build/main.js",
      npmVersion
    ),
  ]);

  const versionData: VersionData = {
    npmVersion,
    jsdelivrCDN,
    unpkgCDN,
    cdnjsCDN,
    zstaticCDN,
    npmmirrorCDN,
    lastUpdated: Date.now(),
  };

  // 保存到KV
  await env.VERSION_CACHE.put("versionData", JSON.stringify(versionData));

  return versionData;
}

// 主处理函数
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // API Routes
    if (pathname === "/api/v2/info" || pathname === "/api/info") {
      try {
        const cached = await env.VERSION_CACHE.get("versionData");
        
        if (!cached) {
          // 如果没有缓存，立即刷新
          const data = await refreshVersionData(env);
          return new Response(JSON.stringify({
            status: "success",
            ...data,
          }), { headers: corsHeaders });
        }

        const data = JSON.parse(cached);
        return new Response(JSON.stringify({
          status: "success",
          ...data,
        }), { headers: corsHeaders });
      } catch (error: any) {
        return new Response(JSON.stringify({
          status: "error",
          message: "Failed to fetch version info",
          error: error.message,
        }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // 手动刷新端点（需要secret key）
    if (pathname === "/api/refresh") {
      // 只接受POST请求
      if (request.method !== "POST") {
        return new Response(JSON.stringify({
          status: "error",
          message: "Method Not Allowed. Use POST request.",
        }), { 
          status: 405, 
          headers: corsHeaders 
        });
      }

      // 验证secret key
      const authHeader = request.headers.get("Authorization");
      const secretKey = authHeader?.replace("Bearer ", "");
      
      if (!secretKey || secretKey !== env.REFRESH_SECRET) {
        return new Response(JSON.stringify({
          status: "error",
          message: "Unauthorized. Invalid or missing secret key.",
        }), { 
          status: 401, 
          headers: corsHeaders 
        });
      }

      // 执行刷新
      try {
        const data = await refreshVersionData(env);
        return new Response(JSON.stringify({
          status: "success",
          message: "Version data refreshed",
          ...data,
        }), { headers: corsHeaders });
      } catch (error: any) {
        return new Response(JSON.stringify({
          status: "error",
          message: "Error refreshing",
          error: error.message,
        }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // 主页
    if (pathname === "/") {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefine-X Version API</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: white;
      color: black;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    a {
      color: #000000;
      text-decoration: none;
      border-bottom: 2px solid #000000;
    }
    a:hover {
      opacity: 0.8;
    }
    .info {
      margin-top: 2rem;
      font-size: 0.9rem;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Redefine-X Version API</h1>
    <p>API for fetching the latest version of hexo-theme-redefine-x</p>
    <a href="https://github.com/Jason-JP-Yang/hexo-theme-Redefine-X" target="_blank">
      GitHub Repository
    </a>
    <div class="info">
      <p>Endpoints:</p>
      <p>GET /api/v2/info - Get version information</p>
      <p>POST /api/refresh - Manually refresh version data</p>
    </div>
  </div>
</body>
</html>
      `;
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // 404
    return new Response(JSON.stringify({
      status: "error",
      message: "Not Found",
    }), { 
      status: 404, 
      headers: corsHeaders 
    });
  },

  // Cron trigger - 定期刷新版本数据
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log("Running scheduled version refresh...");
    try {
      await refreshVersionData(env);
      console.log("Version data refreshed successfully");
    } catch (error) {
      console.error("Scheduled refresh failed:", error);
    }
  },
};
