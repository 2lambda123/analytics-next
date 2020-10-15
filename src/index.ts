/* eslint-disable @typescript-eslint/ban-ts-ignore */
import {
  DispatchedEvent,
  EventParams,
  PageParams,
  resolveArguments,
  resolvePageArguments,
  resolveUserArguments,
  UserParams,
} from './core/arguments-resolver'
import { Callback, invokeCallback } from './core/callback'
import { Context } from './core/context'
import { Emitter } from './core/emitter'
import { EventFactory, Integrations, SegmentEvent } from './core/events'
import { Extension } from './core/extension'
import { EventQueue } from './core/queue/event-queue'
import { Group, User } from './core/user'
import { ajsDestinations } from './extensions/ajs-destination'
import { pageEnrichment } from './extensions/page-enrichment'
import { validation } from './extensions/validation'

export interface AnalyticsSettings {
  writeKey: string
  timeout?: number
  extensions?: Extension[]
  integrations?: Integrations
}

export { ajsDestination } from './extensions/ajs-destination'

export class Analytics extends Emitter {
  queue: EventQueue
  private settings: AnalyticsSettings
  private _user: User
  private _group: Group
  private eventFactory: EventFactory
  private integrations: Integrations

  private constructor(settings: AnalyticsSettings, queue: EventQueue, user: User, group: Group) {
    super()
    this.settings = settings
    this.queue = queue
    this._user = user
    this._group = group
    this.eventFactory = new EventFactory(user)
    this.integrations = settings.integrations ?? {}
  }

  static async load(settings: AnalyticsSettings): Promise<[Analytics, Context]> {
    const queue = new EventQueue()

    const user = new User().load()
    const group = new Group().load()
    const analytics = new Analytics(settings, queue, user, group)

    const extensions = settings.extensions ?? []
    const remoteExtensions = process.env.NODE_ENV !== 'test' ? await ajsDestinations(settings.writeKey, analytics.integrations) : []
    const ctx = await analytics.register(...[validation, pageEnrichment, ...extensions, ...remoteExtensions])

    analytics.emit(
      'initialize',
      settings,
      // TODO: options
      {}
    )

    return [analytics, ctx]
  }

  user(): User {
    return this._user
  }

  async track(...args: EventParams): DispatchedEvent {
    const [name, data, opts, cb] = resolveArguments(...args)

    const segmentEvent = this.eventFactory.track(name, data, opts, this.integrations)
    this.emit('track', name, data, opts)
    return this.dispatch(segmentEvent, cb)
  }

  async page(...args: PageParams): DispatchedEvent {
    const [category, page, properties, options, callback] = resolvePageArguments(...args)

    const segmentEvent = this.eventFactory.page(category, page, properties, options, this.integrations)
    this.emit('page', category, name, properties, options)
    return this.dispatch(segmentEvent, callback)
  }

  async identify(...args: UserParams): DispatchedEvent {
    const [id, _traits, options, callback] = resolveUserArguments(this._user)(...args)

    this._user.identify(id, _traits)
    const segmentEvent = this.eventFactory.identify(this._user.id(), this._user.traits(), options, this.integrations)

    this.emit('identify', this._user.id(), this._user.traits(), options)
    return this.dispatch(segmentEvent, callback)
  }

  group(...args: UserParams): DispatchedEvent | Group {
    if (args.length === 0) {
      return this._group
    }

    const [id, _traits, options, callback] = resolveUserArguments(this._group)(...args)

    this._group.identify(id, _traits)
    const groupId = this._group.id()
    const groupdTraits = this._group.traits()

    const segmentEvent = this.eventFactory.group(groupId, groupdTraits, options, this.integrations)

    this.emit('group', groupId, groupdTraits, options)
    return this.dispatch(segmentEvent, callback)
  }

  // TODO: alias

  async register(...extensions: Extension[]): Promise<Context> {
    const ctx = Context.system()

    const registrations = extensions.map((xt) => this.queue.register(ctx, xt, this))
    await Promise.all(registrations)

    return ctx
  }

  reset(): void {
    this._user.reset()
  }

  private async dispatch(event: SegmentEvent, callback?: Callback): DispatchedEvent {
    const ctx = new Context(event)
    const dispatched = await this.queue.dispatch(ctx)
    return invokeCallback(dispatched, callback, this.settings.timeout)
  }
}
