// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// Workspace type hint only; Deno exists at runtime in Edge Functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

async function callOpenAI(params: any) {
  const apiKey = "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";
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in function secrets");
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let errorDetail = `${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorDetail = errorData.error?.message || JSON.stringify(errorData);
    } catch {
      /* ignore */
    }
    throw new Error(`OpenAI API error: ${errorDetail}`);
  }
  return response;
}

const baseCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Will be overridden dynamically with the exact headers requested (safer for some browsers)
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  // Build dynamic CORS headers (echo requested headers if present)
  const requestedHeaders = req.headers.get("Access-Control-Request-Headers");
  const corsHeaders = {
    ...baseCorsHeaders,
    ...(requestedHeaders
      ? { "Access-Control-Allow-Headers": requestedHeaders }
      : {}),
  } as Record<string, string>;

  // Handle CORS preflight requests early
  if (req.method === "OPTIONS") {
    return new Response("", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
  if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}))
    const { message, messages, model } = body || {}

    // Handle both single message and messages array
    let inputMessages: any[] = []
    if (messages && Array.isArray(messages)) {
      inputMessages = messages
    } else if (message && typeof message === "string") {
      inputMessages = [{ role: "user", content: message }]
    } else {
      return new Response(JSON.stringify({ error: "Either 'message' (string) or 'messages' (array) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const params = {
      model: model || "gpt-5-mini",
      input: inputMessages,
      reasoning: { effort: "minimal" },
    };

    const response = await callOpenAI(params)
    const data = await response.json()
    
    // Handle Responses API format - extract text from output array
    let responseText = ""
    
    if (data.output && Array.isArray(data.output)) {
      for (const outputItem of data.output) {
        if (outputItem.type === "message" && outputItem.content) {
          for (const contentItem of outputItem.content) {
            if (contentItem.type === "output_text") {
              responseText += contentItem.text || ""
            }
          }
        }
      }
    }

    if (!responseText) {
      return new Response(JSON.stringify({ error: "No response from OpenAI" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({
        response: responseText,
        finish_reason: data.status || "complete",
        type: "complete",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
