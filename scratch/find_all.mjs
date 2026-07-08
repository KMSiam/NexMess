import { readdirSync, statSync, readFileSync } from 'fs'
import { join } from 'path'

function search(dir) {
  try {
    const files = readdirSync(dir)
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === '.next') continue
      const fullPath = join(dir, file)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        search(fullPath)
      } else if (stat.isFile()) {
        const content = readFileSync(fullPath, 'utf8')
        if (content.includes('generate_monthly_report')) {
          console.log(`Found in: ${fullPath}`)
        }
      }
    }
  } catch (e) {
    // Ignore error
  }
}

search('f:\\VS Code\\Web')
