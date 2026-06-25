import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch enrolled courses with progress
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('user_id', user.id)

  // Fetch all published courses for discovery
  const { data: allCourses } = await supabase
    .from('courses')
    .select('*')
    .eq('published', true)

  const enrolledIds = new Set((enrollments ?? []).map((e: { course_id: string }) => e.course_id))
  const unenrolled = (allCourses ?? []).filter((c: { id: string }) => !enrolledIds.has(c.id))

  const displayName = user.user_metadata?.full_name ?? user.email

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header style={{ backgroundColor: '#1e2d40' }} className="px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-white font-semibold text-lg tracking-wide">
          The Agile Investigator
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-sm">{displayName}</span>
          <form action={signOut}>
            <button type="submit" className="text-slate-400 hover:text-white text-sm transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-6 py-12 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">My Learning</h1>

        {/* Enrolled courses */}
        {enrollments && enrollments.length > 0 ? (
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">In Progress</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrollments.map((e: { course: { id: string; slug: string; title: string; description: string | null } }) => (
                <Link
                  key={e.course.id}
                  href={`/course/${e.course.slug}`}
                  className="block bg-white border border-slate-200 rounded-lg p-6 hover:border-slate-400 transition-colors group"
                >
                  <div
                    style={{ backgroundColor: '#1e2d40' }}
                    className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
                  >
                    <span style={{ color: '#c9a84c' }} className="font-bold text-sm">
                      {e.course.title.charAt(0)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-slate-900 mb-1">
                    {e.course.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{e.course.description}</p>
                  <p style={{ color: '#c9a84c' }} className="text-sm font-medium mt-4">
                    Continue &rarr;
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Available courses */}
        {unenrolled.length > 0 ? (
          <section>
            <h2 className="text-lg font-semibold text-slate-700 mb-4">
              {enrollments && enrollments.length > 0 ? 'More Courses' : 'Available Courses'}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unenrolled.map((c: { id: string; slug: string; title: string; description: string | null }) => (
                <Link
                  key={c.id}
                  href={`/course/${c.slug}`}
                  className="block bg-white border border-slate-200 rounded-lg p-6 hover:border-slate-400 transition-colors group"
                >
                  <div
                    style={{ backgroundColor: '#f1f5f9' }}
                    className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
                  >
                    <span className="font-bold text-slate-500 text-sm">{c.title.charAt(0)}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 group-hover:text-slate-900 mb-1">
                    {c.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{c.description}</p>
                  <p className="text-sm font-medium mt-4 text-slate-400">View course &rarr;</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {(!enrollments || enrollments.length === 0) && unenrolled.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg">No courses available yet. Check back soon.</p>
          </div>
        )}
      </main>
    </div>
  )
}
