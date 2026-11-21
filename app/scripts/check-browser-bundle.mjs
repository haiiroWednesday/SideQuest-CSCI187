import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
const forbidden = ['sb_publishable_', 'sb_secret_', 'VITE_SUPABASE_', 'SUPABASE_PUBLISHABLE_KEY', 'OPENAI_API_KEY', ...['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'OPENAI_API_KEY'].map(name => process.env[name]).filter(Boolean)]
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await check(path)
    else if (/\.(js|html|map)$/.test(path)) {
      const text = await readFile(path, 'utf8')
      if (forbidden.some(value => text.includes(value))) throw Error(`Server-only credential configuration found in browser output: ${path}`)
    }
  }
}
await check('dist')
console.log('Browser bundle contains no database or AI credential configuration.')
