interface Video { id: string; url: string; videoType: string }

export function PropertyVideos({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return null;
  return <section className="mt-8"><h2 className="mb-3 text-lg font-semibold text-navy-900">Video tours</h2><div className="grid gap-4 sm:grid-cols-2">{videos.map((video)=>{const embed=youtubeEmbed(video.url);return <div key={video.id} className="overflow-hidden rounded-xl border border-navy-100 bg-black">{embed?<iframe src={embed} title={`${video.videoType} video`} className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:<video src={video.url} controls className="aspect-video w-full"/>}<p className="bg-white px-3 py-2 text-sm capitalize text-navy-600">{video.videoType}</p></div>})}</div></section>;
}
function youtubeEmbed(url:string){try{const u=new URL(url);let id=u.hostname.includes("youtu.be")?u.pathname.slice(1):u.searchParams.get("v");if(!id&&u.pathname.includes("/embed/"))id=u.pathname.split("/embed/")[1];return id?`https://www.youtube.com/embed/${encodeURIComponent(id)}`:null}catch{return null}}
