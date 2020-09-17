import { Context } from '../context'
import { Extension } from '../extension'

export async function attempt(ctx: Context, extension: Extension): Promise<Context | Error> {
  ctx.log('debug', 'extension', { extension: extension.name })
  const start = new Date().getTime()

  const hook = extension[ctx.event.type]
  if (hook === undefined) {
    return ctx
  }

  const newCtx = await hook(ctx)
    .then((ctx) => {
      const done = new Date().getTime() - start
      ctx.stats.gauge('extension_time', done)
      return ctx
    })
    .catch((err) => {
      ctx.log('error', 'extension Error', { extension: extension.name, error: err })
      ctx.stats.increment('extension_error', 1, [`extension:${extension.name}`])
      return err
    })

  return newCtx
}

export async function ensure(ctx: Context, extension: Extension): Promise<Context | undefined> {
  const newContext = await attempt(ctx, extension)

  if (newContext === undefined || newContext instanceof Error) {
    ctx.log('debug', 'Context canceled')
    ctx.stats.increment('context_canceled')
    ctx.cancel(newContext)
    return undefined
  }

  return newContext
}
