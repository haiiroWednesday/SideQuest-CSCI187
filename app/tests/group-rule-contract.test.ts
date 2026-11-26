import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GROUP_SIZE_LIMIT, MAX_GROUP_INVITEES, MAX_IF_CONDITION } from '../src/model/groupPlans'

// The SQL proposal runs independently of TypeScript. These narrow contract
// assertions stop a release from silently changing just one implementation.
const storage = readFileSync(
  new URL('../../supabase/proposals/20261120000000_group_plan_storage_REVIEW_ONLY.sql', import.meta.url),
  'utf8',
)
const rpc = readFileSync(
  new URL('../../supabase/proposals/20261120010000_group_plan_rpcs_REVIEW_ONLY.sql', import.meta.url),
  'utf8',
)

describe('group domain / SQL proposal parity', () => {
  it('counts the organizer in the twelve-person limit', () => {
    expect(GROUP_SIZE_LIMIT).toBe(12)
    expect(MAX_GROUP_INVITEES + 1).toBe(GROUP_SIZE_LIMIT)
  })
  it('uses the same participant capacity in the domain and SQL authorization function', () => {
    expect(rpc).toContain(`>= ${MAX_GROUP_INVITEES}`)
  })

  it('enforces the domain If-note size in both storage and RPC boundaries', () => {
    expect(storage).toContain(`between 1 and ${MAX_IF_CONDITION}`)
    expect(rpc).toContain(`char_length(v_condition) > ${MAX_IF_CONDITION}`)
  })

  it('uses the same explicit response states and does not treat no response as Works', () => {
    expect(storage).toContain("response in ('works', 'if', 'cant')")
    expect(rpc).toContain("p_response not in ('works','if','cant')")
    expect(rpc).toContain("response is distinct from 'works'")
  })
})
