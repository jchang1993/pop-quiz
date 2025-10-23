import { NextResponse } from "next/server"

// Maximum request body size in bytes (10MB)
const MAX_REQUEST_SIZE = 10 * 1024 * 1024

// Maximum number of questions per quiz
export const MAX_QUESTIONS_PER_QUIZ = 200

// Middleware to validate request size
export async function validateRequestSize(req: Request): Promise<NextResponse | null> {
  const contentLength = req.headers.get('content-length')

  if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
    return NextResponse.json(
      { error: "Request body too large. Maximum size is 10MB" },
      { status: 413 }
    )
  }

  return null
}

// Validate quiz creation payload
export function validateQuizPayload(data: any): NextResponse | null {
  if (!data.title || typeof data.title !== 'string') {
    return NextResponse.json(
      { error: "Title is required and must be a string" },
      { status: 400 }
    )
  }

  if (data.title.length > 200) {
    return NextResponse.json(
      { error: "Title must be less than 200 characters" },
      { status: 400 }
    )
  }

  if (data.description && data.description.length > 1000) {
    return NextResponse.json(
      { error: "Description must be less than 1000 characters" },
      { status: 400 }
    )
  }

  if (!Array.isArray(data.questions)) {
    return NextResponse.json(
      { error: "Questions must be an array" },
      { status: 400 }
    )
  }

  if (data.questions.length === 0) {
    return NextResponse.json(
      { error: "Quiz must have at least one question" },
      { status: 400 }
    )
  }

  if (data.questions.length > MAX_QUESTIONS_PER_QUIZ) {
    return NextResponse.json(
      { error: `Quiz cannot have more than ${MAX_QUESTIONS_PER_QUIZ} questions` },
      { status: 400 }
    )
  }

  // Validate each question
  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i]

    if (!q.question || typeof q.question !== 'string') {
      return NextResponse.json(
        { error: `Question ${i + 1}: Question text is required` },
        { status: 400 }
      )
    }

    if (q.question.length > 500) {
      return NextResponse.json(
        { error: `Question ${i + 1}: Question text must be less than 500 characters` },
        { status: 400 }
      )
    }

    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      return NextResponse.json(
        { error: `Question ${i + 1}: Must have between 2 and 6 options` },
        { status: 400 }
      )
    }

    if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
      return NextResponse.json(
        { error: `Question ${i + 1}: Correct answer is required` },
        { status: 400 }
      )
    }

    if (!q.options.includes(q.correctAnswer)) {
      return NextResponse.json(
        { error: `Question ${i + 1}: Correct answer must be one of the options` },
        { status: 400 }
      )
    }

    // Validate base64 images if present
    if (q.questionImage && typeof q.questionImage === 'string') {
      if (!isValidBase64Image(q.questionImage)) {
        return NextResponse.json(
          { error: `Question ${i + 1}: Invalid question image format` },
          { status: 400 }
        )
      }
    }

    if (q.optionImages && Array.isArray(q.optionImages)) {
      for (let j = 0; j < q.optionImages.length; j++) {
        if (q.optionImages[j] && !isValidBase64Image(q.optionImages[j])) {
          return NextResponse.json(
            { error: `Question ${i + 1}, Option ${j + 1}: Invalid image format` },
            { status: 400 }
          )
        }
      }
    }
  }

  return null
}

// Validate answer submission
export function validateAnswerPayload(data: any, questionCount: number): NextResponse | null {
  if (!data.answers || typeof data.answers !== 'object') {
    return NextResponse.json(
      { error: "Answers must be an object" },
      { status: 400 }
    )
  }

  const answerKeys = Object.keys(data.answers)

  if (answerKeys.length !== questionCount) {
    return NextResponse.json(
      { error: `Expected ${questionCount} answers, got ${answerKeys.length}` },
      { status: 400 }
    )
  }

  for (const questionId of answerKeys) {
    const answer = data.answers[questionId]

    if (!answer || typeof answer !== 'string') {
      return NextResponse.json(
        { error: `Answer for question ${questionId}: Answer text is required and must be a string` },
        { status: 400 }
      )
    }
  }

  return null
}

// Helper to validate base64 image strings
function isValidBase64Image(str: string): boolean {
  // Check if it's a data URL
  if (!str.startsWith('data:image/')) {
    return false
  }

  // Check if it has the base64 marker
  if (!str.includes(';base64,')) {
    return false
  }

  // Extract the base64 part
  const base64Data = str.split(';base64,')[1]
  if (!base64Data) {
    return false
  }

  // Check if base64 is valid (basic check)
  try {
    // In Node.js environment, we can validate base64
    const buffer = Buffer.from(base64Data, 'base64')
    return buffer.toString('base64') === base64Data
  } catch {
    return false
  }
}
