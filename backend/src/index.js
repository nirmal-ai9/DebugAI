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

    // 1. Safely parse request body independently
    let data;
    try {
      const rawText = await request.text();
      data = JSON.parse(rawText);

      // Handle double-serialized JSON string sent from frontend
      if (typeof data === "string") {
        data = JSON.parse(data);
      }
    } catch (err) {
      return jsonResponse({ success: false, message: "Invalid request payload JSON format" }, 400);
    }

    // 2. Execute main logic inside try/catch for real server errors
    try {
      const { requirements, code, error } = data || {};

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
        Console error: ${error || "none"}
        
        CRITICAL INSTRUCTION FOR OUTPUT:
        Provide raw code ONLY inside the "fix.code" JSON field. Do NOT wrap the code in markdown backticks or code blocks (such as \`\`\`javascript or \`\`\`).`;


      const aiResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_schema", json_schema: resultSchema },
        max_tokens: 1024
      });

      let result;
      try {
        const rawOutput = aiResponse.response ?? aiResponse;

        if (typeof rawOutput === "object" && rawOutput !== null) {
          result = rawOutput;
        } else {
          // Remove ```json and ``` markdown code fences
          const cleanedText = String(rawOutput)
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

          result = JSON.parse(cleanedText);
        }
      } catch (parseErr) {
        console.error("AI Parse Error. Raw Output was:", JSON.stringify(aiResponse));
        return jsonResponse(
          { 
            success: false, 
            message: "AI returned unparseable output",
            debug: typeof aiResponse.response === "string" ? aiResponse.response : aiResponse 
          }, 
          502
        );
      }

      return jsonResponse({ success: true, result });

    } catch (err) {
      // 3. Catch true worker or Cloudflare AI errors without mislabeling them
      return jsonResponse({ success: false, message: err.message || "Internal Server Error" }, 500);
    }
  }
};
