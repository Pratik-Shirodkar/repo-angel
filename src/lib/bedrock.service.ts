import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const REGION = process.env.AWS_REGION || "us-east-1";
const MODEL_ID = process.env.AWS_BEDROCK_MODEL || "anthropic.claude-3-haiku-20240307-v1:0";

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
    if (!client) {
        client = new BedrockRuntimeClient({
            region: REGION,
            // Uses default credential chain: env vars, ~/.aws/credentials, IAM role, etc.
            ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
                ? {
                    credentials: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    },
                }
                : {}),
        });
    }
    return client;
}

export function isBedrockConfigured(): boolean {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export async function bedrockChat(prompt: string, systemPrompt: string): Promise<string> {
    const bedrock = getClient();

    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
    };

    const command = new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Claude response format: { content: [{ type: "text", text: "..." }] }
    if (responseBody.content?.[0]?.text) {
        return responseBody.content[0].text;
    }

    throw new Error("Unexpected Bedrock response format");
}
