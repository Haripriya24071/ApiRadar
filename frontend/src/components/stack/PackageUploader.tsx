import React, { useState, useRef } from 'react'
import { Upload, FileCode, Check, AlertCircle, Loader2, Plus, Sparkles, XCircle } from 'lucide-react'
import { useStack, ParsedAPIMatch } from '../../hooks/useStack'
import { readFileAsText, parsePackageJSON } from '../../lib/packageParser'
import { useToast } from '../../store/toastStore'
import { getErrorMessage } from '../../lib/api'

interface PackageUploaderProps {
  stackId: string
  onAPIsAdded?: () => void
}

export default function PackageUploader({ stackId, onAPIsAdded }: PackageUploaderProps) {
  const { parsePackage, watchAPI } = useStack()
  const toast = useToast()

  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [matchedAPIs, setMatchedAPIs] = useState<ParsedAPIMatch[] | null>(null)
  const [selectedApiIds, setSelectedApiIds] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleProcessFile = async (file: File) => {
    setError(null)
    setSuccessMsg(null)
    setMatchedAPIs(null)

    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Invalid file type. Please upload a .json file (e.g., package.json).')
      return
    }

    try {
      const textContent = await readFileAsText(file)
      const parsedJSON = parsePackageJSON(textContent)

      const results = await parsePackage.mutateAsync({
        stackId,
        packageJson: parsedJSON,
      })

      setMatchedAPIs(results)
      toast.success(`Found ${results.length} matching APIs in your stack`)

      // Pre-select all matched APIs that are not already being watched
      const initialSelected = new Set<string>()
      results.forEach((item: ParsedAPIMatch) => {
        if (!item.already_watching) {
          initialSelected.add(item.api.id)
        }
      })
      setSelectedApiIds(initialSelected)
    } catch (err: any) {
      console.error('Failed to parse package.json:', err)
      const msg = getErrorMessage(err)
      setError(msg)
      toast.error(msg)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      handleProcessFile(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      handleProcessFile(file)
    }
  }

  const toggleSelect = (apiId: string) => {
    setSelectedApiIds((prev) => {
      const next = new Set(prev)
      if (next.has(apiId)) {
        next.delete(apiId)
      } else {
        next.add(apiId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!matchedAPIs) return
    const unwatchableList = matchedAPIs.filter((m) => !m.already_watching)
    if (selectedApiIds.size === unwatchableList.length) {
      setSelectedApiIds(new Set())
    } else {
      setSelectedApiIds(new Set(unwatchableList.map((m) => m.api.id)))
    }
  }

  const handleAddSelected = async () => {
    if (!matchedAPIs || selectedApiIds.size === 0) return

    setIsAdding(true)
    setError(null)

    try {
      const apisToAdd = matchedAPIs.filter(
        (item) => selectedApiIds.has(item.api.id) && !item.already_watching
      )

      await Promise.all(
        apisToAdd.map((item) =>
          watchAPI.mutateAsync({
            stackId,
            apiId: item.api.id,
            sdkVersion: item.sdk_version,
          })
        )
      )

      setSuccessMsg(`Successfully added ${apisToAdd.length} API(s) to your watchlist!`)
      setMatchedAPIs(null)
      setSelectedApiIds(new Set())
      if (onAPIsAdded) onAPIsAdded()
    } catch (err: any) {
      console.error('Error adding APIs to watchlist:', err)
      setError(err?.response?.data?.detail || err?.message || 'Failed to add selected APIs to watchlist.')
    } finally {
      setIsAdding(false)
    }
  }

  const resetUpload = () => {
    setMatchedAPIs(null)
    setSelectedApiIds(new Set())
    setError(null)
    setSuccessMsg(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-md space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-primary" />
            Upload package.json
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Automatically detect and track API dependencies in your project
          </p>
        </div>
        {matchedAPIs && (
          <button
            onClick={resetUpload}
            className="text-xs text-muted hover:text-white transition flex items-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            Clear / Upload another
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-critical/10 border border-critical/30 rounded-lg text-critical text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-info/10 border border-info/30 rounded-lg text-info text-sm flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Upload Zone when no matches are displayed */}
      {!matchedAPIs && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-background/50 bg-background/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {parsePackage.isPending ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-medium text-slate-200">
                Parsing package.json & matching against API catalog...
              </p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Drag & drop your <code className="text-primary font-mono">package.json</code> file here
                </p>
                <p className="text-xs text-muted mt-1">
                  or <span className="text-primary underline">click to browse</span> from your computer (.json files only)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Matched APIs Results */}
      {matchedAPIs && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-warning" />
              <h3 className="text-sm font-medium text-slate-200">
                Matched APIs ({matchedAPIs.length})
              </h3>
            </div>
            {matchedAPIs.some((m) => !m.already_watching) && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-primary hover:underline font-medium"
              >
                {selectedApiIds.size === matchedAPIs.filter((m) => !m.already_watching).length
                  ? 'Deselect all'
                  : 'Select all un-watched'}
              </button>
            )}
          </div>

          {matchedAPIs.length === 0 ? (
            <div className="text-center py-6 text-muted text-sm border border-border rounded-lg bg-background/50">
              No known APIs matched from your package.json dependencies.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {matchedAPIs.map((item) => {
                const isSelected = selectedApiIds.has(item.api.id)
                const isWatching = item.already_watching

                return (
                  <div
                    key={item.api.id}
                    onClick={() => {
                      if (!isWatching) toggleSelect(item.api.id)
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border transition ${
                      isWatching
                        ? 'bg-background/30 border-border opacity-75 cursor-default'
                        : isSelected
                        ? 'bg-primary/10 border-primary/40 cursor-pointer'
                        : 'bg-background border-border hover:border-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected || isWatching}
                        disabled={isWatching}
                        onChange={() => {
                          if (!isWatching) toggleSelect(item.api.id)
                        }}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background cursor-pointer disabled:cursor-not-allowed"
                      />
                      {item.api.logo_url ? (
                        <img
                          src={item.api.logo_url}
                          alt={item.api.name}
                          className="w-7 h-7 rounded object-contain bg-white/5 p-1 border border-border"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      ) : null}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {item.api.name}
                          </span>
                          {item.api.category && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-border text-slate-300">
                              {item.api.category}
                            </span>
                          )}
                        </div>
                        {item.sdk_version && (
                          <span className="text-xs font-mono text-muted">
                            {item.sdk_version}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isWatching ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-info/10 text-info border border-info/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Already watching
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            isSelected
                              ? 'bg-primary text-white'
                              : 'bg-border text-slate-400'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Click to select'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {matchedAPIs.some((m) => !m.already_watching) && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleAddSelected}
                disabled={isAdding || selectedApiIds.size === 0}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-md transition flex items-center gap-2"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding selected APIs...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add selected ({selectedApiIds.size}) to watchlist
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
