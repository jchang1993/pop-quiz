import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateRequestSize, validateQuizPayload } from "@/lib/validation"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate request size
    const sizeError = await validateRequestSize(req)
    if (sizeError) return sizeError

    const { title, description, questions, published = false } = await req.json()

    // Validate quiz payload
    const validationError = validateQuizPayload({ title, description, questions })
    if (validationError) return validationError

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: "Title and at least one question are required" },
        { status: 400 }
      )
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        published,
        creatorId: session.user.id as string,
        questions: {
          create: questions.map((q: any, index: number) => ({
            question: q.question,
            questionImage: q.questionImage,
            options: JSON.stringify(q.options),
            optionImages: JSON.stringify(q.optionImages),
            correctAnswer: q.correctAnswer,
            order: index,
          })),
        },
      },
      include: {
        questions: true,
      },
    })

    return NextResponse.json({ quiz }, { status: 201 })
  } catch (error) {
    console.error("Quiz creation error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
