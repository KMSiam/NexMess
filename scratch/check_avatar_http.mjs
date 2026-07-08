async function check() {
  const url = 'https://pub-71a45dcba807be46fd6a3f5a99579456.r2.dev/avatars/e198addb-443d-4250-8202-98b0282be1bd/1783528057347-Adobe%20Express%20-%20file.png'
  console.log('Fetching:', url)
  try {
    const res = await fetch(url, { method: 'GET' })
    console.log('Response Status:', res.status)
    console.log('Response Headers:', Object.fromEntries(res.headers.entries()))
    if (res.status !== 200) {
      const text = await res.text()
      console.log('Response Body:', text.slice(0, 500))
    }
  } catch (e) {
    console.error('Fetch error:', e)
  }
}

check()
