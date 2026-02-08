export default function VideoEmbed({ url }) {
  const getEmbedUrl = (url) => {
    if (!url) return null
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1] || url.split('/').pop()
      const cleanId = videoId?.split('&')[0]
      return `https://www.youtube.com/embed/${cleanId}`
    }
    return url
  }

  const embedUrl = getEmbedUrl(url?.trim())

  if (!embedUrl) return <div className="text-red-500">Invalid Video URL</div>

  return (
    <div className="my-4 aspect-video rounded-lg overflow-hidden shadow-sm">
      <iframe
        src={embedUrl}
        title="Video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}
