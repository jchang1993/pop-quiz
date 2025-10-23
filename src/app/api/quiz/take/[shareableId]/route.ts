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

    // Check if user already took the quiz
    let alreadyTaken = false
    if (session?.user) {
      const existingAnswer = await prisma.answer.findFirst({
        where: {
          quizId: quiz.id,
          userId: session.user.id as string,
        },
      })
      alreadyTaken = !!existingAnswer
    }

    // Parse options and optionImages from JSON strings
    const quizWithParsedOptions = {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: JSON.parse(q.options),
        optionImages: q.optionImages ? JSON.parse(q.optionImages) : null,
      })),
    }

    return NextResponse.json({ quiz: quizWithParsedOptions, alreadyTaken })
  } catch (error) {
    console.error("Error fetching quiz:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
