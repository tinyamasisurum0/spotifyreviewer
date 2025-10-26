'use client'

import { useState } from 'react'
import { extractPlaylistIdFromUrl } from '../utils/spotifyApi'
import PlaylistAnalyzer, { InputMode } from '../components/PlaylistAnalyzer'
import { DragDropContext } from 'react-beautiful-dnd'

export default function Home() {
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>('review')

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
        <p className="text-sm mb-3">Put at least one song from an album to your playlist, then retrieve with app by pasting its url. <br></br>Put your comments, <strong>change the orders</strong>, download and share. Thanks for using..</p>
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
