import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateRequestSize, validateAnswerPayload } from "@/lib/validation"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareableId: string }> }
) {
  try {
    const { shareableId } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate request size
    const sizeError = await validateRequestSize(req)
    if (sizeError) return sizeError

    const { answers } = await req.json()

    const quiz = await prisma.quiz.findUnique({
      where: {
        shareableId,
      },
      include: {
        questions: true,
      },
    })

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    // Validate answer payload
    const validationError = validateAnswerPayload({ answers }, quiz.questions.length)
    if (validationError) return validationError

    // Check if user already took the quiz
    const existingAnswer = await prisma.answer.findFirst({
      where: {
        quizId: quiz.id,
        userId: session.user.id as string,
      },
    })

    if (existingAnswer) {
      return NextResponse.json(
        { error: "You have already taken this quiz" },
        { status: 400 }
      )
    }

    // Save answers
    const answerRecords = quiz.questions.map((question) => ({
      quizId: quiz.id,
      questionId: question.id,
      userId: session.user.id as string,
      answer: answers[question.id],
      isCorrect: answers[question.id] === question.correctAnswer,
    }))

    await prisma.answer.createMany({
      data: answerRecords,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error submitting quiz:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
