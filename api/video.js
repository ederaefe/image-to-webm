export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  const apiKey = process.env.GEMINI_API;
  const { searchParams } = new URL(req.url);
  const operationId = searchParams.get("operationId");

  if (!apiKey || !operationId) {
    return new Response("Missing configuration or operationId", { status: 400 });
  }

  try {
    // 1. Validate operation and get the secure URL internally
    const opRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${apiKey}`);
    const opData = await opRes.json();

    if (!opRes.ok || !opData.done) {
      return new Response("Video not ready or operation failed", { status: 404 });
    }

    const googleVideoUri = opData?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

    if (!googleVideoUri) {
      return new Response("Video URI not found", { status: 500 });
    }

    // 2. Stream the video to the client
    const videoRes = await fetch(googleVideoUri, {
      headers: { "x-goog-api-key": apiKey }
    });

    if (!videoRes.ok) {
      return new Response("Failed to stream video", { status: videoRes.status });
    }

    const contentType = videoRes.headers.get("content-type") || "video/mp4";

    return new Response(videoRes.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": 'inline; filename="deradave-orbit.mp4"'
      }
    });
  } catch (error) {
    console.error("Video proxy error:", error);
    return new Response("Edge proxy error", { status: 500 });
  }
}