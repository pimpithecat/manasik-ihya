/**
 * Data terstruktur (JSON-LD) untuk mesin pencari.
 * Semua URL dibuat absolut dari `Astro.site`.
 */
export type JsonLd = Record<string, unknown>

const FALLBACK = new URL('https://manasik-ihya.pages.dev')

export function baseUrl(site: URL | undefined): URL {
  return site ?? FALLBACK
}

export function organizationJsonLd(site: URL | undefined): JsonLd {
  const url = baseUrl(site)
  return {
    '@type': 'Organization',
    name: "Manasik Ihya'",
    url: url.href,
    logo: {
      '@type': 'ImageObject',
      url: new URL('/icons/icon-512.png', url).href,
    },
  }
}

export function websiteJsonLd(site: URL | undefined, description: string): JsonLd {
  const url = baseUrl(site)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: "Manasik Ihya'",
    alternateName: 'Manasik Umrah',
    url: url.href,
    description,
    inLanguage: 'id',
    publisher: organizationJsonLd(site),
  }
}

export function breadcrumbJsonLd(
  site: URL | undefined,
  items: Array<{ name: string; path: string }>
): JsonLd {
  const url = baseUrl(site)
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, url).href,
    })),
  }
}

export function webPageJsonLd(
  site: URL | undefined,
  data: { name: string; description: string; path: string }
): JsonLd {
  const url = baseUrl(site)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: data.name,
    description: data.description,
    url: new URL(data.path, url).href,
    inLanguage: 'id',
    isPartOf: {
      '@type': 'WebSite',
      name: "Manasik Ihya'",
      url: url.href,
    },
    about: { '@type': 'Thing', name: 'Umrah' },
    publisher: organizationJsonLd(site),
  }
}
