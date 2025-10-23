"use client"

import { use, useState, useEffect } from "react"
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
  correctAnswer: string
  order: number
}

type Answer = {
  questionId: string
  answer: string
  isCorrect: boolean
}

type QuizResult = {
  quiz: {
    id: string
    title: string
    description: string | null
    questions: Question[]
  }
  userAnswers: Answer[]
  score: number
  total: number
}

export default function QuizResultsPage({ params }: { params: Promise<{ shareableId: string }> }) {
  const { shareableId } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [results, setResults] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/quiz/take/${shareableId}/results`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Failed to load results")
          setLoading(false)
          return
        }

        setResults(data)
        setLoading(false)
      } catch (error) {
        setError("Failed to load results")
        setLoading(false)
      }
    }

    if (session) {
      fetchResults()
    } else if (!session) {
      router.push(`/login?callbackUrl=/quiz/take/${shareableId}/results`)
    }
  }, [shareableId, session, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading results...</div>
        </div>
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-800">{error || "Results not found"}</p>
          </div>
        </div>
      </div>
    )
  }

  const percentage = Math.round((results.score / results.total) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="mb-4">
              <svg
                className={`mx-auto h-20 w-20 ${percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {percentage >= 70 ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                )}
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Your Score: {results.score}/{results.total}
            </h1>
            <p className="text-2xl text-gray-600">
              {percentage}%
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {percentage >= 70 ? 'Great job!' : percentage >= 50 ? 'Good effort!' : 'Keep practicing!'}
            </p>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{results.quiz.title}</h2>
          {results.quiz.description && (
            <p className="text-gray-600">{results.quiz.description}</p>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Review Your Answers</h2>

          {results.quiz.questions
            .sort((a, b) => a.order - b.order)
            .map((question, index) => {
              const userAnswer = results.userAnswers.find(a => a.questionId === question.id)
              const isCorrect = userAnswer?.isCorrect || false

              return (
                <div
                  key={question.id}
                  className={`bg-white shadow rounded-lg p-6 border-l-4 ${
                    isCorrect ? 'border-green-500' : 'border-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {index + 1}. {question.question}
                    </h3>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        isCorrect
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>

                  {question.questionImage && (
                    <div className="mb-4">
                      <img
                        src={question.questionImage}
                        alt="Question"
                        className="max-w-md rounded border shadow-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Your answer:</p>
                      <div
                        className={`p-3 rounded-md ${
                          isCorrect ? 'bg-green-50' : 'bg-red-50'
                        }`}
                      >
                        <p className={isCorrect ? 'text-green-900' : 'text-red-900'}>
                          {userAnswer?.answer || 'No answer provided'}
                        </p>
                        {question.optionImages && userAnswer?.answer && (
                          (() => {
                            const optionIndex = question.options.indexOf(userAnswer.answer)
                            return question.optionImages[optionIndex] ? (
                              <img
                                src={question.optionImages[optionIndex]!}
                                alt="Your answer"
                                className="mt-2 max-w-[150px] rounded border"
                              />
                            ) : null
                          })()
                        )}
                      </div>
                    </div>

                    {!isCorrect && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Correct answer:</p>
                        <div className="p-3 bg-green-50 rounded-md">
                          <p className="text-green-900">{question.correctAnswer}</p>
                          {question.optionImages && (() => {
                            const correctIndex = question.options.indexOf(question.correctAnswer)
                            return question.optionImages[correctIndex] ? (
                              <img
                                src={question.optionImages[correctIndex]!}
                                alt="Correct answer"
                                className="mt-2 max-w-[150px] rounded border"
                              />
                            ) : null
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-md text-sm font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
