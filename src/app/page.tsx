import Link from 'next/link'

const modules = [
  { code: 'A', name: 'ALIGN',     desc: 'Scope the investigation, establish authority, and identify stakeholders' },
  { code: 'G', name: 'GATHER',    desc: 'Collect and preserve evidence using systematic, defensible methods' },
  { code: 'I', name: 'INTERVIEW', desc: 'Conduct PEACE-model interviews with precision, structure, and fairness' },
  { code: 'L', name: 'LEAD',      desc: 'Analyze facts, apply standards, and weigh credibility' },
  { code: 'E', name: 'EXECUTE',   desc: 'Draft findings, conclusions, and defensible reports' },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header style={{ backgroundColor: '#1e2d40' }} className="px-6 py-4 flex items-center justify-between">
        <span className="text-white font-semibold text-lg tracking-wide">
          The Agile Investigator
        </span>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="text-slate-300 hover:text-white text-sm transition-colors">
            Sign In
          </Link>
          <Link href="/signup" style={{ backgroundColor: '#c9a84c' }}
            className="text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
            Enroll Free
          </Link>
        </div>
      </header>

      <section style={{ backgroundColor: '#1e2d40' }} className="px-6 py-24 text-center">
        <p style={{ color: '#c9a84c' }} className="text-sm font-semibold uppercase tracking-widest mb-4">
          AGILE-101 Basic Course
        </p>
        <h1 className="text-white text-4xl sm:text-5xl font-bold leading-tight max-w-3xl mx-auto">
          Workplace Investigations Done Right
        </h1>
        <p className="text-slate-300 mt-6 text-lg max-w-xl mx-auto leading-relaxed">
          A practical, framework-based course for investigators, HR professionals, and compliance leaders
          who need defensible outcomes every time.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" style={{ backgroundColor: '#c9a84c' }}
            className="text-white font-semibold px-8 py-3 rounded-md hover:opacity-90 transition-opacity">
            Start Learning Free
          </Link>
          <Link href="/login"
            className="text-slate-300 border border-slate-500 font-semibold px-8 py-3 rounded-md hover:border-slate-300 transition-colors">
            Sign In
          </Link>
        </div>
      </section>

      <section className="px-6 py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">The AGILE Framework</h2>
          <p className="text-slate-500 text-center mb-12">Five modules. One defensible investigation.</p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {modules.map((m) => (
              <div key={m.code} className="bg-white rounded-lg p-5 border border-slate-200 text-center">
                <div style={{ backgroundColor: '#1e2d40', color: '#c9a84c' }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">
                  {m.code}
                </div>
                <p className="font-semibold text-slate-800 text-sm mb-2">{m.name}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-slate-500 text-sm uppercase tracking-widest mb-6 font-medium">Built by a practitioner</p>
          <p className="text-slate-700 text-lg leading-relaxed">
            Created by Rick Schumacher, CFE — 30+ years leading internal investigations across
            corporate, government, and global environments. Author of{' '}
            <em>The Agile Investigator</em>.
          </p>
        </div>
      </section>

      <section style={{ backgroundColor: '#1e2d40' }} className="px-6 py-16 text-center">
        <h2 className="text-white text-2xl font-bold mb-4">Ready to investigate with confidence?</h2>
        <Link href="/signup" style={{ backgroundColor: '#c9a84c' }}
          className="inline-block text-white font-semibold px-8 py-3 rounded-md hover:opacity-90 transition-opacity">
          Enroll Now — It&apos;s Free
        </Link>
      </section>

      <footer className="py-6 text-center text-slate-400 text-xs border-t border-slate-100">
        &copy; {new Date().getFullYear()} Astris Integrity Consulting. All rights reserved.
      </footer>
    </div>
  )
}
