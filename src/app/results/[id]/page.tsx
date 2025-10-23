import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Navbar from "@/components/Navbar"
import Link from "next/link"

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const quiz = await prisma.quiz.findUnique({
    where: {
      id: params.id,
    },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
      answers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          question: true,
        },
      },
    },
  })

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-800">Quiz not found</p>
          </div>
        </div>
      </div>
    )
  }

  if (quiz.creatorId !== session.user.id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-800">You are not authorized to view these results</p>
          </div>
        </div>
      </div>
    )
  }

  // Group answers by user
  const userAnswers = quiz.answers.reduce((acc, answer) => {
    if (!acc[answer.userId]) {
      acc[answer.userId] = {
        user: answer.user,
        answers: [],
        score: 0,
        total: quiz.questions.length,
      }
    }
    acc[answer.userId].answers.push(answer)
    if (answer.isCorrect) {
      acc[answer.userId].score++
    }
    return acc
  }, {} as Record<string, any>)

  const participants = Object.values(userAnswers)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 mb-4">{quiz.description}</p>
          )}
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <span>{quiz.questions.length} questions</span>
            <span>{participants.length} participants</span>
          </div>
        </div>

        {participants.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No responses yet
            </h3>
            <p className="text-gray-600 mb-6">
              Share your quiz link with colleagues to get responses
            </p>
            <button
              onClick={() => {
                const url = `${window.location.origin}/quiz/take/${quiz.shareableId}`
                navigator.clipboard.writeText(url)
                alert("Quiz link copied to clipboard!")
              }}
              className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-md text-sm font-medium"
            >
              Copy Quiz Link
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {participants.map((participant) => (
              <div key={participant.user.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {participant.user.name || participant.user.email}
                    </h3>
                    <p className="text-sm text-gray-500">{participant.user.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {participant.score}/{participant.total}
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.round((participant.score / participant.total) * 100)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  {quiz.questions.map((question, qIndex) => {
                    const answer = participant.answers.find(
                      (a: any) => a.questionId === question.id
                    )
                    const options = JSON.parse(question.options)

                    return (
                      <div key={question.id} className="border-t pt-4">
                        <p className="font-medium text-gray-900 mb-2">
                          {qIndex + 1}. {question.question}
                        </p>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm">
                            <span className="text-gray-600">Answer: </span>
                            <span
                              className={
                                answer?.isCorrect
                                  ? "text-green-600 font-medium"
                                  : "text-red-600 font-medium"
                              }
                            >
                              {answer?.answer}
                              {answer?.isCorrect ? " ✓" : " ✗"}
                            </span>
                          </p>
                          {!answer?.isCorrect && (
                            <p className="text-sm text-gray-600">
                              Correct answer: {question.correctAnswer}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
