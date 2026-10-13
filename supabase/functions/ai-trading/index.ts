import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRADE_TOOLS = [
  {
    type: "function",
    function: {
      name: "open_trade",
      description: "Open a new trade for the user. Use this when the user explicitly asks you to open/place/buy/sell a trade. Always confirm the details with the user first unless they gave specific instructions.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Asset symbol, e.g. BTC, ETH, SOL, AAPL" },
          direction: { type: "string", enum: ["buy", "sell"], description: "Trade direction" },
          size: { type: "number", description: "Trade size in EUR" },
          leverage: { type: "number", description: "Leverage multiplier (1-100), default 1" },
          stop_loss_pct: { type: "number", description: "Optional stop loss as percentage below entry (e.g. 5 means 5%)" },
          take_profit_pct: { type: "number", description: "Optional take profit as percentage above entry (e.g. 10 means 10%)" },
        },
        required: ["symbol", "direction", "size"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "close_trade",
      description: "Close an existing open trade for the user. Use when the user asks to close a specific trade or all trades.",
      parameters: {
        type: "object",
        properties: {
          trade_id: { type: "string", description: "The UUID of the trade to close" },
        },
        required: ["trade_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "close_all_trades",
      description: "Close all open trades for the user. Use when the user asks to close all positions.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // --- Fetch server-side context ---
    const supabaseService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [walletsRes, tradesRes, assetsRes] = await Promise.all([
      supabaseService.from("wallets").select("balance, currency").eq("user_id", userId),
      supabaseService.from("trades").select("id, asset_id, direction, size, entry_price, pnl, status, leverage").eq("user_id", userId).eq("status", "open"),
      supabaseService.from("assets").select("symbol, name, enabled").eq("enabled", true),
    ]);

    const balance = walletsRes.data?.find((w: any) => w.currency === "EUR")?.balance ?? 0;
    const openTrades = tradesRes.data ?? [];
    const availableAssets = (assetsRes.data ?? []).map((a: any) => a.symbol);

    const { messages, context, ai_trading_enabled } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context-aware system prompt
    let systemContent = `You are Crypto-Börse KI Trading-Assistent. You analyze markets and provide trading signals.

When a user asks you to trade or analyze, respond with a clear recommendation including:
- Asset and direction (BUY/SELL)
- Suggested entry price range
- Stop loss and take profit levels
- Risk assessment (Low/Medium/High)
- Brief reasoning

Keep responses concise and actionable. Use bullet points.
Always include a disclaimer that this is AI-generated analysis and not financial advice.`;

    // Use server-side context, not client-supplied
    systemContent += `\n\n## Current Trading Context
- Available Balance: €${balance}
- Currently viewing: ${context?.selected_asset ?? "none"}
- Current price: €${context?.current_price ?? "unknown"}`;

    if (openTrades.length > 0) {
      systemContent += `\n\n## Open Positions:`;
      for (const t of openTrades) {
        systemContent += `\n- ${t.asset_id} ${t.direction.toUpperCase()} | Size: €${t.size} | Entry: €${t.entry_price} | P&L: €${t.pnl?.toFixed?.(2) ?? "0.00"} | Trade ID: ${t.id}`;
      }
    } else {
      systemContent += `\n\nNo open positions.`;
    }

    if (availableAssets.length > 0) {
      systemContent += `\n\n## Available Assets: ${availableAssets.join(", ")}`;
    }

    // ai_trading_enabled is still read from client for UX, but trades go through RLS anyway
    if (ai_trading_enabled) {
      systemContent += `\n\n## TRADING ENABLED
The user has enabled AI trading. You CAN open and close trades using the provided tools.
- When the user asks you to trade, use the open_trade tool to execute it.
- When the user asks to close a position, use the close_trade tool.
- Always briefly confirm what you're doing before executing.
- If the user's balance is insufficient, warn them instead of placing the trade.
- Default leverage is 1 unless specified.
- For stop loss and take profit, use reasonable defaults (e.g. 5% SL, 10% TP) if the user doesn't specify.`;
    } else {
      systemContent += `\n\n## TRADING DISABLED
The user has NOT enabled AI trading. You can only provide analysis and suggestions.
Do NOT attempt to use trading tools. Instead, recommend trades and let the user execute manually.
If the user asks you to place a trade, tell them to enable "Allow AI Trading" first.`;
    }

    const requestBody: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
      stream: true,
    };

    if (ai_trading_enabled) {
      requestBody.tools = TRADE_TOOLS;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-trading error:", e);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
