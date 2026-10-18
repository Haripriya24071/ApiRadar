/** Parses package.json content into a consistent dependency object. */
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
 * Parse the direct requirements in a Python requirements.txt file.
 * Include pins/specifiers as dependency versions; skip pip directives and comments.
 */
export function parseRequirementsTXT(fileContent: string): Record<string, any> {
  const dependencies: Record<string, string> = {}

  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '').trim()
    if (!line || line.startsWith('#') || line.startsWith('-')) continue

    // requirements.txt supports environment markers after a semicolon.
    const requirement = line.split(';', 1)[0].trim()
    const match = requirement.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]+\])?\s*(.*)$/)
    if (!match) continue

    const packageName = match[1]
    const specifier = match[2].trim()
    dependencies[packageName] = specifier
  }

  if (Object.keys(dependencies).length === 0) {
    throw new Error('No direct Python dependencies found in requirements.txt.')
  }

  return { dependencies, devDependencies: {} }
}

/** Parse either supported project dependency file based on its filename. */
export function parseDependencyFile(fileName: string, fileContent: string): Record<string, any> {
  if (fileName.toLowerCase().endsWith('.txt')) return parseRequirementsTXT(fileContent)
  if (fileName.toLowerCase().endsWith('.json')) return parsePackageJSON(fileContent)
  throw new Error('Choose a package.json or requirements.txt file.')
}

const PACKAGE_API_MAPPINGS: Record<string, string> = {
  stripe: 'stripe',
  '@stripe/stripe-js': 'stripe',
  openai: 'openai',
  groq: 'groq',
  'langchain-groq': 'groq',
  '@supabase/supabase-js': 'supabase',
  supabase: 'supabase',
  'supabase-py': 'supabase',
  twilio: 'twilio',
  '@sendgrid/mail': 'sendgrid',
  sendgrid: 'sendgrid',
  '@octokit/rest': 'github',
  octokit: 'github',
  pygithub: 'github',
}

export function mapPackageToApiSlug(packageName: string): string | undefined {
  return PACKAGE_API_MAPPINGS[packageName.trim().toLowerCase()]
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
