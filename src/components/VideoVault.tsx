import {useEffect, useRef, useState} from 'react';

type Entry = {id:string; title:string; description:string; link?:string; youtubeId?:string; localSrc?:string};
const official:Entry[] = [
  {id:'preload',title:'GTA VI · Pre-Load Now',description:'Rockstar Games · November 10, 2026',link:'https://www.rockstargames.com/videos/55kss26g'},
  {id:'launch',title:'GTA VI · Launch Trailer',description:'Rockstar Games · October 15, 2026',link:'https://www.rockstargames.com/VI/launch-trailer'},
  {id:'extended',title:'GTA VI · An Extended Look',description:'Rockstar Games · August 27, 2026',link:'https://www.rockstargames.com/VI/an-extended-look',youtubeId:'tJbzMqJGH4k'},
  {id:'trailer2',title:'GTA VI · Trailer 2',description:'Rockstar Games · May 6, 2025',link:'https://www.rockstargames.com/VI/trailer-2',youtubeId:'VQRLujxTm3c'},
  {id:'trailer1',title:'GTA VI · Trailer 1',description:'Rockstar Games · December 4, 2023',link:'https://www.youtube.com/watch?v=QdBZY2fkU-0',youtubeId:'QdBZY2fkU-0'}
];
const zip='https://media-rockstargames-com.akamaized.net/VI/downloads/videos/GTAVI_Videos.zip';

