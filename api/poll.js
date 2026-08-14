const REQUEST_TIMEOUT = 12000;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API;
  const { operationId } = req.query;

  if (!apiKey || !operationId) return res.status(400).json({ error: "Missing operationId" });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${apiKey}`, {
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();

    if (!response.ok) {
        // Return raw Google API error
        return res.status(response.status).json({ error: data?.error?.message || "Polling failed" });
    }
    
    if (!data.done) {
        return res.status(200).json({ status: "processing" });
    }
    
    if (data.error) {
        return res.status(500).json({ error: data.error.message });
    }

    // Return the secure edge proxy route for the completed video
    return res.status(200).json({
      status: "complete",
      videoUrl: `/api/video?operationId=${encodeURIComponent(operationId)}`
    });

  } catch (error) {
    if (error.name === "AbortError") return res.status(504).json({ error: "Google API polling timed out" });
    return res.status(500).json({ error: "Internal server error during polling" });
  }
}
