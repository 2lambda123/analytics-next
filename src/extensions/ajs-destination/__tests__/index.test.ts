/* eslint-disable @typescript-eslint/no-floating-promises */
import { ajsDestinations, LegacyDestination } from '..'
import { mocked } from 'ts-jest/utils'
import unfetch from 'unfetch'
import jsdom from 'jsdom'
import { Context } from '../../../core/context'
import { Analytics } from '../../../analytics'
import { SegmentEvent } from '../../../core/events'

const cdnResponse = {
  integrations: {
    Zapier: {
      type: 'server',
    },
    WithNoVersion: {
      type: 'browser',
    },
    WithLegacyVersion: {
      version: '3.0.7',
      type: 'browser',
    },
    WithVersionSettings: {
      versionSettings: {
        version: '1.2.3',
      },
      type: 'browser',
    },
    WithVersionOverrides: {
      versionSettings: {
        version: '1.2.3',
        override: '9.9.9',
      },
      type: 'browser',
    },
    'Amazon S3': {},
    Amplitude: {
      type: 'browser',
    },
    Segmentio: {
      type: 'browser',
    },
  },
  edgeFunction: {},
}

const fetchSettings = Promise.resolve({
  json: () => Promise.resolve(cdnResponse),
})

jest.mock('unfetch', () => {
  return jest.fn()
})

describe('ajsDestinations', () => {
  beforeEach(async () => {
    jest.resetAllMocks()

    // @ts-ignore: ignore Response required fields
    mocked(unfetch).mockImplementation((): Promise<Response> => fetchSettings)
  })

  // This test should temporary. Once we deprecate `version`, we can change it
  // to `it('loads version overrides')`
  it('considers both legacy and new version formats', async () => {
    const destinations = await ajsDestinations(cdnResponse, {}, {})
    const withLegacyVersion = destinations.find((d) => d.name === 'WithLegacyVersion')
    const withVersionSettings = destinations.find((d) => d.name === 'WithVersionSettings')
    const withVersionOverrides = destinations.find((d) => d.name === 'WithVersionOverrides')
    const withNoVersion = destinations.find((d) => d.name === 'WithNoVersion')

    expect(withLegacyVersion?.version).toBe('3.0.7')
    expect(withVersionSettings?.version).toBe('1.2.3')
    expect(withVersionOverrides?.version).toBe('9.9.9')
    expect(withNoVersion?.version).toBe('latest')
  })

  it('loads type:browser legacy ajs destinations from cdn', async () => {
    const destinations = await ajsDestinations(cdnResponse, {}, {})
    expect(destinations.length).toBe(6)
  })

  it('ignores destinations of type:server', async () => {
    const destinations = await ajsDestinations(cdnResponse, {}, {})
    expect(destinations.find((d) => d.name === 'Zapier')).toBe(undefined)
  })

  it('does not load integrations when All:false', async () => {
    const destinations = await ajsDestinations(
      cdnResponse,
      {
        All: false,
      },
      {}
    )
    expect(destinations.length).toBe(0)
  })

  it('loads integrations when All:false, <integration>: true', async () => {
    const destinations = await ajsDestinations(
      cdnResponse,
      {
        All: false,
        Amplitude: true,
        Segmentio: false,
      },
      {}
    )
    expect(destinations.length).toBe(1)
    expect(destinations[0].name).toEqual('Amplitude')
  })
})

describe('remote loading', () => {
  const loadAmplitude = async (): Promise<LegacyDestination> => {
    const ajs = new Analytics({
      writeKey: 'abc',
    })

    const dest = new LegacyDestination('amplitude', 'latest', {
      apiKey: '***REMOVED***',
    })

    await dest.load(Context.system(), ajs)
    await dest.ready()
    return dest
  }

  beforeEach(async () => {
    jest.restoreAllMocks()
    jest.resetAllMocks()

    const html = `
    <!DOCTYPE html>
      <head>
        <script>'hi'</script>
      </head>
      <body>
      </body>
    </html>
    `.trim()

    const jsd = new jsdom.JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://localhost' })

    const windowSpy = jest.spyOn(global, 'window', 'get')
    windowSpy.mockImplementation(() => (jsd.window as unknown) as Window & typeof globalThis)
  })

  it('loads integrations from the Segment CDN', async () => {
    await loadAmplitude()

    const sources = Array.from(window.document.querySelectorAll('script')).map((s) => s.src)
    expect(sources).toMatchObject(
      expect.arrayContaining([
        'https://cdn.segment.build/next-integrations/amplitude/latest/amplitude.dynamic.js.gz',
        expect.stringContaining('https://cdn.segment.build/next-integrations/vendor/commons'),
        'https://cdn.amplitude.com/libs/amplitude-5.2.2-min.gz.js',
      ])
    )
  })

  it('forwards identify calls to integration', async () => {
    const dest = await loadAmplitude()
    jest.spyOn(dest.integration!, 'identify')

    const evt = new Context({ type: 'identify' })
    await dest.identify(evt)

    expect(dest.integration?.identify).toHaveBeenCalled()
  })

  it('forwards track calls to integration', async () => {
    const dest = await loadAmplitude()
    jest.spyOn(dest.integration!, 'track')

    await dest.track(new Context({ type: 'track' }))
    expect(dest.integration?.track).toHaveBeenCalled()
  })

  it('forwards page calls to integration', async () => {
    const dest = await loadAmplitude()
    jest.spyOn(dest.integration!, 'page')

    await dest.page(new Context({ type: 'page' }))
    expect(dest.integration?.page).toHaveBeenCalled()
  })

  it('applies destination edge function to integration payload', async () => {
    const changeProperties = (event: SegmentEvent): SegmentEvent => {
      event.properties = { foo: 'bar' }
      return event
    }
    const dest = await loadAmplitude()

    dest.addEdgeFunctions(changeProperties)
    jest.spyOn(dest.integration!, 'track')

    await dest.track(new Context({ type: 'track', event: 'Button Clicked', properties: { count: 1 } }))
    expect(dest.integration?.track).toHaveBeenCalledWith(
      expect.objectContaining({
        obj: expect.objectContaining({
          properties: expect.objectContaining({
            foo: 'bar',
          }),
        }),
      })
    )
  })
})
