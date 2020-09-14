import { SegmentEvent } from '../events'
import Logger, { LogLevel } from '../logger'
import Stats from '../stats'

export interface AbstractContext {
  cancel: () => never
  seal: () => void
  log: (level: LogLevel, message: string, extras?: object) => void
  stats: Stats
}

export class Context implements AbstractContext {
  private _event: SegmentEvent
  private sealed = false
  private logger = new Logger()

  constructor(event: SegmentEvent) {
    this._event = event
  }

  cancel = (): never => {
    throw new Error('Stap!')
  }

  seal = (): void => {
    this.sealed = true
  }

  log = (level: LogLevel, message: string, extras?: object): void => {
    this.logger.log(level, message, extras)
  }

  public get event(): SegmentEvent {
    return this._event
  }

  public set event(evt: SegmentEvent) {
    if (this.sealed) {
      this.log('warn', 'Context is sealed')
      return
    }

    this._event = Object.assign({}, this._event, evt)
  }

  public flush(): void {
    this.logger.flush()
    this.stats.flush()
  }

  stats = new Stats()
}
