import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Lesson, Module } from '@/lib/types'

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

  // Check enrollment
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

  // Get sibling lessons for navigation
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
      {/* Nav */}
      <header style={{ backgroundColor: '#1e2d40' }} className="px-6 py-3.5 flex items-center justify-between">
        <Link href={`/course/${slug}`} className="text-white font-semibold text-base tracking-wide">
          The Agile Investigator
        </Link>
        <Link href={`/course/${slug}`} className="text-slate-300 hover:text-white text-sm transition-colors">
          &larr; {course.title}
        </Link>
      </header>

      <div className="flex flex-1">
        {/* Main content */}
        <main className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
          {/* Breadcrumb */}
          <p className="text-xs text-slate-400 mb-6 uppercase tracking-wide font-medium">
            {mod.title}
          </p>

          <h1 className="text-2xl font-bold text-slate-900 mb-6">{lesson.title}</h1>

          {/* Video */}
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

          {/* Text content */}
          {lesson.content && (
            <div
              className="prose prose-slate max-w-none text-slate-700 leading-relaxed mb-10"
              dangerouslySetInnerHTML={{ __html: lesson.content }}
            />
          )}

          {/* Complete / navigation */}
          <div className="border-t border-slate-200 pt-8 flex items-center justify-between">
            <div>
              {prev ? (
                <Link
                  href={`/course/${slug}/${prev.id}`}
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  &larr; {prev.title}
                </Link>
              ) : (
                <span />
              )}
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
        </main>
      </div>
    </div>
  )
}
