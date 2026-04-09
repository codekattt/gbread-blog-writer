export function getYoutubeCookieHeader(): string | null {
  const raw = process.env.YOUTUBE_COOKIES_HEADER?.trim();

  if (!raw) {
    return null;
  }

  return raw.replace(/\s+/g, " ");
}

export function withYoutubeCookies(init?: RequestInit): RequestInit {
  const cookieHeader = getYoutubeCookieHeader();

  if (!cookieHeader) {
    return init ?? {};
  }

  const mergedHeaders = new Headers(init?.headers);
  mergedHeaders.set("Cookie", cookieHeader);

  return {
    ...init,
    headers: mergedHeaders,
  };
}
