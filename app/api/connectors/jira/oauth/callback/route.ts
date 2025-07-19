import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import axios from "axios";
import { connectMongo } from "@/lib/mongo";
import Integration from "@/models/Integration";
import { encryptToken } from "@/lib/security";
import { secondsFromNow } from "@/lib/time";

const DEMO_USER_ID = "demo-user-1";
const TOKEN_URL = "https://auth.atlassian.com/oauth/token";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    console.error("[Jira OAuth] Error param from Atlassian:", err);
    return NextResponse.json({ error: err }, { status: 400 });
  }

  // ✅ IMPORTANT: await cookies()
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("jira_state")?.value;
  const verifier = cookieStore.get("jira_verifier")?.value;

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  if (!state || state !== stateCookie) {
    console.error("[Jira OAuth] State mismatch", { state, stateCookie });
    return NextResponse.json({ error: "State mismatch" }, { status: 400 });
  }
  if (!verifier) {
    console.error("[Jira OAuth] Missing PKCE verifier cookie");
    return NextResponse.json({ error: "Missing PKCE verifier" }, { status: 400 });
  }

  console.log("[Jira OAuth] Exchanging code for tokens...");
  const tokenPayload = {
    grant_type: "authorization_code",
    client_id: process.env.ATLASSIAN_CLIENT_ID,
    client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
    code,
    redirect_uri: process.env.ATLASSIAN_REDIRECT_URI,
    code_verifier: verifier
  };
  console.log("[Jira OAuth] Token payload (sanitized):", {
    ...tokenPayload,
    client_secret: tokenPayload.client_secret ? "***" : undefined
  });

  try {
    await connectMongo();

    const tokenRes = await axios.post(
      TOKEN_URL,
      tokenPayload,
      { headers: { "Content-Type": "application/json" } }
    );

    const { access_token, refresh_token, expires_in, scope } = tokenRes.data;
    console.log("[Jira OAuth] Received tokens. Scopes:", scope);

    // Get accessible resources
    const resourcesRes = await axios.get(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const resources = resourcesRes.data as any[];
    if (!resources.length) {
      console.error("[Jira OAuth] No accessible Jira resources returned");
      return NextResponse.json({ error: "No Jira sites returned" }, { status: 400 });
    }

    // TODO: if >1 site, present a selection UI; for now pick first
    const site = resources[0];
    console.log("[Jira OAuth] Using site:", site);

    const scopes = scope ? scope.split(" ") : [];

    await Integration.findOneAndUpdate(
      { userId: DEMO_USER_ID, provider: "jira", cloudId: site.id },
      {
        userId: DEMO_USER_ID,
        provider: "jira",
        cloudId: site.id,
        siteName: site.name,
        siteUrl: site.url,
        scopes,
        accessTokenEnc: encryptToken(access_token),
        refreshTokenEnc: refresh_token ? encryptToken(refresh_token) : undefined,
        expiresAt: secondsFromNow(expires_in || 3600)
      },
      { upsert: true, new: true }
    );

    const redirect = new URL("/", url.origin);
    redirect.searchParams.set("jira_connected", "true");
    return NextResponse.redirect(redirect);

  } catch (e: any) {
    // Surface Atlassian error for debugging
    const details = e.response?.data || e.message;
    console.error("[Jira OAuth] Callback failure:", details);
    return NextResponse.json({ error: "OAuth exchange failed", details }, { status: 500 });
  }
}
