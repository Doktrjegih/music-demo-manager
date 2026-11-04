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
  const [signedIn,setSignedIn] = useState(false)
  const [username,setUsername] = useState('music')
  const [password,setPassword] = useState('')
  const [remember,setRemember] = useState(true)
  const [busy,setBusy] = useState(false)

  async function loadSongs() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(API + '/api/songs', { credentials: 'include' })
      if (r.status === 401) { setSignedIn(false); setSongs([]); return }
      if (!r.ok) throw new Error('Server error: ' + r.status)
      setSongs(await r.json())
      setSignedIn(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load library') }
    finally { setLoading(false) }
  }
  useEffect(() => { void loadSongs() }, [])

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const r = await fetch(API + '/api/auth/login', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, remember })
      })
      if (!r.ok) throw new Error(r.status === 401 ? 'Incorrect username or password' : 'Login failed')
      setPassword('')
      await loadSongs()
    } catch (e) { setError(e instanceof Error ? e.message : 'Login failed') }
    finally { setBusy(false) }
  }

  async function signOut() {
    await fetch(API + '/api/auth/logout', { method: 'POST', credentials: 'include' })
    setSignedIn(false); setSongs([]); setPassword('')
  }

  const shown = songs.filter(s => s.title.toLowerCase().includes(filter.toLowerCase()))
  return <main className="container">
    <header><div className="logo">♫</div><div><h1>Music Demos</h1><p>Your music projects, in one place</p></div></header>
    {loading && <p>Loading library…</p>}
    {!loading && !signedIn && <form className="login" onSubmit={signIn}>
      <h2>Sign in</h2>
      <label htmlFor="username">Username</label>
      <input id="username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required />
      <label htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required />
      <label className="remember"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} /> Remember me for 30 days</label>
      <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>}
    {error && <p role="alert" className="error">{error}</p>}
    {signedIn && <>
      <div className="toolbar"><label htmlFor="search">Find a song</label><button type="button" onClick={signOut}>Sign out</button></div>
      <input id="search" type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search demos…" />
      {!loading && !error && shown.length === 0 && <p>No demos found. Add a folder to the music-library directory.</p>}
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
    </>}
    <footer>Install on iPhone: Safari → Share → Add to Home Screen</footer>
  </main>
}