export function VideoVault() {
  const [selected,setSelected]=useState<Entry|null>(null);
  const [uploads,setUploads]=useState<Entry[]>([]);
  const [yaw,setYaw]=useState(0);
  const [smoke,setSmoke]=useState(false);
  const drag=useRef<{x:number;yaw:number;didMove:boolean}|null>(null);
  const objectUrls=useRef<string[]>([]);
  const smokeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const entries=[...official,...uploads];

  useEffect(()=>()=>{objectUrls.current.forEach(x=>URL.revokeObjectURL(x));if(smokeTimer.current)clearTimeout(smokeTimer.current)},[]);
  const open=(entry:Entry)=>{
    setSelected(entry);
    if(smokeTimer.current)clearTimeout(smokeTimer.current);
    setSmoke(false);
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(()=>{setSmoke(true);smokeTimer.current=setTimeout(()=>setSmoke(false),980)});
    }
  };
  const close=()=>{setSelected(null);setSmoke(false);if(smokeTimer.current)clearTimeout(smokeTimer.current)};
  const importVideos=(list:FileList|null)=>{
    if(!list)return;
    setUploads(old=>old.concat(Array.from(list).filter(f=>f.type.startsWith('video/')).map((file,i)=>{
      const localSrc=URL.createObjectURL(file);objectUrls.current.push(localSrc);
      return {id:'upload-'+Date.now()+'-'+i,title:file.name,description:'Local reference · this session only',localSrc};
    })));
  };
  return <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-white">
    <style>{'@keyframes video-vault-puff{0%{opacity:0;transform:scale(.12)}24%{opacity:1}100%{opacity:0;transform:scale(3.8)}}@media(prefers-reduced-motion:reduce){.video-vault-puff{display:none!important}}'}</style>
    <header className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-[#17304a] to-[#070b13] p-6">
      <div className="text-xs font-bold tracking-widest text-cyan-300">LUMEXUS GAMING · GTA 20</div>
      <h1 className="mt-2 font-display text-4xl font-black">Media &amp; Trailer Vault</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-300">Independent reference collection: official Rockstar media opens at its publisher, while your MP4s play locally. Drag the globe or select a video below.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a href={zip} target="_blank" rel="noopener noreferrer" className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-bold">Get Rockstar's 9-clip ZIP</a>
        <a href="https://www.rockstargames.com/VI/media/videos" target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold">All 5 official trailers</a>
      </div>
    </header>
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-[#111b29] p-5">
        <h2 className="font-display text-xl font-bold">🌐 Video globe</h2>
        <p className="mt-1 text-xs text-slate-400">Touch or mouse drag to rotate. Arrow keys work on the globe.</p>
        <div className="relative mx-auto mt-5 aspect-square w-full max-w-[500px] touch-none rounded-full border border-cyan-200/40 bg-[radial-gradient(circle_at_25%_20%,#7ed6fd66_0%,#095484_20%,#071326_65%,#02050d_100%)] shadow-[inset_-40px_-25px_60px_#000b,0_0_65px_#148ac340]"
          tabIndex={0} aria-label="Rotate the GTA 20 media globe"
          onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setYaw(v=>v+(e.key==='ArrowLeft'?-20:20))}}}
          onPointerDown={e=>{if(e.target!==e.currentTarget)return;drag.current={x:e.clientX,yaw,didMove:false};e.currentTarget.setPointerCapture(e.pointerId)}}
          onPointerMove={e=>{if(!drag.current)return;const d=e.clientX-drag.current.x;if(Math.abs(d)>7)drag.current.didMove=true;if(drag.current.didMove)setYaw(drag.current.yaw+d*.6)}}
          onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-[10%] rounded-full border border-cyan-200/20" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] top-1/2 border-t border-cyan-200/20" />
          {entries.map((entry,i)=>{
            const rad=(i*360/entries.length+yaw)*Math.PI/180;
            const lat=(i%2===0?20:-25)*Math.PI/180;
            const z=Math.cos(rad)*Math.cos(lat);
            return <button key={entry.id} type="button" aria-label={'Open '+entry.title} disabled={z<-.18}
              onClick={()=>open(entry)}
              className={'absolute left-1/2 top-1/2 grid size-[44px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-xs font-black shadow-[0_0_20px_#37adff88] sm:size-[52px] '+(entry.localSrc?'border-red-200 bg-red-600':'border-cyan-100 bg-sky-600')}
              style={{marginLeft:(Math.sin(rad)*Math.cos(lat)*36)+'%',marginTop:(-Math.sin(lat)*35)+'%',opacity:z<-.18?.15:1,zIndex:Math.round((z+1)*100)}}>
              {entry.localSrc?'MP4':i+1}
            </button>;
          })}
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <button type="button" onClick={()=>setYaw(v=>v-30)} className="rounded-full border border-white/20 px-4 py-2">↶</button>
          <button type="button" onClick={()=>setYaw(0)} className="rounded-full border border-white/20 px-5 py-2">Reset</button>
          <button type="button" onClick={()=>setYaw(v=>v+30)} className="rounded-full border border-white/20 px-4 py-2">↷</button>
        </div>
      </div>
      <div className="space-y-3 rounded-3xl border border-white/10 bg-[#111b29] p-5">
        <h2 className="font-display text-xl font-bold">🎬 Select a video</h2>
        {entries.map((entry)=><button key={entry.id} onClick={()=>open(entry)} type="button" className="flex min-h-[66px] w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:border-cyan-300/60">
          <span className="text-sm font-bold">{entry.title}<small className="mt-1 block font-normal text-slate-400">{entry.description}</small></span><span className="text-cyan-300">▶</span>
        </button>)}
        <label className="block rounded-xl border border-dashed border-cyan-300/50 p-4 text-sm text-slate-300">Import local MP4 clips for this session
          <input type="file" accept="video/*" multiple className="mt-2 block w-full text-xs" onChange={e=>importVideos(e.currentTarget.files)}/>
        </label>
        <p className="text-xs text-slate-400">Rockstar videos are credited and hosted by their original publisher. Editing a copyrighted video does not automatically give redistribution rights.</p>
      </div>
    </div>
    {selected&&<div role="dialog" aria-modal="true" aria-label={selected.title} className="fixed inset-0 z-[70] grid place-items-center overflow-auto bg-black/90 p-4 backdrop-blur-xl" onKeyDown={e=>{if(e.key==='Escape')close()}}>
      <div className="w-full max-w-4xl rounded-2xl border border-cyan-300/40 bg-[#111b29] p-5">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-display text-2xl font-black">{selected.title}</h2><p className="text-xs text-slate-400">{selected.description}</p></div><button autoFocus onClick={close} type="button" className="rounded-xl border border-red-300/40 bg-red-700/20 px-4 py-3">✕ Close</button></div>
        {selected.localSrc?<video key={selected.localSrc} src={selected.localSrc} controls playsInline autoPlay muted className="mx-auto max-h-[65vh] w-full rounded-xl bg-black object-contain"/>:selected.youtubeId?<iframe title={selected.title} src={'https://www.youtube-nocookie.com/embed/'+selected.youtubeId+'?rel=0'} className="aspect-video w-full rounded-xl border-0 bg-black" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:<div className="rounded-xl bg-black/40 p-10 text-center text-slate-300">This video plays on the official Rockstar website. Use the link below.</div>}
        {selected.link&&<a href={selected.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold">Open original video</a>}
      </div>
    </div>}
    {smoke&&<div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"><div className="video-vault-puff absolute inset-[-40%] rounded-full bg-[radial-gradient(ellipse,#e5f4fff2,#a2c8d9d5_28%,#7189a991_45%,transparent_63%)] blur-3xl" style={{animation:'video-vault-puff .98s ease-out forwards'}}/></div>}
  </section>;
}