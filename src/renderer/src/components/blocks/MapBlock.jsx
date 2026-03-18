import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Fix for default Leaflet markers getting 404s in React router setups
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
})

export default function MapBlock({ content, theme, onUpdate }) {
  const config = useMemo(() => {
    try {
      const parsed = JSON.parse(content)
      return {
        lat: parsed.lat || 51.505,
        lng: parsed.lng || -0.09,
        zoom: parsed.zoom || 13,
        tooltip: parsed.tooltip || 'Marker Location'
      }
    } catch {
      return { lat: 51.505, lng: -0.09, zoom: 13, tooltip: 'London' }
    }
  }, [content])

  const handleMapClick = (latlng) => {
    if (!onUpdate) return
    const newConfig = { ...config, lat: latlng.lat, lng: latlng.lng }
    // Optional: could grab current zoom from map instance, but we'll leave it as is
    onUpdate(JSON.stringify(newConfig, null, 2))
  }

  function MapEvents() {
    useMapEvents({
      click(e) {
        handleMapClick(e.latlng)
      }
    })
    return null
  }

  return (
    <div
      className={`my-4 border rounded-xl overflow-hidden shadow-sm flex flex-col z-0 ${
        theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
      }`}
    >
      <div style={{ height: '300px', width: '100%' }}>
        <MapContainer
          center={[config.lat, config.lng]}
          zoom={config.zoom}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={
              theme === 'dark'
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
          />
          <MapEvents />
          <Marker position={[config.lat, config.lng]}>
            <Popup>{config.tooltip}</Popup>
          </Marker>
        </MapContainer>
      </div>

      <div
        className={`px-4 py-2 border-t flex justify-between items-center text-xs font-mono
        ${theme === 'dark' ? 'border-slate-800 text-slate-400 bg-slate-800/30' : 'border-slate-200 text-slate-500 bg-slate-50/50'}`}
      >
        <div className="flex gap-4">
          <span>Lat: {parseFloat(config.lat).toFixed(5)}</span>
          <span>Lng: {parseFloat(config.lng).toFixed(5)}</span>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${config.lat},${config.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1"
          onClick={(e) => {
            // Stop propagation so we don't accidentally enter block editing if click bleeds through
            e.stopPropagation()
          }}
        >
          Open in Maps ↗
        </a>
      </div>
    </div>
  )
}
