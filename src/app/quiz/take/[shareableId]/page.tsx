"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import Link from "next/link"

type Question = {
  id: string
  question: string
  questionImage: string | null
  options: string[]
  optionImages: (string | null)[] | null
  order: number
}

type Quiz = {
  id: string
  title: string
  description: string | null
  questions: Question[]
}

export default function TakeQuizPage({ params }: { params: { shareableId: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [alreadyTaken, setAlreadyTaken] = useState(false)

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const res = await fetch(`/api/quiz/take/${params.shareableId}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Quiz not found")
          setLoading(false)
          return
        }

        setQuiz(data.quiz)
        setAlreadyTaken(data.alreadyTaken || false)
        setLoading(false)
      } catch (error) {
        setError("Failed to load quiz")
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [params.shareableId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session?.user) {
      router.push(`/login?callbackUrl=/quiz/take/${params.shareableId}`)
      return
    }

    if (Object.keys(answers).length !== quiz?.questions.length) {
      setError("Please answer all questions")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/quiz/take/${params.shareableId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to submit quiz")
        setSubmitting(false)
        return
      }

      router.push(`/quiz/take/${params.shareableId}/results`)
    } catch (error) {
      setError("An error occurred. Please try again.")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading quiz...</div>
        </div>
      </div>
    )
  }

  if (error && !quiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (alreadyTaken) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Already Completed
            </h2>
            <p className="text-gray-700 mb-4">
              You have already taken this quiz. Thank you for participating!
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-md text-sm font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Sign in to take this quiz
            </h2>
            <p className="text-gray-700 mb-6">
              You need to be signed in to take this quiz
            </p>
            <Link
              href={`/login?callbackUrl=/quiz/take/${params.shareableId}`}
              className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-md text-sm font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz?.title}</h1>
          {quiz?.description && (
            <p className="text-gray-600">{quiz.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-4">
            {quiz?.questions.length} questions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {quiz?.questions
            .sort((a, b) => a.order - b.order)
            .map((question, index) => (
              <div key={question.id} className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {index + 1}. {question.question}
                </h3>
                {question.questionImage && (
                  <div className="mb-4">
                    <img
                      src={question.questionImage}
                      alt="Question"
                      className="max-w-md rounded border shadow-sm"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <label
                      key={optIndex}
                      className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={(e) =>
                          setAnswers({ ...answers, [question.id]: e.target.value })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-1"
                      />
                      <div className="flex-1">
                        <span className="text-gray-900">{option}</span>
                        {question.optionImages && question.optionImages[optIndex] && (
                          <div className="mt-2">
                            <img
                              src={question.optionImages[optIndex]!}
                              alt={`Option ${optIndex + 1}`}
                              className="max-w-[200px] rounded border"
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
        </form>
      </div>
    </div>
  )
}
