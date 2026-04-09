import Innertube from "youtubei.js";

import { getYoutubeCookieHeader } from "@/lib/youtube/cookies";

let youtubeClientPromise: Promise<Innertube> | null = null;

export async function getYoutubeClient() {
  if (!youtubeClientPromise) {
    const cookie = getYoutubeCookieHeader();
    youtubeClientPromise = Innertube.create(cookie ? { cookie } : undefined);
  }

  return youtubeClientPromise;
}
