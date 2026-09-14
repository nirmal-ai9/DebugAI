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

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    if (request.method !== "POST") {
      return Response.json(
        { success: false, message: "Method not allowed" },
        { status: 405 }
      );
    }

    try {
      const data = await request.json();
      const { requirements, code, error } = data;

      if (
        typeof requirements !== "string" ||
        requirements.trim() === "" ||
        typeof code !== "string" ||
        code.trim() === ""
      ) {
        return Response.json(
          { success: false, message: "Requirements and code are required" },
          { status: 400 }
        );
      }

      if (error !== undefined && typeof error !== "string") {
        return Response.json(
          { success: false, message: "Error must be a string" },
          { status: 400 }
        );
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
        return Response.json(
          { success: false, message: "AI returned unparseable output" },
          { status: 502 }
        );
      }

      return Response.json({ success: true, result });

    } catch (err) {
      return Response.json(
        { success: false, message: "Invalid JSON!" },
        { status: 400 }
      );
    }
  }
};
