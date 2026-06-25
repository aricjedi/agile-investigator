import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Module, Lesson } from '@/lib/types'

type ModuleWithLessons = Module & { lessons: Lesson[] }

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!course) notFound()

  const { data: modules } = await supabase
    .from('modules')
    .select('*, lessons(*)')
    .eq('course_id', course.id)
    .order('order_index')

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .single()

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .eq('completed', true)

  const completedIds = new Set((progress ?? []).map((p: { lesson_id: string }) => p.lesson_id))

  const totalLessons = (modules ?? []).reduce(
    (sum: number, m: ModuleWithLessons) => sum + (m.lessons?.length ?? 0), 0
  )
  const completedCount = completedIds.size

  async function enroll() {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('enrollments').upsert({
      user_id: user.id,
      course_id: course.id,
    })
    redirect(`/course/${slug}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header style={{ backgroundColor: '#1e2d40' }} className="px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-white font-semibold text-lg tracking-wide">
          The Agile Investigator
        </Link>
        <Link href="/dashboard" className="text-slate-300 hover:text-white text-sm transition-colors">
          &larr; Dashboard
        </Link>
      </header>

      {/* Course hero */}
      <section style={{ backgroundColor: '#1e2d40' }} className="px-6 py-14">
        <div className="max-w-4xl mx-auto">
          <p style={{ color: '#c9a84c' }} className="text-xs font-semibold uppercase tracking-widest mb-3">
            Basic Course
          </p>
          <h1 className="text-white text-3xl font-bold mb-3">{course.title}</h1>
          {course.description && (
            <p className="text-slate-300 text-base leading-relaxed max-w-2xl">{course.description}</p>
          )}
          <div className="mt-6 flex items-center gap-6 text-slate-400 text-sm">
            <span>{totalLessons} lessons</span>
            {enrollment && (
              <span style={{ color: '#c9a84c' }}>
                {completedCount}/{totalLessons} complete
              </span>
            )}
          </div>
          {!enrollment && (
            <form action={enroll} className="mt-6">
              <button
                type="submit"
                style={{ backgroundColor: '#c9a84c' }}
                className="text-white font-semibold px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity text-sm"
              >
                Enroll in This Course
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Module list */}
      <main className="flex-1 px-6 py-10 max-w-4xl mx-auto w-full">
        <div className="space-y-6">
          {(modules as ModuleWithLessons[] ?? []).map((mod, idx) => (
            <div key={mod.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                <div
                  style={{ backgroundColor: '#1e2d40', color: '#c9a84c' }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                >
                  {idx + 1}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{mod.title}</p>
                  {mod.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                  )}
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {(mod.lessons ?? [])
                  .sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
                  .map((lesson: Lesson) => {
                    const done = completedIds.has(lesson.id)
                    return (
                      <Link
                        key={lesson.id}
                        href={enrollment ? `/course/${slug}/${lesson.id}` : '#'}
                        className={`flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors ${!enrollment ? 'cursor-default' : ''}`}
                      >
                        <span className="text-base flex-shrink-0">
                          {done ? '✓' : lesson.lesson_type === 'video' ? '▶' : lesson.lesson_type === 'quiz' ? '?' : '◦'}
                        </span>
                        <span className={`text-sm flex-1 ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {lesson.title}
                        </span>
                        {lesson.duration_minutes && (
                          <span className="text-xs text-slate-400">{lesson.duration_minutes}m</span>
                        )}
                        {!enrollment && (
                          <span className="text-xs text-slate-400">Enroll to access</span>
                        )}
                      </Link>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
