"use client"

import { useEffect } from "react"

type ToastProps = {
  message: string
  type: "success" | "error" | "info"
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  }[type]

  const icon = {
    success: "✓",
    error: "✗",
    info: "ℹ",
  }[type]

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 max-w-md`}>
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white bg-opacity-30 font-bold">
          {icon}
        </div>
        <p className="flex-1">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white hover:text-gray-200 font-bold text-xl"
        >
          ×
        </button>
      </div>
    </div>
  )
}
