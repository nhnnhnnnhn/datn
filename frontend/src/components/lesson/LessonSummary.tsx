import { Link } from 'react-router'
import type { Quiz, QuizAnswer, QuizResult } from '@/types'
import { Button } from '@/components/ui/Button'
import { sameAnswer } from '@/lib/text'

export function LessonSummary({ quiz, answers, result, onExit }: { quiz: Quiz; answers: QuizAnswer[]; result: QuizResult; onExit: () => void }) {
  const accuracy = Math.round((result.correct / result.total) * 100)
  const minutes = Math.floor(result.durationSec / 60)
  const seconds = result.durationSec % 60
  const wrong = quiz.questions.filter((q) => !sameAnswer(answers.find((a) => a.questionId === q.id)?.selected ?? [], q.answer))

  return (
    <div className="min-h-dvh bg-white">
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm font-medium text-stone-500">Hoàn thành bài học</p>
        <h1 className="mt-1 text-3xl font-bold text-stone-900">
          Đúng {result.correct}/{result.total} câu
        </h1>

        <dl className="mt-6 grid grid-cols-3 divide-x divide-stone-200 rounded-lg border border-stone-200 text-center">
          <div className="py-3">
            <dt className="text-xs text-stone-500">Độ chính xác</dt>
            <dd className="mt-0.5 text-xl font-semibold text-stone-900 tabular-nums">{accuracy}%</dd>
          </div>
          <div className="py-3">
            <dt className="text-xs text-stone-500">Thời gian</dt>
            <dd className="mt-0.5 text-xl font-semibold text-stone-900 tabular-nums">
              {minutes}:{String(seconds).padStart(2, '0')}
            </dd>
          </div>
          <div className="py-3">
            <dt className="text-xs text-stone-500">Câu sai</dt>
            <dd className="mt-0.5 text-xl font-semibold text-stone-900 tabular-nums">{wrong.length}</dd>
          </div>
        </dl>

        {wrong.length > 0 && (
          <section className="mt-8">
            <h2 className="border-b border-stone-200 pb-2 text-base font-semibold text-stone-900">Ôn lại câu sai</h2>
            <ul className="divide-y divide-stone-100">
              {wrong.map((q) => (
                <li key={q.id} className="py-3 text-sm">
                  <p className="text-stone-500">{q.prompt}</p>
                  {q.highlight && <p className="mt-0.5 font-medium text-stone-900">{q.highlight}</p>}
                  <p className="mt-1">
                    <span className="text-stone-500">Đáp án: </span>
                    <span className="font-medium text-correct-ink">{q.answer.map((i) => q.options[i]).join(', ')}</span>
                  </p>
                  <Link to={`/practice?idiom=${q.idiomId}`} className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline">
                    Luyện viết câu này
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8">
          <Button variant="dark" size="lg" onClick={onExit}>
            Xong
          </Button>
        </div>
      </main>
    </div>
  )
}
