"use client";

import { useEffect, useState } from "react";

interface Video { id: string; url: string; videoType: string }
export function VideoManager({ propertyId }: { propertyId: string }) {
  const [videos,setVideos]=useState<Video[]>([]); const [message,setMessage]=useState<string|null>(null);
  async function load(){const r=await fetch(`/api/admin/properties/${propertyId}/videos`,{cache:"no-store"});const d=await r.json();if(r.ok)setVideos(d)}
  useEffect(()=>{void load()},[propertyId]);
  async function add(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const r=await fetch(`/api/admin/properties/${propertyId}/videos`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:f.get("url"),videoType:f.get("videoType")})});const d=await r.json();setMessage(r.ok?"Video added.":d.error||"Could not add video.");if(r.ok){e.currentTarget.reset();await load()}}
  async function remove(id:string){if(!confirm("Remove this video?"))return;await fetch(`/api/admin/properties/${propertyId}/videos`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({videoId:id})});await load()}
  return <section className="rounded-xl border border-navy-100 bg-white p-5"><h2 className="font-semibold text-navy-900">Listing videos</h2><p className="mt-1 text-xs text-navy-400">Add YouTube, Vimeo, or direct hosted video links.</p><form onSubmit={add} className="mt-4 flex flex-wrap gap-2"><input name="url" type="url" required placeholder="https://..." className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"/><select name="videoType" className="rounded-md border px-3 py-2 text-sm"><option value="tour">Tour</option><option value="walkthrough">Walkthrough</option><option value="drone">Drone</option></select><button className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold">Add video</button></form>{message&&<p className="mt-2 text-sm text-navy-600">{message}</p>}<div className="mt-3 space-y-2">{videos.map(v=><div key={v.id} className="flex items-center justify-between gap-3 rounded-md bg-navy-50 p-2 text-sm"><a href={v.url} target="_blank" rel="noreferrer" className="truncate text-gold-700 underline">{v.videoType}: {v.url}</a><button type="button" onClick={()=>remove(v.id)} className="text-red-600">Remove</button></div>)}</div></section>;
}
