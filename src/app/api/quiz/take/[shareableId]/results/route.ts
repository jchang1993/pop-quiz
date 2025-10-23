import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: { shareableId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        shareableId: params.shareableId,
        published: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        questions: {
          select: {
            id: true,
            question: true,
            questionImage: true,
            options: true,
            optionImages: true,
            correctAnswer: true,
            order: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    // Get user's answers
    const userAnswers = await prisma.answer.findMany({
      where: {
        quizId: quiz.id,
        userId: session.user.id as string,
      },
      select: {
        questionId: true,
        answer: true,
        isCorrect: true,
      },
    })

    if (userAnswers.length === 0) {
      return NextResponse.json(
        { error: "You haven't taken this quiz yet" },
        { status: 404 }
      )
    }

    // Calculate score
    const score = userAnswers.filter(a => a.isCorrect).length
    const total = quiz.questions.length

    // Parse JSON fields
    const quizWithParsedData = {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: JSON.parse(q.options),
        optionImages: q.optionImages ? JSON.parse(q.optionImages) : null,
      })),
    }

    return NextResponse.json({
      quiz: quizWithParsedData,
      userAnswers,
      score,
      total,
    })
  } catch (error) {
    console.error("Error fetching quiz results:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
