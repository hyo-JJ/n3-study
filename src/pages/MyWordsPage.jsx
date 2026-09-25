import { useState } from 'react'
import { NbHeader, BottomNav } from '../components/Layout'
import { useProgress } from '../hooks/useProgress'
import { useToast } from '../components/Toast'
import Furigana from '../components/Furigana'
import * as Ico from '../components/Icons'

const EMPTY = { word: '', reading: '', meaning: '', memo: '' }
const shuffle = (arr) => [...arr].sort(() => Math.random() - .5)

function Study({ words, onDone }) {
  const [list] = useState(() => shuffle(words))
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const w = list[idx]
  const next = () => {
    if (!flipped) { setFlipped(true); return }
    if (idx === list.length - 1) { onDone(); return }
    setIdx(i => i + 1); setFlipped(false)
  }
  return (
    <>
      <div className="nb-hud"><span>{idx + 1} / {list.length}</span><span>나만의 단어장</span></div>
      <div className="nb-bar" style={{ '--c': 'var(--nb-purple)' }}><i style={{ width: `${(idx + 1) / list.length * 100}%` }} /></div>
      <button className="nb-card nb-q" style={{ width: '100%', marginTop: 12, minHeight: 220, cursor: 'pointer', color: 'inherit', fontFamily: 'inherit' }} onClick={() => setFlipped(true)}>
        <div className="big" style={{ fontSize: 46 }}><Furigana word={w.word} reading={w.reading} show={flipped} /></div>
        {flipped
          ? <><div style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>{w.meaning}</div>{w.memo && <div className="hint">{w.memo}</div>}</>
          : <div className="hint">탭해서 뜻 확인</div>}
      </button>
      <div className="gap" />
      <div className="nb-btns">
        {idx > 0 && <button className="nb-btn ghost" onClick={() => { setIdx(i => i - 1); setFlipped(false) }}>← 이전</button>}
        <button className="nb-btn" style={{ '--c': 'var(--nb-purple)', color: '#fff' }} onClick={next}>{!flipped ? '뒤집기' : idx === list.length - 1 ? '끝!' : '다음 →'}</button>
      </div>
    </>
  )
}

export default function MyWordsPage() {
  const { my, updateMy } = useProgress()
  const toast = useToast()
  const [form, setForm] = useState(null) // null | { ...EMPTY, id? }
  const [q, setQ] = useState('')
  const [studying, setStudying] = useState(false)
  const words = my.words

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const save = () => {
    const w = { word: form.word.trim(), reading: form.reading.trim(), meaning: form.meaning.trim(), memo: form.memo.trim() }
    if (!w.word || !w.meaning) return
    if (form.id) {
      updateMy(m => ({ ...m, words: m.words.map(x => x.id === form.id ? { ...x, ...w } : x) }))
      toast('수정했어요 ✏️')
    } else {
      if (words.some(x => x.word === w.word)) { toast('이미 단어장에 있는 단어예요'); return }
      updateMy(m => ({ ...m, words: [{ ...w, id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: Date.now() }, ...m.words] }))
      toast('단어장에 담았어요 💜')
    }
    setForm(null)
  }
  const remove = (w) => {
    if (!confirm(`「${w.word}」를 단어장에서 뺄까요?`)) return
    updateMy(m => ({ ...m, words: m.words.filter(x => x.id !== w.id) }))
  }

  const list = words.filter(w => !q || (w.word + w.reading + w.meaning + w.memo).includes(q.trim()))

  return (
    <div className="screen nb">
      <NbHeader title={studying ? '단어장 외우기' : '나만의 단어장'} onBack={studying ? () => setStudying(false) : undefined} />
      <div className="scroll">
        {studying ? <Study words={words} onDone={() => { setStudying(false); toast('단어장 한 바퀴 완료! 🎉') }} /> : (
          <>
            {form ? (
              <div className="nb-card" style={{ marginBottom: 20 }}>
                <div className="nb-fld"><label className="nb-label">단어 *</label><input className="nb-input jp" lang="ja" placeholder="例) 勉強" value={form.word} onChange={set('word')} autoFocus /></div>
                <div className="nb-fld"><label className="nb-label">읽는 법</label><input className="nb-input jp" lang="ja" placeholder="べんきょう" value={form.reading} onChange={set('reading')} /></div>
                <div className="nb-fld"><label className="nb-label">뜻 *</label><input className="nb-input" placeholder="공부" value={form.meaning} onChange={set('meaning')} /></div>
                <div className="nb-fld"><label className="nb-label">메모 (예문·외우는 팁)</label><input className="nb-input" placeholder="毎日日本語を勉強する。" value={form.memo} onChange={set('memo')} /></div>
                <div className="nb-btns">
                  <button className="nb-btn ghost" onClick={() => setForm(null)}>취소</button>
                  <button className="nb-btn" style={{ '--c': 'var(--nb-purple)', color: '#fff' }} disabled={!form.word.trim() || !form.meaning.trim()} onClick={save}>{form.id ? '수정' : '담기'}</button>
                </div>
              </div>
            ) : (
              <div className="nb-btns" style={{ marginBottom: 20 }}>
                <button className="nb-btn" style={{ '--c': 'var(--nb-purple)', color: '#fff' }} onClick={() => setForm({ ...EMPTY })}><Ico.Plus />단어 추가</button>
                <button className="nb-btn ghost" disabled={!words.length} onClick={() => setStudying(true)}>외우기 ({words.length})</button>
              </div>
            )}

            {words.length > 0 && (
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <input className="nb-input" placeholder="단어장에서 찾기" value={q} onChange={e => setQ(e.target.value)} />
              </div>
            )}

            {!words.length ? (
              <div className="nb-empty">
                <span className="big">💜</span>
                아직 단어가 없어요.<br />
                모르는 단어를 직접 추가하거나,<br />플래시카드에서 <b>☆ 단어장에 담기</b>를 눌러 모아보세요.
              </div>
            ) : (
              <div className="nb-list">
                {list.map(w => (
                  <div key={w.id} className="nb-card mw" style={{ marginTop: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mw-w"><Furigana word={w.word} reading={w.reading} /></div>
                      <div className="mw-m">{w.meaning}</div>
                      {w.memo && <div className="mw-memo">{w.memo}</div>}
                      {w.from && <div className="mw-memo">📚 {w.from}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <button className="mw-x" onClick={() => { setForm({ ...EMPTY, ...w }); window.scrollTo(0, 0) }}>수정</button>
                      <button className="mw-x" onClick={() => remove(w)}>삭제</button>
                    </div>
                  </div>
                ))}
                {!list.length && <div className="nb-empty">찾는 단어가 없어요.</div>}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
