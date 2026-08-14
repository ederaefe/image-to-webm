export const config = {
  runtime: "edge"
};

function extractVideoUri(payload) {
  const candidates = [
    payload?.response?.videoUri,
    payload?.response?.video?.uri,
    payload?.response?.videos?.[0]?.video?.uri,
    payload?.response?.generatedVideos?.[0]?.video?.uri,
    payload?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri,
    payload?.videos?.[0]?.uri,
    payload?.videoUri,
    payload?.output?.videoUri
  ];

  return candidates.find(Boolean) || null;
}

export default async function handler(req) {
  const apiKey = process.env.GEMINI_API;
  const { searchParams } = new URL(req.url);
  const operationId = searchParams.get("operationId");

  if (!apiKey || !operationId) {
    return new Response(JSON.stringify({ error: "Missing configuration or operationId" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 1. Validate operation and get the secure URL internally
    const opRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${apiKey}`);
    const opText = await opRes.text();
    const opData = opText ? JSON.parse(opText) : {};

    if (!opRes.ok) {
      return new Response(JSON.stringify({ error: opData.error?.message || "Operation fetch failed" }), { 
          status: opRes.status,
          headers: { "Content-Type": "application/json" }
      });
    }

    if (!opData.done || opData.error) {
      return new Response(JSON.stringify({ error: opData.error?.message || "Video not ready or operation failed" }), { 
          status: 404,
          headers: { "Content-Type": "application/json" }
      });
    }

    const googleVideoUri = extractVideoUri(opData);

    if (!googleVideoUri) {
      return new Response(JSON.stringify({ error: "Video URI not found in operation payload" }), { 
          status: 500,
          headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Stream the video to the client, using API key for AI Studio downloads
    const videoRes = await fetch(googleVideoUri, {
      headers: { "x-goog-api-key": apiKey }
    });

    if (!videoRes.ok) {
      const vText = await videoRes.text();
      let vError = "Failed to stream video";
      try { vError = JSON.parse(vText).error?.message || vError; } catch(e){}
      return new Response(JSON.stringify({ error: vError }), { 
          status: videoRes.status,
          headers: { "Content-Type": "application/json" }
      });
    }

    const contentType = videoRes.headers.get("content-type") || "video/mp4";

    return new Response(videoRes.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": 'inline; filename="seamless_showcase.mp4"'
      }
    });
  } catch (error) {
    console.error("Video proxy error:", error);
    return new Response(JSON.stringify({ error: "Edge proxy error" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
}
