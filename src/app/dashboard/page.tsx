"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import Toast from "@/components/Toast"

type Quiz = {
  id: string
  title: string
  description: string | null
  published: boolean
  createdAt: string
  shareableId: string
  questions?: any[]
  _count?: {
    answers: number
    questions?: number
  }
  userScore?: number
  totalQuestions?: number
  avgScore?: number
  dateTaken?: string
}

type ToastState = {
  show: boolean
  message: string
  type: "success" | "error" | "info"
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [createdQuizzes, setCreatedQuizzes] = useState<Quiz[]>([])
  const [takenQuizzes, setTakenQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "info" })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const res = await fetch("/api/quizzes")
        const data = await res.json()
        setCreatedQuizzes(data.createdQuizzes || [])
        setTakenQuizzes(data.takenQuizzes || [])
      } catch (error) {
        console.error("Failed to fetch quizzes:", error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchQuizzes()
    }
  }, [session])

  const handleClone = async (quizId: string) => {
    try {
      const res = await fetch(`/api/quiz/${quizId}/clone`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        setToast({ show: true, message: data.error || "Failed to clone quiz", type: "error" })
        return
      }

      setToast({ show: true, message: "Quiz cloned successfully!", type: "success" })

      // Redirect to edit the cloned quiz after a short delay
      setTimeout(() => {
        router.push(`/quiz/edit/${data.quizId}`)
      }, 1000)
    } catch (error) {
      setToast({ show: true, message: "An error occurred", type: "error" })
    }
  }

  const handleDelete = async (quizId: string, quizTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/quiz/${quizId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        setToast({ show: true, message: data.error || "Failed to delete quiz", type: "error" })
        return
      }

      setToast({ show: true, message: "Quiz deleted successfully", type: "success" })

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      setToast({ show: true, message: "An error occurred", type: "error" })
    }
  }

  if (!session) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  const renderQuizCard = (quiz: Quiz, isTakenQuiz: boolean = false) => (
    <div
      key={quiz.id}
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900 flex-1">
            {quiz.title}
          </h3>
          <div className="flex items-center space-x-2">
            {!quiz.published && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Draft
              </span>
            )}
            {!isTakenQuiz && (
              <button
                onClick={() => handleDelete(quiz.id, quiz.title)}
                className="text-red-600 hover:text-red-800 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-red-50 rounded"
                title="Delete quiz"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {quiz.description && (
          <p className="text-sm text-gray-600 mb-4">
            {quiz.description}
          </p>
        )}

        {isTakenQuiz && quiz.userScore !== undefined && quiz.totalQuestions !== undefined ? (
          <div className="mb-4 min-h-[72px] flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-blue-600">
                  {quiz.userScore}/{quiz.totalQuestions}
                </span>
                <span className="text-sm text-gray-500">
                  ({Math.round((quiz.userScore / quiz.totalQuestions) * 100)}%)
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Avg Score: <span className="font-semibold">{quiz.avgScore}/{quiz.totalQuestions}</span>
              {quiz.avgScore !== undefined && quiz.totalQuestions && (
                <span className="text-gray-500 ml-1">
                  ({Math.round((quiz.avgScore / quiz.totalQuestions) * 100)}%)
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 min-h-[72px] flex flex-col justify-center">
            <div className="flex items-center text-sm text-gray-500 space-x-4">
              <span>{quiz._count?.questions || 0} questions</span>
              {quiz._count && <span>{quiz._count.answers} respondent{quiz._count.answers !== 1 ? 's' : ''}</span>}
            </div>
          </div>
        )}
        {!quiz.published ? (
          <div className="flex space-x-2">
            <Link
              href={`/quiz/edit/${quiz.id}`}
              className="flex-1 text-center bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium"
            >
              Edit
            </Link>
            <button
              onClick={async (e) => {
                e.preventDefault()
                const res = await fetch(`/api/quiz/${quiz.id}/publish`, { method: 'POST' })
                if (res.ok) {
                  window.location.reload()
                } else {
                  const data = await res.json()
                  setToast({ show: true, message: data.error || 'Failed to publish quiz', type: 'error' })
                }
              }}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Publish
            </button>
            <button
              onClick={() => handleClone(quiz.id)}
              className="flex-1 bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Clone
            </button>
          </div>
        ) : (
          <div className="flex space-x-2">
            {!isTakenQuiz && (
              <Link
                href={`/results/${quiz.id}`}
                className="flex-1 text-center bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium"
              >
                View Results
              </Link>
            )}
            {isTakenQuiz ? (
              <Link
                href={`/quiz/take/${quiz.shareableId}/results`}
                className="flex-1 text-center bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                My Results
              </Link>
            ) : (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/quiz/take/${quiz.shareableId}`
                  navigator.clipboard.writeText(url)
                  setToast({ show: true, message: "Quiz link copied to clipboard!", type: "success" })
                }}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Share
              </button>
            )}
            <button
              onClick={() => handleClone(quiz.id)}
              className="flex-1 bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium"
            >
              Clone
            </button>
          </div>
        )}
      </div>
      <div className="bg-gray-50 px-6 py-3 text-xs text-gray-500">
        {isTakenQuiz && quiz.dateTaken
          ? `Taken on ${new Date(quiz.dateTaken).toLocaleDateString()}`
          : `Created ${new Date(quiz.createdAt).toLocaleDateString()}`
        }
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
          />
        )}

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <Link
            href="/quiz/create"
            className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-md text-sm font-medium"
          >
            Create New Quiz
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Quizzes I've Created */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quizzes I've Created</h2>
            {createdQuizzes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No quizzes yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first quiz to get started
                </p>
                <Link
                  href="/quiz/create"
                  className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-md text-sm font-medium"
                >
                  Create Quiz
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {createdQuizzes.map((quiz) => renderQuizCard(quiz, false))}
              </div>
            )}
          </div>

          {/* Right Column: Quizzes I've Taken */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quizzes I've Taken</h2>
            {takenQuizzes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No quizzes taken yet
                </h3>
                <p className="text-gray-600">
                  When you complete quizzes, they'll appear here
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {takenQuizzes.map((quiz) => renderQuizCard(quiz, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
