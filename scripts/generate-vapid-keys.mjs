// Run once: node scripts/generate-vapid-keys.mjs
// Then add the output to your .env.local and Supabase secrets.

const keyPair = await crypto.subtle.generateKey(
  { name: 'ECDH', namedCurve: 'P-256' },
  true,
  ['deriveKey']
)

const [pubRaw, privPkcs8] = await Promise.all([
  crypto.subtle.exportKey('raw', keyPair.publicKey),
  crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
])

const b64url = (buf) =>
  Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

console.log('\n=== VAPID Keys (copy to .env.local and Supabase secrets) ===\n')
console.log('VITE_VAPID_PUBLIC_KEY=' + b64url(pubRaw))
console.log('VAPID_PUBLIC_KEY=' + b64url(pubRaw))
console.log('VAPID_PRIVATE_KEY=' + b64url(privPkcs8))
console.log('VAPID_SUBJECT=mailto:your@email.com')
console.log('\nThen run:')
console.log('  supabase secrets set VAPID_PUBLIC_KEY=<above> VAPID_PRIVATE_KEY=<above> VAPID_SUBJECT=mailto:your@email.com')
console.log('  supabase functions deploy send-push\n')
