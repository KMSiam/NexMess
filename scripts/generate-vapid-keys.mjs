// Run once: node scripts/generate-vapid-keys.mjs
// Then add the output to your .env.local and Supabase secrets.

import crypto from 'crypto'

console.log('\n=== Generating VAPID Keys ===')

const ecdh = crypto.createECDH('prime256v1')
ecdh.generateKeys()

const publicKey = ecdh.getPublicKey().toString('base64url')
const privateKey = ecdh.getPrivateKey().toString('base64url')

console.log('\n=== VAPID Keys (copy to .env.local and Supabase secrets) ===\n')
console.log('VITE_VAPID_PUBLIC_KEY=' + publicKey)
console.log('VAPID_PUBLIC_KEY=' + publicKey)
console.log('VAPID_PRIVATE_KEY=' + privateKey)
console.log('VAPID_SUBJECT=mailto:your@email.com')
console.log('\nThen run:')
console.log('  supabase secrets set VAPID_PUBLIC_KEY=' + publicKey + ' VAPID_PRIVATE_KEY=' + privateKey + ' VAPID_SUBJECT=mailto:your@email.com')
console.log('  supabase functions deploy send-push\n')
