import { Router, Request, Response } from "express";
import { config } from "../config";
import { getAccessToken } from "../twitchAuth";
import { StreamerInfo } from "../types";

const router = Router();

// GET /api/streams?login=<streamer_login>
// Returns whether a streamer exists and if they are currently live.
router.get("/", async (req: Request, res: Response) => {
  const login = (req.query.login as string | undefined)?.toLowerCase().trim();

  if (!login) {
    res.status(400).json({ error: "Missing required query param: login" });
    return;
  }

  // Basic validation — Twitch logins are 4-25 chars, alphanumeric + underscores
  if (!/^[a-z0-9_]{1,25}$/.test(login)) {
    res.status(400).json({ error: "Invalid streamer name" });
    return;
  }

  try {
    let token = await getAccessToken();

    // First check the user exists
    const userRes = await fetchHelix(`/helix/users?login=${login}`, token);
    if (userRes.status === 401) {
      // Token expired — clear cache and retry once
      token = await getAccessToken();
      const retry = await fetchHelix(`/helix/users?login=${login}`, token);
      if (!retry.ok)
        throw new Error("Helix users request failed after token refresh");
      const retryData = await retry.json();
      if (!retryData.data?.length) {
        res.status(404).json({ error: `Streamer '${login}' not found` });
        return;
      }
    }

    if (!userRes.ok)
      throw new Error(`Helix users request failed: ${userRes.status}`);
    const userData = await userRes.json();

    if (!userData.data?.length) {
      res.status(404).json({ error: `Streamer '${login}' not found` });
      return;
    }

    const user = userData.data[0];

    // Now check if they're live
    const streamRes = await fetchHelix(
      `/helix/streams?user_login=${login}`,
      token,
    );
    if (!streamRes.ok)
      throw new Error(`Helix streams request failed: ${streamRes.status}`);
    const streamData = await streamRes.json();

    const stream = streamData.data?.[0];
    const info: StreamerInfo = stream
      ? {
          isLive: true,
          displayName: stream.user_name,
          title: stream.title,
          viewerCount: stream.viewer_count,
          thumbnailUrl: stream.thumbnail_url
            ?.replace("{width}", "440")
            .replace("{height}", "248"),
        }
      : {
          isLive: false,
          displayName: user.display_name,
        };

    res.json(info);
  } catch (err) {
    console.error("[streams] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function fetchHelix(path: string, token: string): Promise<Response> {
  return fetch(`https://api.twitch.tv${path}`, {
    headers: {
      "Client-Id": config.twitch.clientId,
      Authorization: `Bearer ${token}`,
    },
  });
}

export default router;
