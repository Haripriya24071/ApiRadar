import { useEffect, useState } from 'react'
import { Github } from 'lucide-react'
import { authAPI } from '../../lib/api'
import { API_BASE_URL } from '../../lib/api'

type Providers = { google: boolean; github: boolean }

export default function OAuthButtons() {
  const [providers, setProviders] = useState<Providers>({ google: false, github: false })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    authAPI.providers()
      .then((available) => { if (active) setProviders(available) })
      .catch(() => undefined)
      .finally(() => { if (active) setLoaded(true) })
    return () => { active = false }
  }, [])

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-[9px] font-['Space_Mono'] tracking-widest text-[var(--muted-dark)]">
        <span className="h-px flex-1 bg-[var(--border-dark)]" />
        OR CONTINUE WITH
        <span className="h-px flex-1 bg-[var(--border-dark)]" />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <a
          href={providers.google ? `${API_BASE_URL}/api/auth/google` : undefined}
          aria-disabled={!providers.google}
          title={!providers.google ? 'Add Google OAuth credentials to backend/.env to enable' : 'Continue with Google'}
          className={`oauth-provider-button ${providers.google ? '' : 'oauth-provider-disabled'}`}
        >
          <span className="oauth-google-mark">G</span><span>GOOGLE</span>
        </a>
        <a
          href={providers.github ? `${API_BASE_URL}/api/auth/github` : undefined}
          aria-disabled={!providers.github}
          title={!providers.github ? 'Add GitHub OAuth credentials to backend/.env to enable' : 'Continue with GitHub'}
          className={`oauth-provider-button ${providers.github ? '' : 'oauth-provider-disabled'}`}
        >
          <Github size={17} /><span>GITHUB</span>
        </a>
      </div>
      {loaded && !providers.google && !providers.github && (
        <p className="mt-3 text-center text-[9px] font-['Space_Mono'] leading-relaxed text-[var(--muted-dark)]">
          GOOGLE AND GITHUB SIGN-IN WILL ACTIVATE AFTER OAUTH CREDENTIALS ARE CONFIGURED.
        </p>
      )}
    </div>
  )
}
