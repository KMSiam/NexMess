import { useEffect } from 'react'

interface SEOProps {
  title: string
  description?: string
  keywords?: string
  canonical?: string
  robots?: string
  ogType?: string
  ogImage?: string
  twitterCard?: 'summary_large_image' | 'summary'
  locale?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

const DEFAULT_OG_IMAGE = 'https://www.nexmess.shop/og-image.png'

export function useSEO({
  title,
  description,
  keywords,
  canonical,
  robots,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  twitterCard = 'summary_large_image',
  locale,
  jsonLd,
}: SEOProps) {
  const serializedJsonLd = jsonLd ? JSON.stringify(jsonLd) : ''

  useEffect(() => {
    const resolvedTitle =
      title.includes('NexMess') || title.includes('নেক্সমেস') ? title : `${title} | NexMess`

    // 1. Title
    const prevTitle = document.title
    document.title = resolvedTitle

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
    const metaOgTitle = getOrCreateMeta('meta[property="og:title"]', 'property', 'og:title')
    const prevOgTitle = metaOgTitle.getAttribute('content')
    metaOgTitle.setAttribute('content', resolvedTitle)

    let metaOgDesc: Element | null = null
    let prevOgDesc: string | null = null
    if (description) {
      metaOgDesc = getOrCreateMeta('meta[property="og:description"]', 'property', 'og:description')
      prevOgDesc = metaOgDesc.getAttribute('content')
      metaOgDesc.setAttribute('content', description)
    }

    let metaOgUrl: Element | null = null
    let prevOgUrl: string | null = null
    if (canonical) {
      metaOgUrl = getOrCreateMeta('meta[property="og:url"]', 'property', 'og:url')
      prevOgUrl = metaOgUrl.getAttribute('content')
      metaOgUrl.setAttribute('content', canonical)
    }

    const metaOgType = getOrCreateMeta('meta[property="og:type"]', 'property', 'og:type')
    const prevOgType = metaOgType.getAttribute('content')
    metaOgType.setAttribute('content', ogType)

    const metaOgImage = getOrCreateMeta('meta[property="og:image"]', 'property', 'og:image')
    const prevOgImage = metaOgImage.getAttribute('content')
    metaOgImage.setAttribute('content', ogImage)

    const activeLang = (document.documentElement.lang || 'en').startsWith('bn') ? 'bn_BD' : 'en_US'
    const resolvedLocale = locale || activeLang
    const metaOgLocale = getOrCreateMeta('meta[property="og:locale"]', 'property', 'og:locale')
    const prevOgLocale = metaOgLocale.getAttribute('content')
    metaOgLocale.setAttribute('content', resolvedLocale)

    // 6. Twitter Meta Tags (always use name="twitter:*")
    const metaTwCard = getOrCreateMeta('meta[name="twitter:card"]', 'name', 'twitter:card')
    const prevTwCard = metaTwCard.getAttribute('content')
    metaTwCard.setAttribute('content', twitterCard)

    let metaTwUrl: Element | null = null
    let prevTwUrl: string | null = null
    if (canonical) {
      metaTwUrl = getOrCreateMeta('meta[name="twitter:url"]', 'name', 'twitter:url')
      prevTwUrl = metaTwUrl.getAttribute('content')
      metaTwUrl.setAttribute('content', canonical)
    }

    const metaTwTitle = getOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title')
    const prevTwTitle = metaTwTitle.getAttribute('content')
    metaTwTitle.setAttribute('content', resolvedTitle)

    let metaTwDesc: Element | null = null
    let prevTwDesc: string | null = null
    if (description) {
      metaTwDesc = getOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description')
      prevTwDesc = metaTwDesc.getAttribute('content')
      metaTwDesc.setAttribute('content', description)
    }

    const metaTwImage = getOrCreateMeta('meta[name="twitter:image"]', 'name', 'twitter:image')
    const prevTwImage = metaTwImage.getAttribute('content')
    metaTwImage.setAttribute('content', ogImage)

    // 7. Page-specific JSON-LD Schema (e.g., FAQPage)
    let ldScript: HTMLScriptElement | null = null
    if (serializedJsonLd) {
      ldScript = document.createElement('script')
      ldScript.type = 'application/ld+json'
      ldScript.setAttribute('data-nexmess-seo-ld', 'true')
      ldScript.text = serializedJsonLd
      document.head.appendChild(ldScript)
    }

    return () => {
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
      if (metaOgLocale) {
        if (prevOgLocale) metaOgLocale.setAttribute('content', prevOgLocale)
        else metaOgLocale.remove()
      }
      if (metaTwCard) {
        if (prevTwCard) metaTwCard.setAttribute('content', prevTwCard)
        else metaTwCard.remove()
      }
      if (metaTwUrl) {
        if (prevTwUrl) metaTwUrl.setAttribute('content', prevTwUrl)
        else metaTwUrl.remove()
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
      if (ldScript) {
        ldScript.remove()
      }
    }
  }, [title, description, keywords, canonical, robots, ogType, ogImage, twitterCard, locale, serializedJsonLd])
}
