'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { extractPlaylistIdFromUrl } from '../utils/spotifyApi'
import PlaylistAnalyzer, { InputMode } from '../components/PlaylistAnalyzer'
import { DragDropContext } from 'react-beautiful-dnd'

export default function Home() {
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>('review')
  const [copiedSampleLink, setCopiedSampleLink] = useState(false)
  const samplePlaylistUrl = 'https://open.spotify.com/playlist/0xy8aNki7WxsM42dkTOmER'
  const handleCopySampleLink = async () => {
    try {
      await navigator.clipboard.writeText(samplePlaylistUrl)
      setCopiedSampleLink(true)
      setTimeout(() => setCopiedSampleLink(false), 2000)
    } catch (error) {
      console.error('Failed to copy sample playlist link', error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = extractPlaylistIdFromUrl(playlistUrl)
    if (id) {
      setPlaylistId(id)
    } else {
      alert('Geçersiz Spotify playlist URL\'si. Lütfen kontrol edip tekrar deneyin.')
    }
  }

  return (
    <DragDropContext onDragEnd={() => {}}>
      <div className="container mx-auto px-4 py-8 bg-gray-900 text-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-3">Spotify Album Reviewer</h1>
        <div className="text-sm mb-3 space-y-1">
          <p className="font-semibold text-gray-200">Build your album roundup in minutes:</p>
          <ol className="list-decimal list-inside text-gray-300 space-y-1">
            <li>Paste a Spotify playlist link below.</li>
            <li>See every album ready for ratings and drag-and-drop ordering.</li>
            <li>Download the lineup as a JPEG or share it with your friends.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 text-xs">
            <span className="uppercase tracking-wide text-gray-500">Sample playlist</span>
            <a
              href={samplePlaylistUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-gray-300 hover:text-green-300 transition-colors truncate max-w-[220px] sm:max-w-[320px]"
            >
              {samplePlaylistUrl}
            </a>
            <button
              type="button"
              onClick={handleCopySampleLink}
              className="inline-flex items-center gap-1 rounded border border-gray-700 px-2 py-1 text-gray-200 hover:border-green-400 hover:text-green-300 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copiedSampleLink ? 'Copied!' : 'Copy link'}</span>
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="mb-8">
          <input
            type="text"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="Enter Spotify playlist URL"
            className="w-full p-2 border border-gray-700 rounded bg-gray-800 text-gray-100 placeholder-gray-500 mb-2"
          />
          <button
            type="submit"
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Get Playlist
          </button>
        </form>
        {playlistId && (
          <PlaylistAnalyzer
            playlistId={playlistId}
            inputMode={inputMode}
            onInputModeChange={setInputMode}
          />
        )}
      </div>
      <div><p className="text-center m-6">Made by <a className='font-extrabold	underline' target='_blank' href="https://x.com/tinyamasisurum0">tinyamasisurum0</a> - Messages on X for feature requests are appreciated.</p></div>
    </DragDropContext>
  )
}
