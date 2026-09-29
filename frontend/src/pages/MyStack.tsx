import React, { useState, useRef } from 'react'
import { useStack } from '../hooks/useStack'
import { apisAPI } from '../lib/api'
import { useToast } from '../store/toastStore'

interface DetectedApiItem {
  id: string
  name: string
  slug: string
  category: string
  version: string
  selected: boolean
}

export default function MyStack() {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { stacks, createStack, watchAPI, unwatchAPI } = useStack()

  const [isDragOver, setIsDragOver] = useState(false)
  const [detectedApis, setDetectedApis] = useState<DetectedApiItem[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const stackList = stacks.data || []
  const currentStack = stackList.length > 0 ? stackList[0] : null
  const watchedApis = currentStack?.watched_apis || []
  const count = watchedApis.length

  // Ensure user has a stack profile
  const handleEnsureStack = async () => {
    if (!currentStack) {
      const created = await createStack.mutateAsync('My Stack')
      return created.id
    }
    return currentStack.id
  }

  // Parse package.json content to detect known APIs
  const parsePackageJson = async (text: string) => {
    try {
      const json = JSON.parse(text)
      const deps = { ...json.dependencies, ...json.devDependencies }

      const allApis = await apisAPI.list()
      const detected: DetectedApiItem[] = []

      // Mapping package names to API slugs
      const pkgMapping: Record<string, string> = {
        stripe: 'stripe',
        openai: 'openai',
        '@supabase/supabase-js': 'supabase',
        twilio: 'twilio',
        '@octokit/rest': 'github',
        octokit: 'github',
        '@sendgrid/mail': 'sendgrid',
      }

      Object.entries(deps).forEach(([pkgName, versionStr]) => {
        const targetSlug = pkgMapping[pkgName.toLowerCase()]
        if (targetSlug) {
          const matchingApi = allApis.find((a: any) => a.slug === targetSlug)
          if (matchingApi) {
            detected.push({
              id: matchingApi.id,
              name: matchingApi.name,
              slug: matchingApi.slug,
              category: matchingApi.category || 'Third-Party Service',
              version: String(versionStr),
              selected: true,
            })
          }
        }
      })

      if (detected.length === 0) {
        toast.info('No matching ApiRadar APIs found in package.json dependencies.')
      } else {
        setDetectedApis(detected)
        toast.success(`Detected ${detected.length} APIs in package.json!`)
      }
    } catch (err) {
      toast.error('Invalid package.json format.')
    }
  }

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      const text = await file.text()
      await parsePackageJson(text)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const text = await file.text()
      await parsePackageJson(text)
    }
  }

  const handleToggleDetected = (slug: string) => {
    setDetectedApis((prev) =>
      prev.map((item) =>
        item.slug === slug ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const handleAddSelected = async () => {
    const selected = detectedApis.filter((a) => a.selected)
    if (selected.length === 0) return

    setIsUploading(true)
    try {
      const stackId = await handleEnsureStack()
      for (const item of selected) {
        await watchAPI.mutateAsync({ stackId, apiId: item.id, sdkVersion: item.version })
      }
      toast.success(`Added ${selected.length} APIs to your stack!`)
      setDetectedApis([])
    } catch (err: any) {
      toast.error(err.message || 'Failed to add APIs to stack.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveWatched = async (apiId: string) => {
    if (!currentStack) return
    try {
      await unwatchAPI.mutateAsync({ stackId: currentStack.id, apiId })
      toast.success('API removed from stack')
    } catch (err: any) {
      toast.error('Failed to remove API')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--cream)] pb-16">
      {/* HEADER */}
      <div className="pt-8 md:pt-12 px-6 md:px-10 pb-8">
        <div className="editorial-label mb-3">00_2 // MY STACK</div>
        <h1 className="font-['Space_Grotesk'] text-[clamp(40px,5vw,80px)] font-bold leading-[0.9] tracking-tight text-[var(--cream)] whitespace-pre-line">
          Your{'\n'}Monitored{'\n'}APIs
        </h1>
      </div>

      {/* PACKAGE UPLOAD ZONE */}
      <div className="mx-6 md:mx-10 my-8">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-12 text-center cursor-pointer transition-colors duration-200 select-none ${
            isDragOver
              ? 'bg-[var(--black)] border-2 border-solid border-[var(--cream)]'
              : 'bg-[var(--dim)] border border-dashed border-[var(--border-dark)] hover:border-[var(--muted-dark)]'
          }`}
          data-cursor="hover"
        >
          <div className="font-['Space_Grotesk'] text-[64px] font-bold text-[var(--border-dark)] leading-none mb-4">
            +
          </div>
          <div className="font-['Space_Mono'] text-[11px] text-[var(--muted-dark)] tracking-[0.2em] uppercase">
            DROP PACKAGE.JSON HERE
          </div>
          <div className="font-['Space_Mono'] text-[10px] text-[var(--muted-dark)] opacity-60 tracking-[0.1em] uppercase mt-2">
            OR CLICK TO BROWSE
          </div>
        </div>
      </div>

      {/* DETECTED APIS SECTION */}
      {detectedApis.length > 0 && (
        <div className="mx-6 md:mx-10 my-8 bg-[var(--dim)] border border-[var(--border-dark)] p-6">
          <div className="editorial-label mb-6">DETECTED IN YOUR STACK</div>

          <div className="divide-y divide-[var(--border-dark)] border-t border-b border-[var(--border-dark)]">
            {detectedApis.map((item) => (
              <div
                key={item.slug}
                onClick={() => handleToggleDetected(item.slug)}
                className="py-4 px-4 flex items-center justify-between transition-colors duration-200 hover:bg-[var(--cream)] hover:text-[var(--black)] cursor-pointer group"
                data-cursor="hover"
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => handleToggleDetected(item.slug)}
                    className="accent-[var(--red)] w-4 h-4"
                  />
                  <span className="font-['Space_Grotesk'] text-[24px] font-medium tracking-tight">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-6 font-['Space_Mono'] text-[10px] uppercase">
                  <span className="border border-current px-2 py-0.5 opacity-80">
                    {item.category}
                  </span>
                  <span className="text-[var(--gold)] group-hover:text-[var(--black)] font-bold">
                    {item.version}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddSelected}
            disabled={isUploading}
            className="w-full mt-6 bg-[var(--cream)] text-[var(--black)] font-['Space_Mono'] text-[13px] font-bold py-3.5 hover:bg-[var(--red)] hover:text-[var(--white)] transition-colors uppercase"
            data-cursor="hover"
          >
            {isUploading ? 'ADDING APIS...' : 'ADD SELECTED TO WATCHLIST'}
          </button>
        </div>
      )}

      {/* WATCHED API LIST */}
      <div className="mx-6 md:mx-10 mt-12">
        <div className="flex items-end justify-between border-b border-[var(--border-dark)] pb-4 mb-6">
          <div className="editorial-label">CURRENTLY MONITORING</div>
          <div className="font-['Space_Mono'] text-[56px] md:text-[64px] font-bold text-[var(--border-dark)] leading-none">
            {String(count).padStart(2, '0')}
          </div>
        </div>

        {watchedApis.length === 0 ? (
          <div className="py-16 text-center border border-[var(--border-dark)] bg-[var(--dim)]">
            <p className="font-['Space_Grotesk'] text-[16px] text-[var(--muted-light)]">
              No APIs added to stack yet. Drop a package.json above or browse the API directory.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-dark)] border-t border-b border-[var(--border-dark)]">
            {watchedApis.map((item: any) => {
              const apiObj = item.api || item
              const targetId = item.api_id || item.id
              return (
                <div
                  key={item.id || item.slug}
                  className="py-5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--dim)] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-['Space_Grotesk'] text-[24px] font-semibold text-[var(--cream)]">
                      {apiObj.name}
                    </span>
                    <span className="font-['Space_Mono'] text-[10px] text-[var(--muted-dark)] border border-[var(--border-dark)] px-2 py-0.5 uppercase">
                      {apiObj.category || 'API'}
                    </span>
                  </div>

                  <div className="flex items-center gap-8 font-['Space_Mono'] text-[11px] text-[var(--muted-dark)] uppercase">
                    <span>
                      SCRAPED:{' '}
                      <span className="text-[var(--muted-light)]">
                        {apiObj.last_scraped_at
                          ? new Date(apiObj.last_scraped_at).toLocaleDateString()
                          : 'RECENT'}
                      </span>
                    </span>

                    <button
                      onClick={() => handleRemoveWatched(targetId)}
                      className="text-[var(--muted-dark)] hover:text-[var(--red)] text-[18px] font-bold px-2 transition-colors"
                      title="Remove from stack"
                      data-cursor="hover"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
