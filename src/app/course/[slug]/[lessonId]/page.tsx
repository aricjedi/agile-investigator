import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Module } from '@/lib/types'
import QuizPageClient from './QuizPageClient'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!course) notFound()

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .single()

  if (!enrollment) redirect(`/course/${slug}`)

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, module:modules(*)')
    .eq('id', lessonId)
    .single()

  if (!lesson) notFound()

  const mod = lesson.module as Module

  const { data: siblings } = await supabase
    .from('lessons')
    .select('id, title, order_index')
    .eq('module_id', mod.id)
    .order('order_index')

  const currentIdx = (siblings ?? []).findIndex((l: { id: string }) => l.id === lessonId)
  const prev = siblings?.[currentIdx - 1]
  const next = siblings?.[currentIdx + 1]

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('completed')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .single()

  const isCompleted = progress?.completed ?? false

  // For quiz lessons — fetch quiz data and prior responses
  let quizData = null
  let priorResponses: { question_id: string; selected_option_id: string; is_correct: boolean }[] = []

  if (lesson.lesson_type === 'quiz') {
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id, title, quiz_questions(id, question, order_index, quiz_options(id, option_text, is_correct, order_index))')
      .eq('lesson_id', lessonId)
      .single()

    quizData = quiz

    if (quiz) {
      const questionIds = (quiz.quiz_questions ?? []).map((q: { id: string }) => q.id)
      if (questionIds.length > 0) {
        const { data: responses } = await supabase
          .from('quiz_responses')
          .select('question_id, selected_option_id, is_correct')
          .eq('user_id', user.id)
          .in('question_id', questionIds)
        priorResponses = responses ?? []
      }
    }
  }

  async function markComplete() {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('lesson_progress').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    })
    if (next) {
      redirect(`/course/${slug}/${next.id}`)
    } else {
      redirect(`/course/${slug}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header style={{ backgroundColor: '#1e2d40' }} className="px-6 py-3.5 flex items-center justify-between">
        <Link href={`/course/${slug}`} className="text-white font-semibold text-base tracking-wide">
          The Agile Investigator
        </Link>
        <Link href={`/course/${slug}`} className="text-slate-300 hover:text-white text-sm transition-colors">
          &larr; {course.title}
        </Link>
      </header>

      <div className="flex flex-1">
        <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
          <p className="text-xs text-slate-400 mb-6 uppercase tracking-wide font-medium">
            {mod.title}
          </p>

          <h1 className="text-2xl font-bold text-slate-900 mb-6">{lesson.title}</h1>

          {/* VIDEO lesson */}
          {lesson.lesson_type === 'video' && (
            <>
              {lesson.video_url && (
                <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden mb-8">
                  <iframe
                    src={lesson.video_url}
                    className="w-full h-full"
                    allowFullScreen
                    title={lesson.title}
                  />
                </div>
              )}
              {!lesson.video_url && (
                <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center mb-8 border border-slate-200">
                  <p className="text-slate-400 text-sm">Video coming soon</p>
                </div>
              )}
              {lesson.content && (
                <div
                  className="prose prose-slate max-w-none text-slate-700 leading-relaxed mb-10"
                  dangerouslySetInnerHTML={{ __html: lesson.content }}
                />
              )}
              <div className="border-t border-slate-200 pt-8 flex items-center justify-between">
                <div>
                  {prev ? (
                    <Link href={`/course/${slug}/${prev.id}`} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                      &larr; {prev.title}
                    </Link>
                  ) : <span />}
                </div>
                {isCompleted ? (
                  <div className="flex items-center gap-3">
                    <span style={{ color: '#c9a84c' }} className="text-sm font-medium">Completed</span>
                    {next && (
                      <Link
                        href={`/course/${slug}/${next.id}`}
                        style={{ backgroundColor: '#1e2d40' }}
                        className="text-white text-sm font-semibold px-5 py-2 rounded-md hover:opacity-90 transition-opacity"
                      >
                        Next &rarr;
                      </Link>
                    )}
                  </div>
                ) : (
                  <form action={markComplete}>
                    <button
                      type="submit"
                      style={{ backgroundColor: '#1e2d40' }}
                      className="text-white text-sm font-semibold px-5 py-2 rounded-md hover:opacity-90 transition-opacity"
                    >
                      {next ? 'Mark Complete & Continue' : 'Mark Complete'}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

          {/* QUIZ lesson */}
          {lesson.lesson_type === 'quiz' && quizData && (
            <QuizPageClient
              quiz={quizData}
              priorResponses={priorResponses}
              userId={user.id}
              lessonId={lessonId}
              slug={slug}
              prev={prev ?? null}
              next={next ?? null}
              isCompleted={isCompleted}
            />
          )}
        </main>
      </div>
    </div>
  )
}
