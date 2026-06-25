'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QuizPlayer from '@/components/QuizPlayer'

type Option = {
  id: string
  option_text: string
  is_correct: boolean
  order_index: number
}

type Question = {
  id: string
  question: string
  order_index: number
  quiz_options: Option[]
}

type Quiz = {
  id: string
  title: string
  quiz_questions: Question[]
}

type PriorResponse = {
  question_id: string
  selected_option_id: string
  is_correct: boolean
}

type Props = {
  quiz: Quiz
  priorResponses: PriorResponse[]
  userId: string
  lessonId: string
  slug: string
  prev: { id: string; title: string } | null
  next: { id: string; title: string } | null
  isCompleted: boolean
}

export default function QuizPageClient({ quiz, priorResponses, userId, lessonId, slug, prev, next, isCompleted }: Props) {
  const router = useRouter()

  async function handleQuizComplete() {
    // Mark lesson complete via API, then navigate
    await fetch('/api/complete-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId }),
    })
    if (next) {
      router.push(`/course/${slug}/${next.id}`)
    } else {
      router.push(`/course/${slug}`)
    }
  }

  return (
    <div>
      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-600">
          Answer all 5 questions, then submit to see your score. You can retake this quiz at any time.
        </p>
      </div>

      <QuizPlayer
        quiz={quiz}
        priorResponses={priorResponses}
        userId={userId}
        onComplete={handleQuizComplete}
      />

      <div className="border-t border-slate-200 pt-8 mt-8 flex items-center justify-between">
        <div>
          {prev ? (
            <Link href={`/course/${slug}/${prev.id}`} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              &larr; {prev.title}
            </Link>
          ) : <span />}
        </div>
        {isCompleted && next && (
          <Link
            href={`/course/${slug}/${next.id}`}
            style={{ backgroundColor: '#1e2d40' }}
            className="text-white text-sm font-semibold px-5 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            Next &rarr;
          </Link>
        )}
      </div>
    </div>
  )
}
