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

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: true },
    })

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    if (quiz.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Validate quiz is complete before publishing
    if (quiz.questions.length === 0) {
      return NextResponse.json(
        { error: "Cannot publish quiz with no questions" },
        { status: 400 }
      )
    }

    for (const question of quiz.questions) {
      if (!question.question.trim() || !question.correctAnswer) {
        return NextResponse.json(
          { error: "All questions must be complete before publishing" },
          { status: 400 }
        )
      }
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: { published: true },
    })

    return NextResponse.json({ quiz: updatedQuiz })
  } catch (error) {
    console.error("Publish error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
