/* eslint-disable @typescript-eslint/no-floating-promises */
import { getCDN } from './lib/parse-cdn'

if (process.env.ASSET_PATH) {
  if (process.env.ASSET_PATH === '/dist/umd/') {
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/camelcase
    __webpack_public_path__ = '/dist/umd/'
  } else {
    const cdn = window.analytics?._cdn ?? getCDN()
    if (window.analytics) window.analytics._cdn = cdn

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/camelcase
    __webpack_public_path__ = cdn
      ? cdn + '/analytics-next/bundles/'
      : 'https://cdn.segment.com/analytics-next/bundles/'
  }
}

import { install } from './standalone-analytics'
import './lib/csp-detection'
import { shouldPolyfill } from './lib/browser-polyfill'
import { loadScript } from './lib/load-script'
import { RemoteMetrics } from './core/stats/remote-metrics'
import { embeddedWriteKey } from './lib/embedded-write-key'

function onError(err?: Error) {
  console.error('[analytics.js]', 'Failed to load Analytics.js', err)

  new RemoteMetrics().increment('analytics_js.invoke.error', [
    'type:initialization',
    `message:${err?.message}`,
    `name:${err?.name}`,
    `host:${window.location.hostname}`,
    `wk:${embeddedWriteKey()}`,
  ])
}

/**
 * Attempts to run a promise and catch both sync and async errors.
 **/
async function attempt<T>(promise: () => Promise<T>) {
  try {
    const result = await promise()
    return result
  } catch (err) {
    onError(err)
  }
}

if (shouldPolyfill()) {
  // load polyfills in order to get AJS to work with old browsers
  loadScript(
    'https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.7.0/polyfill.min.js'
  ).then(() => attempt(install))
} else {
  attempt(install)
}
