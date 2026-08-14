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
            prompt: prompt || "A 6-second seamless looping cinematic product showcase.",
            image: {
                inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType
                }
            },
            config: {
                duration_seconds: parseInt(durationSeconds) || 6,
                aspect_ratio: aspectRatio || "1:1"
            }
        };

        const attemptGeneration = async () => {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateVideos?key=${apiKey}`, {
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
            let errorMsg = result.data.error?.message || `Google API Error ${result.status}`;
            
            // Detailed model diagnostics for 404s
            if (result.status === 404) {
                try {
                    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                    const listData = await listRes.json();
                    if (listData.models) {
                        const veoModels = listData.models
                            .map(m => m.name.replace('models/', ''))
                            .filter(name => name.includes('veo'));
                        if (veoModels.length > 0) {
                            errorMsg += `. Your API key has access to these Veo models: [${veoModels.join(', ')}]. Please check model configuration.`;
                        } else {
                            errorMsg += `. Your API key does not have access to any Veo models in your region. Make sure billing is enabled in Google AI Studio.`;
                        }
                    }
                } catch (e) {
                    console.error("Diagnostics check failed:", e);
                }
            }

            return res.status(result.status).json({ error: errorMsg });
        }

        // result.data.name contains the operation name (e.g. 'operations/12345')
        return res.status(200).json({ operationId: result.data.name });

    } catch (error) {
        console.error('Start error:', error);
        return res.status(500).json({ error: 'Internal server error processing payload' });
    }
}
