import { Analytics } from '../..'
import { Context } from '../context'

interface ExtensionConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any
  priority: 'critical' | 'non-critical' // whether AJS should expect this extension to be loaded before starting event delivery
}

// enrichment - modifies the event. Enrichment can happen in parallel, by reducing all changes in the final event. Failures in this stage could halt event delivery.
// destination - runs in parallel at the end of the lifecycle. Cannot modify the event, can fail and not halt execution.
// utility - do not affect lifecycle. Should be run and executed once. Their `track/identify` calls don't really do anything. example

export interface Extension {
  name: string
  version: string
  type: 'before' | 'after' | 'destination' | 'enrichment' | 'utility'

  isLoaded: () => boolean
  load: (ctx: Context, instance: Analytics, config?: ExtensionConfig) => Promise<unknown>

  ready?: () => Promise<unknown>
  track?: (ctx: Context) => Promise<Context>
  identify?: (ctx: Context) => Promise<Context>
  page?: (ctx: Context) => Promise<Context>
  group?: (ctx: Context) => Promise<Context>
  alias?: (ctx: Context) => Promise<Context>
  screen?: (ctx: Context) => Promise<Context>
}
