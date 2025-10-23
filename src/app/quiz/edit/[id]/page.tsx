"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Navbar from "@/components/Navbar"
import Toast from "@/components/Toast"

type Question = {
  question: string
  questionImage: string | null
  options: string[]
  optionImages: (string | null)[]
  correctAnswerIndex: number
}

type ToastState = {
  show: boolean
  message: string
  type: "success" | "error" | "info"
}

export default function EditQuizPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [questions, setQuestions] = useState<Question[]>([
    {
      question: "",
      questionImage: null,
      options: ["", "", "", ""],
      optionImages: [null, null, null, null],
      correctAnswerIndex: -1
    },
  ])
  const [loading, setLoading] = useState(false)
  const [loadingQuiz, setLoadingQuiz] = useState(true)
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "info" })

  useEffect(() => {
    async function loadQuiz() {
      try {
        const res = await fetch(`/api/quiz/${params.id}`)
        const data = await res.json()

        if (!res.ok) {
          setToast({ show: true, message: data.error || "Failed to load quiz", type: "error" })
          setLoadingQuiz(false)
          return
        }

        setTitle(data.quiz.title)
        setDescription(data.quiz.description || "")

        if (data.quiz.questions.length > 0) {
          setQuestions(
            data.quiz.questions.map((q: any) => ({
              question: q.question,
              questionImage: q.questionImage,
              options: q.options,
              optionImages: q.optionImages || [null, null, null, null],
              correctAnswerIndex: q.options.indexOf(q.correctAnswer),
            }))
          )
        }

        setLoadingQuiz(false)
      } catch (error) {
        setToast({ show: true, message: "Failed to load quiz", type: "error" })
        setLoadingQuiz(false)
      }
    }

    if (session) {
      loadQuiz()
    }
  }, [params.id, session])

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "",
        questionImage: null,
        options: ["", "", "", ""],
        optionImages: [null, null, null, null],
        correctAnswerIndex: -1
      },
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions]
    const options = [...updated[questionIndex].options]
    options[optionIndex] = value
    updated[questionIndex] = { ...updated[questionIndex], options }
    setQuestions(updated)
  }

  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleQuestionImageUpload = async (questionIndex: number, file: File | null) => {
    if (!file) {
      updateQuestion(questionIndex, "questionImage", null)
      return
    }
    const imageData = await handleImageUpload(file)
    updateQuestion(questionIndex, "questionImage", imageData)
  }

  const handleOptionImageUpload = async (questionIndex: number, optionIndex: number, file: File | null) => {
    const updated = [...questions]
    const optionImages = [...updated[questionIndex].optionImages]

    if (!file) {
      optionImages[optionIndex] = null
    } else {
      const imageData = await handleImageUpload(file)
      optionImages[optionIndex] = imageData
    }

    updated[questionIndex] = { ...updated[questionIndex], optionImages }
    setQuestions(updated)
  }

  const handleSubmit = async (e: React.FormEvent, published: boolean) => {
    e.preventDefault()
    setLoading(true)

    if (!title.trim()) {
      setToast({ show: true, message: "Quiz title is required", type: "error" })
      setLoading(false)
      return
    }

    if (questions.length === 0) {
      setToast({ show: true, message: "At least one question is required", type: "error" })
      setLoading(false)
      return
    }

    if (published) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.question.trim()) {
          setToast({ show: true, message: `Question ${i + 1} is empty`, type: "error" })
          setLoading(false)
          return
        }
        if (q.options.some((opt) => !opt.trim())) {
          setToast({ show: true, message: `Question ${i + 1} has empty options`, type: "error" })
          setLoading(false)
          return
        }
        if (q.correctAnswerIndex === -1) {
          setToast({ show: true, message: `Question ${i + 1} has no correct answer selected`, type: "error" })
          setLoading(false)
          return
        }
      }
    }

    try {
      const res = await fetch(`/api/quiz/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          published,
          questions: questions.map(q => ({
            question: q.question,
            questionImage: q.questionImage,
            options: q.options,
            optionImages: q.optionImages,
            correctAnswer: q.correctAnswerIndex !== -1 ? q.options[q.correctAnswerIndex] : "",
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setToast({ show: true, message: data.error || "Something went wrong", type: "error" })
        setLoading(false)
        return
      }

      setToast({
        show: true,
        message: published ? "Quiz published successfully!" : "Quiz updated",
        type: "success"
      })
      setTimeout(() => router.push("/dashboard"), 1000)
    } catch (error) {
      setToast({ show: true, message: "An error occurred. Please try again.", type: "error" })
      setLoading(false)
    }
  }

  if (!session) {
    return null
  }

  if (loadingQuiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading quiz...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Quiz</h1>

        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, show: false })}
          />
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Quiz Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Awesome Quiz"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of your quiz"
              />
            </div>
          </div>

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white shadow rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Question {qIndex + 1}
                </h3>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Question
                </label>
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your question"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Image (optional)
                </label>
                {q.questionImage && (
                  <div className="mb-2 relative inline-block">
                    <img src={q.questionImage} alt="Question" className="max-w-xs rounded border" />
                    <button
                      type="button"
                      onClick={() => handleQuestionImageUpload(qIndex, null)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleQuestionImageUpload(qIndex, file)
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Options
                </label>
                {q.options.map((option, oIndex) => (
                  <div key={oIndex} className="space-y-2 p-3 border border-gray-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correctAnswerIndex === oIndex}
                        onChange={() => updateQuestion(qIndex, "correctAnswerIndex", oIndex)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Option ${oIndex + 1}`}
                      />
                    </div>
                    {q.optionImages[oIndex] && (
                      <div className="ml-6 relative inline-block">
                        <img src={q.optionImages[oIndex]!} alt={`Option ${oIndex + 1}`} className="max-w-[150px] rounded border" />
                        <button
                          type="button"
                          onClick={() => handleOptionImageUpload(qIndex, oIndex, null)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <div className="ml-6">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleOptionImageUpload(qIndex, oIndex, file)
                        }}
                        className="block w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-500">Select the radio button to mark the correct answer</p>
              </div>
            </div>
          ))}

          <div className="space-y-4">
            <button
              type="button"
              onClick={addQuestion}
              className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300 px-4 py-2 rounded-md text-sm font-medium"
            >
              Add Question
            </button>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={(e) => handleSubmit(e as any, false)}
                disabled={loading}
                className="flex-1 bg-gray-600 text-white hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Publishing..." : "Publish Quiz"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
