import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse pagination parameters
    const { searchParams } = new URL(req.url)
    const createdLimit = Math.min(parseInt(searchParams.get('createdLimit') || '50'), 100)
    const createdSkip = Math.max(parseInt(searchParams.get('createdSkip') || '0'), 0)
    const takenLimit = Math.min(parseInt(searchParams.get('takenLimit') || '50'), 100)
    const takenSkip = Math.max(parseInt(searchParams.get('takenSkip') || '0'), 0)

    // Fetch quizzes created by the user with optimized query
    const [createdQuizzes, createdTotal] = await Promise.all([
      prisma.quiz.findMany({
        where: {
          creatorId: session.user.id as string,
        },
        select: {
          id: true,
          title: true,
          description: true,
          published: true,
          createdAt: true,
          updatedAt: true,
          shareableId: true,
          _count: {
            select: {
              questions: true,
            }
          },
          answers: {
            select: {
              userId: true,
            },
            distinct: ['userId'],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: createdLimit,
        skip: createdSkip,
      }),
      prisma.quiz.count({
        where: {
          creatorId: session.user.id as string,
        },
      }),
    ])

    // Calculate unique respondents for each created quiz
    const createdQuizzesWithCount = createdQuizzes.map(quiz => ({
      ...quiz,
      _count: {
        answers: quiz.answers.length,
        questions: quiz._count.questions,
      },
      answers: undefined,
    }))

    // Fetch quizzes the user has taken with optimized aggregation
    const [takenQuizzes, takenTotal] = await Promise.all([
      prisma.quiz.findMany({
        where: {
          published: true,
          answers: {
            some: {
              userId: session.user.id as string,
            },
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          shareableId: true,
          _count: {
            select: {
              questions: true,
            }
          },
          answers: {
            select: {
              userId: true,
              isCorrect: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: takenLimit,
        skip: takenSkip,
      }),
      prisma.quiz.count({
        where: {
          published: true,
          answers: {
            some: {
              userId: session.user.id as string,
            },
          },
        },
      }),
    ])

    // Calculate scores for each taken quiz (optimized)
    const takenQuizzesWithScores = takenQuizzes.map((quiz) => {
      // Get user's score
      const userAnswers = quiz.answers.filter(a => a.userId === session.user.id)
      const userScore = userAnswers.filter(a => a.isCorrect).length
      const totalQuestions = quiz._count.questions

      // Get date taken (earliest answer from user)
      const dateTaken = userAnswers.length > 0
        ? userAnswers[0].createdAt
        : quiz.createdAt

      // Calculate average score across all users (in-memory, already fetched)
      const userScores = new Map<string, number>()
      quiz.answers.forEach(answer => {
        const currentScore = userScores.get(answer.userId) || 0
        userScores.set(answer.userId, currentScore + (answer.isCorrect ? 1 : 0))
      })

      const allScores = Array.from(userScores.values())
      const avgScore = allScores.length > 0
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length
        : 0

      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        createdAt: quiz.createdAt,
        shareableId: quiz.shareableId,
        userScore,
        totalQuestions,
        avgScore: Math.round(avgScore * 10) / 10,
        dateTaken: dateTaken.toISOString(),
      }
    })

    return NextResponse.json({
      createdQuizzes: createdQuizzesWithCount,
      takenQuizzes: takenQuizzesWithScores,
      pagination: {
        created: {
          total: createdTotal,
          limit: createdLimit,
          skip: createdSkip,
          hasMore: createdSkip + createdLimit < createdTotal,
        },
        taken: {
          total: takenTotal,
          limit: takenLimit,
          skip: takenSkip,
          hasMore: takenSkip + takenLimit < takenTotal,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching quizzes:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
