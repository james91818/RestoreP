import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── Tool definitions ──
const tools = [
  {
    type: "function",
    function: {
      name: "search_users",
      description: "Search for users/leads/depositors by name, email, phone, status, or country. Returns up to 20 results.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term (name, email, phone)" },
          is_lead: { type: "boolean", description: "Filter: true=leads only, false=depositors only, omit=all" },
          status: { type: "string", description: "Filter by status" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_details",
      description: "Get detailed info for a specific user including wallets, recent trades, deposits, withdrawals.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The user's UUID" },
        },
        required: ["user_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_user_status",
      description: "Update a user's status (e.g. New, Contacted, Interested, Converted, etc.).",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The user's UUID" },
          status: { type: "string", description: "New status value" },
        },
        required: ["user_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_wallet_balance",
      description: "Set a user's wallet balance for a specific currency.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The user's UUID" },
          currency: { type: "string", description: "Currency code (EUR, USD, BTC, etc.)" },
          balance: { type: "number", description: "New balance value" },
        },
        required: ["user_id", "currency", "balance"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_deposit",
      description: "Approve or reject a deposit.",
      parameters: {
        type: "object",
        properties: {
          deposit_id: { type: "string", description: "The deposit UUID" },
          action: { type: "string", enum: ["approve", "reject"], description: "Action to take" },
          notes: { type: "string", description: "Optional admin notes" },
        },
        required: ["deposit_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_withdrawal",
      description: "Approve or reject a withdrawal.",
      parameters: {
        type: "object",
        properties: {
          withdrawal_id: { type: "string", description: "The withdrawal UUID" },
          action: { type: "string", enum: ["approve", "reject"], description: "Action to take" },
          notes: { type: "string", description: "Optional admin notes" },
        },
        required: ["withdrawal_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_notification",
      description: "Send a notification to a specific user.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "Target user UUID" },
          title: { type: "string", description: "Notification title" },
          message: { type: "string", description: "Notification message" },
          type: { type: "string", enum: ["info", "success", "warning", "error"], description: "Notification type" },
        },
        required: ["user_id", "title", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pending_deposits",
      description: "List all pending deposits waiting for approval.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pending_withdrawals",
      description: "List all pending withdrawals waiting for approval.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_platform_stats",
      description: "Get platform overview stats: total users, leads, depositors, pending deposits/withdrawals, total balances.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_agent",
      description: "Assign an agent to a user/lead.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The user/lead UUID" },
          agent_id: { type: "string", description: "The agent's UUID to assign" },
        },
        required: ["user_id", "agent_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_staff",
      description: "List all staff members (admins, managers, agents) with their roles.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "add_admin_note",
      description: "Add an internal admin note to a user's profile.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The user UUID to add note to" },
          content: { type: "string", description: "The note content" },
        },
        required: ["user_id", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_trade",
      description: "Close an open trade or update trade details.",
      parameters: {
        type: "object",
        properties: {
          trade_id: { type: "string", description: "The trade UUID" },
          action: { type: "string", enum: ["close"], description: "Action to take" },
          pnl: { type: "number", description: "Final P&L value when closing" },
        },
        required: ["trade_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_deposit",
      description: "Create a new deposit for a user (manual deposit entry).",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The user UUID" },
          amount: { type: "number", description: "Deposit amount" },
          currency: { type: "string", description: "Currency code (default EUR)" },
          method: { type: "string", description: "Deposit method (crypto, bank, card)" },
          status: { type: "string", enum: ["pending", "approved"], description: "Initial status" },
        },
        required: ["user_id", "amount"],
      },
    },
  },
];

