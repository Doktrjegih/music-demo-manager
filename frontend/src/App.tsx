import { useEffect, useState } from 'react'

type FileEntry = { name:string; path:string; extension:string; playable:boolean; url:string }
type Song = { id:string; title:string; description:string; youtube:string|string[]; files:FileEntry[] }
const API = import.meta.env.VITE_API_URL || ''
const fileUrl = (url:string) => API + url

export default function App() {
  const [songs,setSongs] = useState<Song[]>([])
  const [error,setError] = useState('')
  const [filter,setFilter] = useState('')
  const [loading,setLoading] = useState(true)
  useEffect(() => {
    fetch(API + '/api/songs').then(async r => {
      if (!r.ok) throw new Error('Server error: ' + r.status)
      return r.json()
    }).then(setSongs).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])
  const shown = songs.filter(s => s.title.toLowerCase().includes(filter.toLowerCase()))
  return <main className="container">
    <header><div className="logo">♫</div><div><h1>Music Demos</h1><p>Your music projects, in one place</p></div></header>
    <label className="search-label" htmlFor="search">Find a song</label>
    <input id="search" type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search demos…" />
    {loading && <p>Loading library…</p>}
    {error && <p role="alert" className="error">Could not load library: {error}. Check the backend connection.</p>}
    {!loading && !error && shown.length === 0 && <p>No demos found. Add a folder to backend/music-library.</p>}
    <section className="songs">{shown.map(song=><details key={song.id} className="song">
      <summary><span className="song-title">{song.title}</span><span className="count">{song.files.length} files</span></summary>
      <div className="song-body">
        {song.description && <p>{song.description}</p>}
        {(Array.isArray(song.youtube) ? song.youtube : song.youtube ? [song.youtube] : []).map((link,i)=><p key={i}><a href={link} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></p>)}
        {song.files.map(file=><div className="file" key={file.path}>
          <div className="file-head"><span className="file-name">{file.path}</span><a href={fileUrl(file.url)} download={file.name}>Download ↓</a></div>
          {file.playable && <audio controls preload="none" src={fileUrl(file.url)} />}
        </div>)}
      </div>
    </details>)}</section>
    <footer>Install on iPhone: Safari → Share → Add to Home Screen</footer>
  </main>
}
