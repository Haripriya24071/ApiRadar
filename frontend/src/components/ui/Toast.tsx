import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore, ToastItem } from '../../store/toastStore'

function ToastSingle({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore((state) => state.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  const config = {
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      bg: 'bg-[#064e3b]/95 border-emerald-500/30 text-emerald-100 shadow-emerald-950/40',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
      bg: 'bg-[#4c0519]/95 border-rose-500/30 text-rose-100 shadow-rose-950/40',
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      bg: 'bg-[#451a03]/95 border-amber-500/30 text-amber-100 shadow-amber-950/40',
    },
    info: {
      icon: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
      bg: 'bg-[#0c4a6e]/95 border-sky-500/30 text-sky-100 shadow-sky-950/40',
    },
  }[toast.type]

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right ${config.bg} min-w-[280px] max-w-md pointer-events-auto`}
    >
      {config.icon}
      <p className="text-xs font-semibold flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-slate-400 hover:text-white transition p-0.5 rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function Toast() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <ToastSingle key={t.id} toast={t} />
      ))}
    </div>
  )
}
