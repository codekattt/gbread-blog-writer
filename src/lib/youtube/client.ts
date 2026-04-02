import Innertube from "youtubei.js";

let youtubeClientPromise: Promise<Innertube> | null = null;

export async function getYoutubeClient() {
  if (!youtubeClientPromise) {
    youtubeClientPromise = Innertube.create();
  }

  return youtubeClientPromise;
}
