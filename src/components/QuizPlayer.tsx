'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  onComplete: () => void
}

export default function QuizPlayer({ quiz, priorResponses, userId, onComplete }: Props) {
  const alreadyCompleted = priorResponses.length === quiz.quiz_questions.length

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    priorResponses.forEach(r => { init[r.question_id] = r.selected_option_id })
    return init
  })
  const [submitted, setSubmitted] = useState(alreadyCompleted)
  const [saving, setSaving] = useState(false)

  const questions = [...quiz.quiz_questions].sort((a, b) => a.order_index - b.order_index)

  function getCorrectId(q: Question) {
    return q.quiz_options.find(o => o.is_correct)?.id ?? ''
  }

  async function handleSubmit() {
    if (Object.keys(selected).length < questions.length) return
    setSaving(true)
    const supabase = createClient()
    const rows = questions.map(q => {
      const chosenId = selected[q.id]
      const correct = getCorrectId(q) === chosenId
      return {
        user_id: userId,
        question_id: q.id,
        selected_option_id: chosenId,
        is_correct: correct,
      }
    })
    await supabase.from('quiz_responses').upsert(rows, { onConflict: 'user_id,question_id' })
    setSaving(false)
    setSubmitted(true)
  }

  const score = submitted
    ? questions.filter(q => {
        const chosenId = selected[q.id]
        return chosenId && getCorrectId(q) === chosenId
      }).length
    : 0

  return (
    <div className="space-y-8">
      {submitted && (
        <div
          className="rounded-lg px-5 py-4 flex items-center justify-between"
          style={{
            backgroundColor: score === questions.length ? '#f0fdf4' : '#fefce8',
            borderLeft: `4px solid ${score === questions.length ? '#16a34a' : '#c9a84c'}`
          }}
        >
          <div>
            <p className="font-semibold text-slate-800">{score}/{questions.length} correct</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {score === questions.length
                ? 'Perfect score.'
                : score >= Math.ceil(questions.length * 0.8)
                ? 'Strong result. Review any missed items below.'
                : 'Review the highlighted answers and revisit the lesson if needed.'}
            </p>
          </div>
          <button
            onClick={onComplete}
            style={{ backgroundColor: '#1e2d40' }}
            className="text-white text-sm font-semibold px-5 py-2 rounded-md hover:opacity-90 transition-opacity ml-4 flex-shrink-0"
          >
            Continue &rarr;
          </button>
        </div>
      )}

      {questions.map((q, qi) => {
        const chosenId = selected[q.id]
        const correctId = getCorrectId(q)

        return (
          <div key={q.id} className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Question {qi + 1}</p>
              <p className="text-sm font-medium text-slate-800">{q.question}</p>
            </div>
            <div className="divide-y divide-slate-100">
              {[...q.quiz_options]
                .sort((a, b) => a.order_index - b.order_index)
                .map((opt, oi) => {
                  const label = String.fromCharCode(65 + oi)
                  const isChosen = chosenId === opt.id
                  const isCorrect = opt.id === correctId

                  return (
                    <button
                      key={opt.id}
                      disabled={submitted}
                      onClick={() => !submitted && setSelected(prev => ({ ...prev, [q.id]: opt.id }))}
                      className="w-full text-left px-5 py-3 flex items-center gap-3 border-l-4 transition-colors disabled:cursor-default"
                      style={{
                        borderLeftColor: submitted
                          ? isCorrect ? '#16a34a' : isChosen ? '#ef4444' : 'transparent'
                          : isChosen ? '#1e2d40' : 'transparent',
                        backgroundColor: submitted
                          ? isCorrect ? '#f0fdf4' : isChosen ? '#fef2f2' : 'white'
                          : isChosen ? '#f1f5f9' : 'white',
                      }}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border"
                        style={{
                          backgroundColor: submitted
                            ? isCorrect ? '#16a34a' : isChosen ? '#ef4444' : 'white'
                            : isChosen ? '#1e2d40' : 'white',
                          borderColor: submitted
                            ? isCorrect ? '#16a34a' : isChosen ? '#ef4444' : '#cbd5e1'
                            : isChosen ? '#1e2d40' : '#cbd5e1',
                          color: (submitted && (isCorrect || isChosen)) || (!submitted && isChosen) ? 'white' : '#94a3b8',
                        }}
                      >
                        {label}
                      </span>
                      <span className={`text-sm ${
                        submitted
                          ? isCorrect ? 'text-green-800 font-medium' : isChosen ? 'text-red-700' : 'text-slate-500'
                          : isChosen ? 'text-slate-800 font-medium' : 'text-slate-700'
                      }`}>
                        {opt.option_text}
                      </span>
                      {submitted && isCorrect && (
                        <span className="ml-auto text-green-600 text-xs font-semibold flex-shrink-0">Correct</span>
                      )}
                      {submitted && isChosen && !isCorrect && (
                        <span className="ml-auto text-red-500 text-xs font-semibold flex-shrink-0">Your answer</span>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>
        )
      })}

      {!submitted && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-400">{Object.keys(selected).length}/{questions.length} answered</p>
          <button
            onClick={handleSubmit}
            disabled={Object.keys(selected).length < questions.length || saving}
            style={{ backgroundColor: '#1e2d40' }}
            className="text-white text-sm font-semibold px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Submit Answers'}
          </button>
        </div>
      )}
    </div>
  )
}
