import { tester } from '../../../tester/ajs-tester'

describe('ajsDestination', () => {
  it('loads integrations from the Segment CDN', async () => {
    const ajs = await tester('test')
    const page = ajs.browserPage

    const allReqs: string[] = []

    page.on('request', (request) => {
      allReqs.push(request.url())
    })

    await page.evaluate(`
      const amplitude = window.AnalyticsNext.ajsDestination("amplitude", "latest", {})
      window.analytics.register(amplitude)
    `)

    // loads remote integration as an umd function
    await page.waitForFunction('window.amplitudeIntegration !== undefined')

    expect(allReqs).toMatchObject(
      expect.arrayContaining([
        'https://cdn.segment.build/next-integrations/amplitude/latest/amplitude.dynamic.js.gz',
        expect.stringContaining('https://cdn.segment.build/next-integrations/vendor/commons'),
        'https://cdn.amplitude.com/libs/amplitude-5.2.2-min.gz.js',
      ])
    )
  })

  it('executes and loads the third party integration', async () => {
    const ajs = await tester('test')
    const page = ajs.browserPage

    const allReqs: string[] = []
    page.on('request', (request) => {
      allReqs.push(request.url())
    })

    await page.evaluate(`
      const amplitude = window.AnalyticsNext.ajsDestination("amplitude", "latest", {
        apiKey: "***REMOVED***"
      })
      window.analytics.register(amplitude)
      window.amplitudeInstance = amplitude
    `)

    await page.waitForFunction('window.amplitudeInstance.isLoaded() === true')

    // loads remote amplitude
    expect(allReqs).toMatchObject(
      expect.arrayContaining([
        'https://cdn.segment.build/next-integrations/amplitude/latest/amplitude.dynamic.js.gz',
        expect.stringContaining('https://cdn.segment.build/next-integrations/vendor/commons'),
        'https://cdn.amplitude.com/libs/amplitude-5.2.2-min.gz.js',
      ])
    )
  })

  it('forwards identify calls to integration', async () => {
    const ajs = await tester('test')
    const page = ajs.browserPage

    const allReqs: string[] = []
    page.on('request', (request) => {
      allReqs.push(request.url())
    })

    await page.evaluate(`
      const amplitude = window.AnalyticsNext.ajsDestination("amplitude", "latest", {
        apiKey: "***REMOVED***"
      })
      window.analytics.register(amplitude)
      window.amplitudeInstance = amplitude
    `)
    await page.waitForFunction('window.amplitudeInstance.isLoaded() === true')
    await ajs.identify('Test User', { banana: 'phone' })

    // loads remote amplitude
    expect(allReqs).toMatchObject(expect.arrayContaining(['http://api.amplitude.com/']))
  })

  it('forwards track calls to integration', async () => {
    const ajs = await tester('test')
    const page = ajs.browserPage

    const allReqs: string[] = []
    page.on('request', (request) => {
      allReqs.push(request.url())
    })

    await page.evaluate(`
      const amplitude = window.AnalyticsNext.ajsDestination("amplitude", "latest", {
        apiKey: "***REMOVED***"
      })
      window.analytics.register(amplitude)
      window.amplitudeInstance = amplitude
    `)
    await page.waitForFunction('window.amplitudeInstance.isLoaded() === true')
    await ajs.track('Test Event', { banana: 'phone' })

    expect(allReqs).toMatchObject(expect.arrayContaining(['http://api.amplitude.com/']))
  })

  it('forwards page calls to integration', async () => {
    const ajs = await tester('test')
    const page = ajs.browserPage

    const allReqs: string[] = []

    page.on('request', (request) => {
      allReqs.push(request.url())
    })

    await page.evaluate(`
      const amplitude = window.AnalyticsNext.ajsDestination("amplitude", "latest", {
        apiKey: "***REMOVED***"
      })
      window.analytics.register(amplitude)
      window.amplitudeInstance = amplitude
    `)

    await page.waitForFunction('window.amplitudeInstance.isLoaded() === true')
    await ajs.page('Test Page', { banana: 'phone' })

    expect(allReqs).toMatchObject(expect.arrayContaining(['http://api.amplitude.com/']))
  })
})
