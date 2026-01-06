import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(req: NextRequest, res: NextResponse) {
  try {
    const npmVersion = await fetchNPMVersion();

    const [
      staticfileCDNResult,
      bootCDNResult,
      zstaticCDNResult,
      sustechCDNResult,
      cdnjsCDNResult,
      npmMirrorCDNResult,
    ] = await Promise.all([
      testCDN(
        "https://cdn.staticfile.org/hexo-theme-redefine-x/{version}/js/main.js",
        npmVersion,
      ),
      testCDN(
        "https://cdn.bootcdn.net/ajax/libs/hexo-theme-redefine-x/{version}/js/main.js",
        npmVersion,
      ),
      testCDN(
        "https://s4.zstatic.net/ajax/libs/hexo-theme-redefine-x/{version}/js/main.js",
        npmVersion,
      ),
      testCDN(
        "https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/hexo-theme-redefine-x/{version}/js/main.js",
        npmVersion,
      ),
      testCDN(
        "https://cdnjs.cloudflare.com/ajax/libs/hexo-theme-redefine-x/{version}/js/main.js",
        npmVersion,
      ),
      testCDN(
        "https://registry.npmmirror.com/hexo-theme-redefine-x/{version}/files/source/js/main.js",
        npmVersion,
      ),
    ]);

    await Promise.all([
      kv.set("npmVersion", npmVersion),
      kv.set("staticfileCDN", staticfileCDNResult),
      kv.set("bootCDN", bootCDNResult),
      kv.set("zstaticCDN", zstaticCDNResult),
      kv.set("sustechCDN", sustechCDNResult),
      kv.set("cdnjsCDN", cdnjsCDNResult),
      kv.set("npmMirrorCDN", npmMirrorCDNResult),
    ]);

    return NextResponse.json({
      status: "success",
      message: "Refreshed successfully",
      data: {
        npmVersion,
        staticfileCDN: staticfileCDNResult,
        bootCDN: bootCDNResult,
        zstaticCDN: zstaticCDNResult,
        sustechCDN: sustechCDNResult,
        cdnjsCDN: cdnjsCDNResult,
        npmMirrorCDN: npmMirrorCDNResult,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: "Error refreshing",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

const fetchNPMVersion = async () => {
  const response = await fetch(
    "https://registry.npmjs.org/hexo-theme-redefine-x",
  );
  const data = await response.json();
  return data["dist-tags"].latest;
};

const testCDN = async (baseUrl: string, version: string) => {
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
      // Handle fetch error if needed
    }
  }

  return success;
};

export async function GET(req: NextRequest) {
  return new NextResponse(
    JSON.stringify({
      status: "error",
      message: "Method Not Allowed",
      error: "Method Not Allowed",
    }),
    {
      status: 405,
    },
  );
}