// ── Tool execution ──
async function executeTool(
  supabaseUser: ReturnType<typeof createClient>,
  callerUserId: string,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "search_users": {
        let q = supabaseUser.from("profiles").select("id, display_id, full_name, email, phone, status, country, is_lead, created_at, first_deposit_at, assigned_agent");
        if (args.query) {
          const term = `%${args.query}%`;
          q = q.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
        }
        if (args.is_lead !== undefined) q = q.eq("is_lead", args.is_lead);
        if (args.status) q = q.eq("status", args.status as string);
        const { data, error } = await q.order("created_at", { ascending: false }).limit((args.limit as number) || 20);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify(data);
      }
      case "get_user_details": {
        const [profile, wallets, trades, deposits, withdrawals] = await Promise.all([
          supabaseUser.from("profiles").select("*").eq("id", args.user_id as string).single(),
          supabaseUser.from("wallets").select("*").eq("user_id", args.user_id as string),
          supabaseUser.from("trades").select("*, assets(symbol, name)").eq("user_id", args.user_id as string).order("opened_at", { ascending: false }).limit(10),
          supabaseUser.from("deposits").select("*").eq("user_id", args.user_id as string).order("created_at", { ascending: false }).limit(10),
          supabaseUser.from("withdrawals").select("*").eq("user_id", args.user_id as string).order("created_at", { ascending: false }).limit(10),
        ]);
        return JSON.stringify({
          profile: profile.data, wallets: wallets.data,
          recent_trades: trades.data, recent_deposits: deposits.data, recent_withdrawals: withdrawals.data,
        });
      }
      case "update_user_status": {
        const { error } = await supabaseUser.from("profiles").update({ status: args.status as string }).eq("id", args.user_id as string);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true, message: `Status updated to ${args.status}` });
      }
      case "update_wallet_balance": {
        const { error } = await supabaseUser.from("wallets")
          .update({ balance: args.balance as number })
          .eq("user_id", args.user_id as string)
          .eq("currency", args.currency as string);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "manage_deposit": {
        const newStatus = args.action === "approve" ? "approved" : "rejected";
        const update: Record<string, unknown> = { status: newStatus, processed_by: callerUserId };
        if (args.notes) update.admin_notes = args.notes;
        const { error } = await supabaseUser.from("deposits").update(update).eq("id", args.deposit_id as string);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true, message: `Deposit ${newStatus}` });
      }
      case "manage_withdrawal": {
        const newStatus = args.action === "approve" ? "approved" : "rejected";
        const update: Record<string, unknown> = { status: newStatus, processed_by: callerUserId };
        if (args.notes) update.admin_notes = args.notes;
        const { error } = await supabaseUser.from("withdrawals").update(update).eq("id", args.withdrawal_id as string);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true, message: `Withdrawal ${newStatus}` });
      }
      case "send_notification": {
        const { error } = await supabaseUser.from("notifications").insert({
          user_id: args.user_id as string,
          title: args.title as string,
          message: args.message as string,
          type: (args.type as string) || "info",
        });
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "list_pending_deposits": {
        const { data, error } = await supabaseUser.from("deposits")
          .select("id, user_id, amount, currency, method, created_at, profiles!inner(full_name, email)")
          .eq("status", "pending").order("created_at", { ascending: false }).limit(50);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify(data);
      }
      case "list_pending_withdrawals": {
        const { data, error } = await supabaseUser.from("withdrawals")
          .select("id, user_id, amount, currency, method, destination, created_at, profiles!inner(full_name, email)")
          .eq("status", "pending").order("created_at", { ascending: false }).limit(50);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify(data);
      }
      case "get_platform_stats": {
        const [users, leads, deps, pendingDeps, pendingWds] = await Promise.all([
          supabaseUser.from("profiles").select("id", { count: "exact", head: true }),
          supabaseUser.from("profiles").select("id", { count: "exact", head: true }).eq("is_lead", true),
          supabaseUser.from("profiles").select("id", { count: "exact", head: true }).eq("is_lead", false),
          supabaseUser.from("deposits").select("id, amount", { count: "exact" }).eq("status", "pending"),
          supabaseUser.from("withdrawals").select("id, amount", { count: "exact" }).eq("status", "pending"),
        ]);
        return JSON.stringify({
          total_users: users.count, total_leads: leads.count, total_depositors: deps.count,
          pending_deposits: { count: pendingDeps.count, total: pendingDeps.data?.reduce((s, d) => s + (d.amount || 0), 0) },
          pending_withdrawals: { count: pendingWds.count, total: pendingWds.data?.reduce((s, w) => s + (w.amount || 0), 0) },
        });
      }
      case "assign_agent": {
        const { error } = await supabaseUser.from("profiles").update({ assigned_agent: args.agent_id as string }).eq("id", args.user_id as string);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "list_staff": {
        const { data, error } = await supabaseUser.from("user_roles")
          .select("user_id, roles(name), profiles:user_id(full_name, email)");
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify(data);
      }
      case "add_admin_note": {
        const { error } = await supabaseUser.from("admin_notes").insert({
          user_id: args.user_id as string,
          author_id: callerUserId,
          content: args.content as string,
        });
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "manage_trade": {
        if (args.action === "close") {
          // Idempotent: only update if still open. Atomically transition open → closed
          // so we can safely credit the wallet exactly once.
          const update: Record<string, unknown> = { status: "closed", closed_at: new Date().toISOString() };
          if (args.pnl !== undefined) update.pnl = args.pnl;
          const { data: updatedRows, error } = await supabaseUser
            .from("trades")
            .update(update)
            .eq("id", args.trade_id as string)
            .eq("status", "open")
            .select("id, user_id, size, pnl");
          if (error) return JSON.stringify({ error: error.message });
          if (!updatedRows || updatedRows.length === 0) {
            return JSON.stringify({ success: true, message: "Trade already closed — no wallet change" });
          }
          // Refund stake + apply final P&L to EUR wallet
          const closed = updatedRows[0] as { user_id: string; size: number; pnl: number | null };
          const finalPnl = args.pnl !== undefined ? Number(args.pnl) : Number(closed.pnl ?? 0);
          const { data: wallet } = await supabaseUser
            .from("wallets").select("id, balance")
            .eq("user_id", closed.user_id).eq("currency", "EUR").maybeSingle();
          if (wallet) {
            await supabaseUser.from("wallets").update({
              balance: Number(wallet.balance) + Number(closed.size) + finalPnl,
            }).eq("id", wallet.id);
          }
          return JSON.stringify({ success: true, message: "Trade closed and wallet credited" });
        }
        return JSON.stringify({ error: "Unknown action" });
      }
      case "create_deposit": {
        const { error } = await supabaseUser.from("deposits").insert({
          user_id: args.user_id as string,
          amount: args.amount as number,
          currency: (args.currency as string) || "EUR",
          method: (args.method as string) || "bank",
          status: (args.status as string) || "pending",
        });
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : "Tool execution failed" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user-scoped client (RLS enforced)
    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user role
    const { data: roleData } = await supabaseUser.from("user_roles")
      .select("roles(name)").eq("user_id", user.id);
    const roleName = (roleData as any)?.[0]?.roles?.name ?? "Unknown";

    const { messages } = await req.json();

    const systemPrompt = `You are an AI assistant for the backoffice of Crypto-Börse, a trading/investment platform.
You are helping a staff member with role: ${roleName}.

You can perform actions on their behalf using the tools available. The actions are executed with the user's own permissions, so if they don't have access to something, the tool will return an error.

Guidelines:
- Be concise and professional
- When users ask about clients/leads, search for them first
- Always confirm destructive actions before proceeding (like approving deposits/withdrawals)
- When displaying user info, format it nicely with key details
- Use markdown formatting for readability
- When showing lists, use tables or bullet points
- Currency amounts should be formatted with 2 decimal places
- Always show the user's name alongside their ID when referencing users
- If a tool returns an error, explain what went wrong clearly

You have access to: user search, user details, status updates, wallet management, deposit/withdrawal management, notifications, trade management, admin notes, agent assignment, platform stats, and staff listing.`;

    let conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Tool-calling loop (max 5 iterations)
    for (let i = 0; i < 5; i++) {
      const aiResponse = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationMessages,
          tools,
          stream: false,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await aiResponse.text();
        console.error("AI error:", status, errText);
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await aiResponse.json();
      const choice = result.choices?.[0];

      if (!choice) {
        return new Response(JSON.stringify({ error: "No response from AI" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If the model wants to call tools
      if (choice.finish_reason === "tool_calls" || choice.message?.tool_calls?.length) {
        conversationMessages.push(choice.message);

        for (const toolCall of choice.message.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, unknown> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments);
          } catch { /* empty args */ }

          console.log(`Executing tool: ${fnName}`, fnArgs);
          const toolResult = await executeTool(supabaseUser, user.id, fnName, fnArgs);

          conversationMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }
        // Continue the loop so the model can process tool results
        continue;
      }

      // Final text response
      return new Response(JSON.stringify({
        content: choice.message?.content || "I couldn't generate a response.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      content: "I've reached the maximum number of steps. Please try a more specific request.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("backoffice-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
