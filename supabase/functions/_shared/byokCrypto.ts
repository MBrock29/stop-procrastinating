const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function getEncryptionKey(secret: string) {
  const secretHash = await crypto.subtle.digest('SHA-256', encoder.encode(secret))

  return crypto.subtle.importKey('raw', secretHash, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptApiKey(secret: string, apiKey: string) {
  const key = await getEncryptionKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoder.encode(apiKey),
  )

  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`
}

export async function decryptApiKey(secret: string, encryptedValue: string) {
  const [ivPart, payloadPart] = encryptedValue.split('.')

  if (!ivPart || !payloadPart) {
    throw new Error('Stored BYOK credential is invalid.')
  }

  const key = await getEncryptionKey(secret)
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(ivPart),
    },
    key,
    base64ToBytes(payloadPart),
  )

  return decoder.decode(decrypted)
}
