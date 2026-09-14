const resultSchema = {
  type: "object",
  properties: {
    bug: {
      type: "object",
      properties: {
        type: { type: "string" },
        line: { type: ["number", "null"] },
        message: { type: "string" }
      },
      required: ["type", "line", "message"]
    },
    why: { type: "string" },
    fix: {
      type: "object",
      properties: {
        explanation: { type: "string" },
        code: { type: "string" }
      },
      required: ["explanation", "code"]
    }
  },
  required: ["bug", "why", "fix"]
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

// Every response goes through here so CORS headers are never forgotten.
function jsonResponse(body, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ success: false, message: "Method not allowed" }, 405);
    }

    try {
      const data = JSON.parse(await request.text());
      const { requirements, code, error } = data;

      if (
        typeof requirements !== "string" ||
        requirements.trim() === "" ||
        typeof code !== "string" ||
        code.trim() === ""
      ) {
        return jsonResponse({ success: false, message: "Requirements and code are required" }, 400);
      }

      if (error !== undefined && typeof error !== "string") {
        return jsonResponse({ success: false, message: "Error must be a string" }, 400);
      }

      const prompt = `You are a senior engineer. Diagnose the bug.

Requirements: ${requirements}
Code:
\`\`\`
${code}
\`\`\`
Console error: ${error || "none"}`;

      const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_schema", json_schema: resultSchema }
      });

      let result;
      try {
        result = typeof aiResponse.response === "string"
          ? JSON.parse(aiResponse.response)
          : aiResponse.response;
      } catch {
        return jsonResponse({ success: false, message: "AI returned unparseable output" }, 502);
      }

      return jsonResponse({ success: true, result });

    } catch (err) {
      return jsonResponse({ success: false, message: "Invalid JSON!" }, 400);
    }
  }
};
