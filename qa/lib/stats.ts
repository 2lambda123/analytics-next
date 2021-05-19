import { Analytics } from '../../src/analytics'
import { Context } from '../../src/core/context'
import { AnalyticsNode } from '../../src/node'

// https://app.segment.com/mme-e2e/sources/ajs_2_0_qa/overview
const writeKey = '***REMOVED***'

let analytics: Analytics = undefined

async function client(): Promise<Analytics> {
  if (analytics) {
    return analytics
  }

  const [nodeAnalytics] = await AnalyticsNode.load({
    writeKey,
  })

  analytics = nodeAnalytics
  return analytics
}

export async function gauge(
  metric: string,
  value: number = 0,
  tags: string[] = []
): Promise<Context> {
  const ajs = await client()

  const ctx = await ajs.track(
    metric,
    {
      value,
      tags,
    },
    {
      userId: 'system',
    }
  )

  return ctx
}
