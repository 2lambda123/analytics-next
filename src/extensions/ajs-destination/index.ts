/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { Identify } from '@segment/facade/dist/identify'
import { Track } from '@segment/facade/dist/track'
import fetch from 'unfetch'
import { isOffline } from '../../core/connection'
import { Context } from '../../core/context'
import { Emitter } from '../../core/emitter'
import { Integrations } from '../../core/events'
import { Extension } from '../../core/extension'
import { attempt } from '../../core/queue/delivery'
import { User } from '../../core/user'
import { Analytics } from '../../index'
import { loadScript } from '../../lib/load-script'

export interface LegacyIntegration extends Emitter {
  analytics?: Analytics
  initialize: () => void
  loaded: () => boolean

  track?: (event: typeof Track) => void | Promise<void>
  identify?: (event: typeof Identify) => void | Promise<void>
}

const path = process.env.LEGACY_INTEGRATIONS_PATH ?? 'https://cdn.segment.build/next-integrations'

async function flushQueue(xt: Extension, queue: Context[]): Promise<Context[]> {
  const failedQueue: Context[] = []

  const attempts = queue.map(async (ctx) => {
    const result = await attempt(ctx, xt)
    const success = result instanceof Context
    if (!success) {
      failedQueue.push(ctx)
    }
  })

  await Promise.all(attempts)
  return failedQueue
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace('.', '').replace(/\s+/g, '-')
}

export function ajsDestination(name: string, version: string, settings?: object): Extension {
  let buffer: Context[] = []
  let flushing = false

  let integration: LegacyIntegration
  let ready = false

  const xt: Extension = {
    name,
    type: 'destination',
    version,

    isLoaded: () => {
      return ready
    },

    load: async (_ctx, analyticsInstance) => {
      const pathName = normalizeName(name)
      await loadScript(`${path}/${pathName}/${version}/${pathName}.js`)

      // @ts-ignore
      let integrationBuilder = window[`${pathName}Integration`]

      // GA and Appcues use a different interface to instantiating integrations
      if (integrationBuilder.Integration) {
        const analyticsStub = {
          user: (): User => analyticsInstance.user(),
          addIntegration: (): void => {},
        }

        integrationBuilder(analyticsStub)
        integrationBuilder = integrationBuilder.Integration
      }

      integration = new integrationBuilder(settings)
      integration.analytics = analyticsInstance
      integration.once('ready', () => {
        ready = true
      })

      integration.initialize()
    },

    async track(ctx) {
      if (!ready || isOffline()) {
        buffer.push(ctx)
        return ctx
      }

      // @ts-ignore
      const trackEvent = new Track(ctx.event, {})

      if (integration.track) {
        await integration.track(trackEvent)
      }

      return ctx
    },

    async identify(ctx) {
      if (!ready || isOffline()) {
        buffer.push(ctx)
        return ctx
      }
      // @ts-ignore
      const trackEvent = new Identify(ctx.event, {})

      if (integration.identify) {
        await integration.identify(trackEvent)
      }

      return ctx
    },
  }

  const scheduleFlush = (): void => {
    if (flushing || isOffline()) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      flushing = true
      buffer = await flushQueue(xt, buffer)
      flushing = false
      scheduleFlush()
    }, Math.random() * 10000)
  }

  scheduleFlush()

  return xt
}

export async function ajsDestinations(writeKey: string, integrations: Integrations = {}): Promise<Extension[]> {
  const [settingsResponse] = await Promise.all([
    fetch(`https://cdn-settings.segment.com/v1/projects/${writeKey}/settings`),
    // loadScript(`${path}/commons/latest/commons.js`),
  ])

  const settings = await settingsResponse.json()

  return Object.entries(settings.integrations)
    .map(([name, settings]) => {
      if (integrations[name] === false || integrations['All'] === false) {
        return
      }

      return ajsDestination(name, 'latest', settings as object)
    })
    .filter((xt) => xt !== undefined) as Extension[]
}
