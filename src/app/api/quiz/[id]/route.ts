import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateRequestSize, validateQuizPayload } from "@/lib/validation"

export async function GET(
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
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    if (quiz.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Parse JSON fields
    const quizWithParsedData = {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: JSON.parse(q.options),
        optionImages: q.optionImages ? JSON.parse(q.optionImages) : null,
      })),
    }

    return NextResponse.json({ quiz: quizWithParsedData })
  } catch (error) {
    console.error("Error fetching quiz:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const existingQuiz = await prisma.quiz.findUnique({
      where: { id },
    })

    if (!existingQuiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    if (existingQuiz.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete existing questions
    await prisma.question.deleteMany({
      where: { quizId: id },
    })

    // Update quiz with new questions
    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: {
        title,
        description,
        published,
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

    return NextResponse.json({ quiz: updatedQuiz })
  } catch (error) {
    console.error("Quiz update error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingQuiz = await prisma.quiz.findUnique({
      where: { id },
    })

    if (!existingQuiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }

    if (existingQuiz.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete quiz (this will cascade delete questions and answers due to onDelete: Cascade in schema)
    await prisma.quiz.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Quiz delete error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
