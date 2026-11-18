import { Forbidden, getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { beforeAll, describe, expect, it } from 'vitest'

import type { Page, PayloadLockedDocument, User } from '@/payload-types'

let payload: Payload
let userA: User
let userB: User
let pageB: Page
let lockB: PayloadLockedDocument

describe('payload-locked-documents with the multi-tenant plugin', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const run = Date.now()

    const tenantA = await payload.create({ collection: 'tenants', data: { name: 'Tenant A' } })
    const tenantB = await payload.create({ collection: 'tenants', data: { name: 'Tenant B' } })
    userA = await payload.create({
      collection: 'users',
      data: { email: `a-${run}@example.com`, password: 'test', tenants: [{ tenant: tenantA.id }] },
    })
    userB = await payload.create({
      collection: 'users',
      data: { email: `b-${run}@example.com`, password: 'test', tenants: [{ tenant: tenantB.id }] },
    })
    pageB = await payload.create({
      collection: 'pages',
      data: { title: 'Tenant B page', tenant: tenantB.id },
    })
    // The row the admin panel writes while user B edits pageB.
    lockB = await payload.create({
      collection: 'payload-locked-documents',
      data: {
        document: { relationTo: 'pages', value: pageB.id },
        user: { relationTo: 'users', value: userB.id },
      },
    })
  })

  it('user A cannot read the tenant B page (control)', async () => {
    await expect(
      payload.findByID({ collection: 'pages', id: pageB.id, user: userA, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('user A does not see the tenant B lock row', async () => {
    const locks = await payload.find({
      collection: 'payload-locked-documents',
      user: userA,
      overrideAccess: false,
    })
    expect(locks.docs).toEqual([])
  })

  it('user A cannot lock the tenant B page', async () => {
    await expect(
      payload.create({
        collection: 'payload-locked-documents',
        data: {
          document: { relationTo: 'pages', value: pageB.id },
          user: { relationTo: 'users', value: userA.id },
        },
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow(Forbidden)
  })

  it('user A cannot delete the tenant B lock row', async () => {
    await expect(
      payload.delete({
        collection: 'payload-locked-documents',
        id: lockB.id,
        user: userA,
        overrideAccess: false,
      }),
    ).rejects.toThrow(Forbidden)
  })
})
