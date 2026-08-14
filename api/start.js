export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GEMINI_API;
    if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API key in Vercel environment' });

    try {
        const { imageBase64, mimeType, prompt, durationSeconds, aspectRatio } = req.body;
        if (!imageBase64 || !mimeType) return res.status(400).json({ error: 'Missing image data' });

        // Strip the data URL prefix; Veo requires raw Base64 bytes
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const payload = {
            instances: [
                {
                    prompt: prompt || "A 6-second seamless looping cinematic product showcase.",
                    image: {
                        bytesBase64Encoded: cleanBase64,
                        mimeType: mimeType
                    }
                }
            ],
            parameters: {
                sampleCount: 1,
                durationSeconds: parseInt(durationSeconds) || 6,
                aspectRatio: aspectRatio || "1:1"
            }
        };

        const attemptGeneration = async () => {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const text = await response.text();
            return { ok: response.ok, status: response.status, data: text ? JSON.parse(text) : {} };
        };

        // First attempt
        let result = await attemptGeneration();

        // Single automatic fallback/retry logic
        if (!result.ok && result.status >= 500) {
            console.log("Veo generation failed. Attempting automatic fallback retry...");
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
            result = await attemptGeneration();
        }

        if (!result.ok) {
            // Return raw Google API error message back to user as requested
            return res.status(result.status).json({ 
                error: result.data.error?.message || `Google API Error ${result.status}` 
            });
        }

        // result.data.name contains the operation name (e.g. 'operations/12345')
        return res.status(200).json({ operationId: result.data.name });

    } catch (error) {
        console.error('Start error:', error);
        return res.status(500).json({ error: 'Internal server error processing payload' });
    }
}
