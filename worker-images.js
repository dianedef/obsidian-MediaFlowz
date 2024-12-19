addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Exemple : images.votredomaine.com/IMAGE_ID/variant
  const pathParts = url.pathname.split('/').filter(p => p)
  
  if (pathParts.length < 1) {
    return new Response('Not Found', { status: 404 })
  }

  const imageId = pathParts[0]
  const variant = pathParts[1] || 'public'
  
  // Votre Account ID Cloudflare
  const accountId = 'VOTRE_ACCOUNT_ID'
  
  // Redirection vers Cloudflare Images
  const imageUrl = `https://imagedelivery.net/${accountId}/${imageId}/${variant}`
  
  return fetch(imageUrl)
} 