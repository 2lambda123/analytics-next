import fetch from 'unfetch'
import { Analytics, AnalyticsSettings, InitOptions } from './analytics'
import { Context } from './core/context'
import { ajsDestinations } from './extensions/ajs-destination'
import { pageEnrichment } from './extensions/page-enrichment'
import { validation } from './extensions/validation'

export { LegacyDestination } from './extensions/ajs-destination'

export interface LegacyIntegrationConfiguration {
  type?: string
  // The version field is temporary as some sources were not rebuilt yet.
  version?: string
  versionSettings?: {
    version?: string
    override?: string
  }
}

export interface LegacySettings {
  integrations: {
    [name: string]: LegacyIntegrationConfiguration
  }
}

async function loadLegacySettings(writeKey: string): Promise<LegacySettings> {
  const legacySettings: LegacySettings = {
    integrations: {},
  }

  try {
    return await fetch(`https://cdn-settings.segment.com/v1/projects/${writeKey}/settings`).then((res) => res.json())
  } catch (err) {
    // proceed with default legacy settings
    console.warn('Failed to load legacy settings', err)
  }

  return Promise.resolve(legacySettings)
}

export class AnalyticsBrowser {
  static async load(settings: AnalyticsSettings, options: InitOptions = {}): Promise<[Analytics, Context]> {
    const analytics = new Analytics(settings, options)

    const extensions = settings.extensions ?? []
    const legacySettings = await loadLegacySettings(settings.writeKey)

    const remoteExtensions = process.env.NODE_ENV !== 'test' ? await ajsDestinations(legacySettings, analytics.integrations, options) : []

    const toRegister = [validation, pageEnrichment, ...extensions, ...remoteExtensions]
    const ctx = await analytics.register(...toRegister)

    analytics.emit('initialize', settings, options)

    if (options.initialPageview) await analytics.page()

    return [analytics, ctx]
  }

  static async standalone(writeKey: string, options?: InitOptions): Promise<Analytics> {
    const [analytics] = await AnalyticsBrowser.load({ writeKey }, options)
    return analytics
  }
}
