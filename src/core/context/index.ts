import uuid from '@lukeed/uuid'
import dset from 'dset'
import { SegmentEvent } from '../events'
import Logger, { LogLevel, LogMessage } from '../logger'
import Stats, { Metric } from '../stats'

export interface AbstractContext {
  cancel: () => never
  seal: () => void
  log: (level: LogLevel, message: string, extras?: object) => void
  stats: Stats
}

export interface SerializedContext {
  id: string
  event: SegmentEvent
  logs: LogMessage[]
  metrics: Metric[]
}

export class Context implements AbstractContext {
  private _event: SegmentEvent
  private sealed = false
  public logger = new Logger()
  public stats = new Stats()
  private _id: string

  constructor(event: SegmentEvent) {
    this._event = event
    this._id = uuid()
  }

  static system(): Context {
    return new Context({ type: 'track', event: 'system' })
  }

  isSame(other: Context): boolean {
    return other._id === this._id
  }

  cancel = (error?: Error): never => {
    if (error) {
      throw error
    }

    throw new Error('Stap!')
  }

  seal = (): void => {
    this.sealed = true
  }

  log(level: LogLevel, message: string, extras?: object): void {
    this.logger.log(level, message, extras)
  }

  public get id(): string {
    return this._id
  }

  public get event(): SegmentEvent {
    return this._event
  }

  public set event(evt: SegmentEvent) {
    if (this.sealed) {
      this.log('warn', 'Context is sealed')
      return
    }

    this._event = evt
  }

  public updateEvent(path: string, val: unknown): SegmentEvent {
    if (this.sealed) {
      this.log('warn', 'Context is sealed')
      return this._event
    }

    dset(this._event, path, val)
    return this._event
  }

  public logs(): LogMessage[] {
    return this.logger.logs
  }

  public flush(): void {
    this.logger.flush()
    this.stats.flush()
  }

  toJSON(): SerializedContext {
    return {
      id: this._id,
      event: this._event,
      logs: this.logger.logs,
      metrics: this.stats.metrics,
    }
  }
}
