type VideoEmbedProps = {
  url: string | null | undefined;
  title?: string;
  className?: string;
};

export function getYouTubeEmbedUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/watch")) videoId = parsed.searchParams.get("v") || "";
      if (parsed.pathname.startsWith("/shorts/")) videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
      if (parsed.pathname.startsWith("/embed/")) videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
    }

    if (!videoId) return null;
    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
  } catch {
    return null;
  }
}

export function VideoEmbed({ url, title = "Video tour", className = "" }: VideoEmbedProps) {
  if (!url) return null;
  const embedUrl = getYouTubeEmbedUrl(url);

  return (
    <div className={className}>
      {embedUrl ? (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-black shadow-sm">
          <iframe
            src={embedUrl}
            title={title}
            className="aspect-video w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-navy-900 px-5 py-3 text-sm font-bold text-white">
          Watch video tour
        </a>
      )}
    </div>
  );
}
