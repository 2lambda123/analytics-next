import type { Context } from '@/core/context'
import type { Plugin } from '@/core/plugin'

interface PageDefault {
  path: string
  referrer: string
  search: string
  title: string
  url: string
}

/**
 * Get the current page's canonical URL.
 *
 * @return {string|undefined}
 */
function canonical(): string {
  const tags = document.getElementsByTagName('link')
  let canon: string | null = ''

  Array.from(tags).forEach((tag) => {
    if (tag.getAttribute('rel') === 'canonical') {
      canon = tag.getAttribute('href')
    }
  })

  return canon
}

/**
 * Return the canonical path for the page.
 */

function canonicalPath(): string {
  const canon = canonical()
  if (!canon) {
    return window.location.pathname
  }

  const a = document.createElement('a')
  a.href = canon
  const pathname = !a.pathname.startsWith('/') ? '/' + a.pathname : a.pathname

  return pathname
}

/**
 * Return the canonical URL for the page concat the given `search`
 * and strip the hash.
 */

export function canonicalUrl(search = ''): string {
  const canon = canonical()
  if (canon) {
    return canon.includes('?') ? canon : `${canon}${search}`
  }
  const url = window.location.href
  const i = url.indexOf('#')
  return i === -1 ? url : url.slice(0, i)
}

/**
 * Return a default `options.context.page` object.
 *
 * https://segment.com/docs/spec/page/#properties
 */

export function pageDefaults(): PageDefault {
  return {
    path: canonicalPath(),
    referrer: document.referrer,
    search: location.search,
    title: document.title,
    url: canonicalUrl(location.search),
  }
}

function enrichPageContext(ctx: Context): Context {
  const event = ctx.event
  event.context = event.context || {}
  let pageContext = pageDefaults()

  if (event.context.page) {
    pageContext = Object.assign({}, pageContext, event.context.page)
  }

  event.context = Object.assign({}, event.context, {
    page: pageContext,
  })

  ctx.event = event

  return ctx
}

export const pageEnrichment: Plugin = {
  name: 'Page Enrichment',
  version: '0.1.0',
  isLoaded: () => true,
  load: () => Promise.resolve(),
  type: 'enrichment',

  page: (ctx) => {
    ctx.event.properties = Object.assign(
      {},
      ctx.event.properties,
      pageDefaults()
    )

    if (ctx.event.name) {
      ctx.event.properties.name = ctx.event.name
    }

    return enrichPageContext(ctx)
  },

  alias: enrichPageContext,
  track: enrichPageContext,
  identify: enrichPageContext,
  group: enrichPageContext,
}
