import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch the quiz to clone
    const originalQuiz = await prisma.quiz.findUnique({
      where: {
        id,
      },
      include: {
        questions: {
          orderBy: {
            order: "asc",
          },
        },
      },
    })

    if (!originalQuiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    // Check if user has access to this quiz (either created it or took it)
    const hasAccess = originalQuiz.creatorId === session.user.id

    if (!hasAccess) {
      const hasTaken = await prisma.answer.findFirst({
        where: {
          quizId: id,
          userId: session.user.id as string,
        },
      })

      if (!hasTaken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Create a new quiz with the same questions
    const newQuiz = await prisma.quiz.create({
      data: {
        title: `${originalQuiz.title} (Copy)`,
        description: originalQuiz.description,
        published: false, // Always create as draft
        creatorId: session.user.id as string,
        questions: {
          create: originalQuiz.questions.map((q, index) => ({
            question: q.question,
            questionImage: q.questionImage,
            options: q.options,
            optionImages: q.optionImages,
            correctAnswer: q.correctAnswer,
            order: index,
          })),
        },
      },
    })

    return NextResponse.json({ quizId: newQuiz.id })
  } catch (error) {
    console.error("Error cloning quiz:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
