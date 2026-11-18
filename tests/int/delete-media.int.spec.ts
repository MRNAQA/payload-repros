import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { beforeAll, describe, expect, it } from 'vitest'

// A 1x1 PNG.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j14sAAAAASUVORK5CYII=',
  'base64',
)

let payload: Payload

describe('delete media used by a required upload inside an array', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('does not fail with a database error', async () => {
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Banner' },
      file: { data: png, mimetype: 'image/png', name: 'banner.png', size: png.length },
    })
    await payload.create({ collection: 'stores', data: { banners: [{ image: media.id }] } })

    const error = await payload.delete({ collection: 'media', id: media.id }).then(
      () => undefined,
      (error: Error) => error,
    )
    expect(String(error?.cause ?? error)).not.toContain('violates not-null constraint')
  })
})
