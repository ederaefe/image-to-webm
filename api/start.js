export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GEMINI_API;
    if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API key' });

    try {
        const { imageBase64, mimeType, prompt } = req.body;
        if (!imageBase64 || !mimeType) return res.status(400).json({ error: 'Missing image data' });

        // Strip the data URL prefix; Veo requires raw Base64 bytes
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        // Veo 3.1 Fast Generate long-running operation request
        const payload = {
            prompt: prompt || "Cinematic dynamic orbiting camera around this fashion model, studio lighting, flawless 4k, slow motion",
            image: {
                inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType
                }
            },
            config: {
                duration_seconds: 5,
                aspect_ratio: "16:9"
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:generateVideos?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Start failed' });

        // data.name returns something like 'operations/generate_12345'
        return res.status(200).json({ operationId: data.name });

    } catch (error) {
        console.error('Start error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}