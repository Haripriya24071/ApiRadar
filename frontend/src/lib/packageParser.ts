/**
 * Parses package.json string content, extracting dependencies and devDependencies,
 * and returning the full parsed object to send to backend.
 */
export function parsePackageJSON(fileContent: string): Record<string, any> {
  let parsed: any
  try {
    parsed = JSON.parse(fileContent)
  } catch (err) {
    throw new Error('Invalid JSON string format. Please provide a valid package.json file.')
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Invalid package.json structure: root must be a JSON object.')
  }

  const dependencies =
    parsed.dependencies && typeof parsed.dependencies === 'object' && !Array.isArray(parsed.dependencies)
      ? parsed.dependencies
      : {}

  const devDependencies =
    parsed.devDependencies && typeof parsed.devDependencies === 'object' && !Array.isArray(parsed.devDependencies)
      ? parsed.devDependencies
      : {}

  return {
    ...parsed,
    dependencies,
    devDependencies,
  }
}

/**
 * Reads a File object as a text string using FileReader.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        resolve(event.target.result)
      } else {
        reject(new Error('Failed to read file content as text.'))
      }
    }

    reader.onerror = (error) => {
      reject(error || new Error('FileReader encountered an error reading the file.'))
    }

    reader.readAsText(file)
  })
}
