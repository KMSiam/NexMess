import { useEffect } from 'react'

interface SEOProps {
  title: string
  description?: string
  keywords?: string
  canonical?: string
  robots?: string
  ogType?: string
  ogImage?: string
}

export function useSEO({
  title,
  description,
  keywords,
  canonical,
  robots,
  ogType = 'website',
  ogImage = 'https://nexmess.shop/favicon.svg',
}: SEOProps) {
  useEffect(() => {
    // 1. Title
    const prevTitle = document.title
    document.title = title.includes('NexMess') ? title : `${title} | NexMess`

    // Helper to get or create element
    const getOrCreateMeta = (selector: string, attrName: string, attrVal: string) => {
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attrName, attrVal)
        document.head.appendChild(el)
      }
      return el
    }

    // 2. Meta Description
    let metaDesc: Element | null = null
    let prevDesc: string | null = null
    if (description) {
      metaDesc = getOrCreateMeta('meta[name="description"]', 'name', 'description')
      prevDesc = metaDesc.getAttribute('content')
      metaDesc.setAttribute('content', description)
    }

    // Meta Keywords
    let metaKeywords: Element | null = null
    let prevKeywords: string | null = null
    if (keywords) {
      metaKeywords = getOrCreateMeta('meta[name="keywords"]', 'name', 'keywords')
      prevKeywords = metaKeywords.getAttribute('content')
      metaKeywords.setAttribute('content', keywords)
    }

    // 3. Canonical Link
    let linkCanonical: Element | null = null
    let prevCanonical: string | null = null
    if (canonical) {
      linkCanonical = document.querySelector('link[rel="canonical"]')
      if (!linkCanonical) {
        linkCanonical = document.createElement('link')
        linkCanonical.setAttribute('rel', 'canonical')
        document.head.appendChild(linkCanonical)
      }
      prevCanonical = linkCanonical.getAttribute('href')
      linkCanonical.setAttribute('href', canonical)
    }

    // 4. Robots
    let metaRobots: Element | null = null
    let prevRobots: string | null = null
    if (robots) {
      metaRobots = getOrCreateMeta('meta[name="robots"]', 'name', 'robots')
      prevRobots = metaRobots.getAttribute('content')
      metaRobots.setAttribute('content', robots)
    }

    // 5. Open Graph Meta Tags
    // og:title
    const metaOgTitle = getOrCreateMeta('meta[property="og:title"]', 'property', 'og:title')
    const prevOgTitle = metaOgTitle.getAttribute('content')
    metaOgTitle.setAttribute('content', title.includes('NexMess') ? title : `${title} | NexMess`)

    // og:description
    let metaOgDesc: Element | null = null
    let prevOgDesc: string | null = null
    if (description) {
      metaOgDesc = getOrCreateMeta('meta[property="og:description"]', 'property', 'og:description')
      prevOgDesc = metaOgDesc.getAttribute('content')
      metaOgDesc.setAttribute('content', description)
    }

    // og:url
    let metaOgUrl: Element | null = null
    let prevOgUrl: string | null = null
    if (canonical) {
      metaOgUrl = getOrCreateMeta('meta[property="og:url"]', 'property', 'og:url')
      prevOgUrl = metaOgUrl.getAttribute('content')
      metaOgUrl.setAttribute('content', canonical)
    }

    // og:type
    const metaOgType = getOrCreateMeta('meta[property="og:type"]', 'property', 'og:type')
    const prevOgType = metaOgType.getAttribute('content')
    metaOgType.setAttribute('content', ogType)

    // og:image
    const metaOgImage = getOrCreateMeta('meta[property="og:image"]', 'property', 'og:image')
    const prevOgImage = metaOgImage.getAttribute('content')
    metaOgImage.setAttribute('content', ogImage)

    // 6. Twitter Meta Tags
    // twitter:title
    const metaTwTitle = getOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title')
    const prevTwTitle = metaTwTitle.getAttribute('content')
    metaTwTitle.setAttribute('content', title.includes('NexMess') ? title : `${title} | NexMess`)

    // twitter:description
    let metaTwDesc: Element | null = null
    let prevTwDesc: string | null = null
    if (description) {
      metaTwDesc = getOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description')
      prevTwDesc = metaTwDesc.getAttribute('content')
      metaTwDesc.setAttribute('content', description)
    }

    // twitter:image
    const metaTwImage = getOrCreateMeta('meta[name="twitter:image"]', 'name', 'twitter:image')
    const prevTwImage = metaTwImage.getAttribute('content')
    metaTwImage.setAttribute('content', ogImage)

    return () => {
      // Cleanup / restore previous values
      document.title = prevTitle

      if (metaDesc) {
        if (prevDesc) metaDesc.setAttribute('content', prevDesc)
        else metaDesc.remove()
      }

      if (metaKeywords) {
        if (prevKeywords) metaKeywords.setAttribute('content', prevKeywords)
        else metaKeywords.remove()
      }

      if (linkCanonical) {
        if (prevCanonical) linkCanonical.setAttribute('href', prevCanonical)
        else linkCanonical.remove()
      }

      if (metaRobots) {
        if (prevRobots) metaRobots.setAttribute('content', prevRobots)
        else metaRobots.remove()
      }

      if (metaOgTitle) {
        if (prevOgTitle) metaOgTitle.setAttribute('content', prevOgTitle)
        else metaOgTitle.remove()
      }

      if (metaOgDesc) {
        if (prevOgDesc) metaOgDesc.setAttribute('content', prevOgDesc)
        else metaOgDesc.remove()
      }

      if (metaOgUrl) {
        if (prevOgUrl) metaOgUrl.setAttribute('content', prevOgUrl)
        else metaOgUrl.remove()
      }

      if (metaOgType) {
        if (prevOgType) metaOgType.setAttribute('content', prevOgType)
        else metaOgType.remove()
      }

      if (metaOgImage) {
        if (prevOgImage) metaOgImage.setAttribute('content', prevOgImage)
        else metaOgImage.remove()
      }

      if (metaTwTitle) {
        if (prevTwTitle) metaTwTitle.setAttribute('content', prevTwTitle)
        else metaTwTitle.remove()
      }

      if (metaTwDesc) {
        if (prevTwDesc) metaTwDesc.setAttribute('content', prevTwDesc)
        else metaTwDesc.remove()
      }

      if (metaTwImage) {
        if (prevTwImage) metaTwImage.setAttribute('content', prevTwImage)
        else metaTwImage.remove()
      }
    }
  }, [title, description, keywords, canonical, robots, ogType, ogImage])
}
