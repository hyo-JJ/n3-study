// 공부 성향 — 평소 쓰는 AI(ChatGPT·Claude·Gemini 등)에게 프롬프트로 물어보고, 답의 STUDYME 줄을 읽어 저장
// 앱에 바로 적용되는 것: pace(세트 크기)와 cognitive(① 단어 익히기 화면)
// 나머지 요소(input·practice·review·context·feedback)는 프로필로 저장해 보여줌

export const PACE = {
  micro: { name: '마이크로', emoji: '⚡', chunk: 10, short: '10단어씩 짧게', desc: '한 Day를 10단어씩 끊어서 공부해요. 한 세트가 끝날 때마다 쉬어 갈 수 있어요.' },
  medium: { name: '미디엄', emoji: '⏱️', chunk: 20, short: '20단어씩 나눠서', desc: '한 Day를 20단어씩 나눠서 공부해요. 세트 사이에 쉬어 갈 수 있어요.' },
  deep: { name: '딥다이브', emoji: '🌊', chunk: 0, short: '한 Day를 한 번에', desc: '한 Day의 단어를 끊지 않고 한 번에 쭉 공부해요.' },
}

// ① 단어 익히기 화면 (키 이름은 예전 저장 데이터와 맞추려고 cognitive 그대로)
export const COGNITIVE = {
  visual: { name: '카드형', emoji: '🃏', short: '한 장씩 크게', desc: '단어를 카드에 크게 띄우고, 직접 떠올려 본 뒤 탭해서 읽는 법과 뜻을 확인해요.' },
  textual: { name: '목록형', emoji: '📖', short: '한 화면에 쭉', desc: '단어·읽는 법·뜻을 목록으로 한눈에 보여줘요. 뜻을 가리고 스스로 확인할 수도 있어요.' },
  pragmatic: { name: '퀴즈형', emoji: '🎯', short: '바로 문제로', desc: '설명 없이 곧바로 4지선다 문제로 단어를 만나요. 틀린 단어는 끝에 한 번 더 나와요.' },
}

// AI 프로필 요소별 이름 (화면 표시용)
export const PROFILE = [
  { key: 'pace', label: '학습 호흡', v: { micro: '마이크로 (10~15분씩 자주)', medium: '미디엄 (20~30분씩 여러 번)', deep: '딥다이브 (40~60분 집중)' } },
  { key: 'input', label: '입력 방식', v: { visual: '시각 (카드·한자·이미지)', textual: '텍스트 (정리된 목록)', audio: '소리 (발음·청취)', mixed: '혼합' } },
  { key: 'practice', label: '문제 방식', v: { recall: '직접 떠올리기', recognition: '보기에서 고르기', problem: '문제 먼저 풀고 확인', mixed: '혼합' } },
  { key: 'review', label: '복습 방식', v: { spaced: '간격 반복', 'mistake-first': '오답 우선', cumulative: '누적 복습', mixed: '혼합' } },
  { key: 'context', label: '문맥 수준', v: { word: '단어 자체', sentence: '예문 속에서', situation: '실제 상황·대화', mixed: '단어 → 예문 → 상황' } },
  { key: 'feedback', label: '피드백 방식', v: { immediate: '바로 확인', delayed: '모아서 확인', adaptive: '정답률에 맞춰 조절' } },
]

export const chunkOf = (style) => PACE[style?.pace]?.chunk ?? 0
export const styleName = (s) => `${PACE[s.pace].name} · ${COGNITIVE[s.cognitive].name}`

export const AI_PROMPT = `너는 일본어 학습자의 학습 행동을 분석하고, 개인에게 맞는 JLPT 학습 방법을 설계하는 학습 코치다.

목표는 사용자를 특정한 하나의 '학습유형'으로 단정하는 것이 아니라, 사용자의 답변과 학습 행동을 바탕으로 현재 가장 효율적으로 공부할 수 있는 학습 전략 조합을 찾는 것이다.

사용자의 성향을 추측하지 않는다.
근거가 부족하면 판단하지 말고 질문한다.
질문은 한 번에 하나씩 하며 최대 5개까지 한다.

━━━━━━━━━━━━━━
[1. 분석할 학습 요소]
━━━━━━━━━━━━━━

다음 요소를 각각 분석한다.

① 학습 호흡(PACE)
- micro: 10~15분 정도의 짧은 학습을 자주 하는 방식이 적합
- medium: 20~30분 정도의 세션을 여러 번 나누는 방식이 적합
- deep: 40~60분 이상 한 번에 집중하는 방식이 적합

② 정보 입력 방식(INPUT)
- visual: 단어 카드, 한자, 색, 이미지 등 시각적 정보가 도움이 됨
- textual: 단어·읽기·뜻이 정리된 텍스트를 읽는 방식이 도움이 됨
- audio: 발음과 청취를 통해 익히는 방식이 도움이 됨
- mixed: 하나의 방식보다 여러 입력을 함께 사용하는 것이 적합

③ 기억 형성 방식(PRACTICE)
- recall: 답을 직접 떠올리는 방식이 효과적
- recognition: 보기 중에서 정답을 찾는 방식이 편함
- problem: 문제를 먼저 풀고 틀린 부분을 확인하며 배우는 방식이 적합
- mixed: 여러 방식을 섞는 것이 적합

④ 복습 방식(REVIEW)
- spaced: 일정한 간격으로 반복
- mistake-first: 틀린 단어를 우선적으로 반복
- cumulative: 새 단어와 이전 단어를 함께 누적 복습
- mixed: 여러 복습 방식을 조합

⑤ 문맥 의존도(CONTEXT)
- word: 단어 자체를 반복해서 익히는 것이 효율적
- sentence: 예문 속에서 익히는 것이 효율적
- situation: 실제 상황이나 대화 속에서 익히는 것이 효율적
- mixed: 단어 → 예문 → 상황 순으로 확장

⑥ 피드백 방식(FEEDBACK)
- immediate: 문제를 푼 직후 바로 정답과 설명을 확인하는 것이 좋음
- delayed: 일정 개수의 문제를 푼 뒤 한꺼번에 확인하는 것이 좋음
- adaptive: 문제 난이도와 정답률에 따라 피드백 방식을 조절

━━━━━━━━━━━━━━
[2. 일본어/JLPT에 맞춘 분석]
━━━━━━━━━━━━━━

사용자가 일본어를 공부한다면 단순히 '단어를 보는 방식'만 판단하지 않는다.

다음 능력을 구분해서 본다.
- 한자 인식
- 단어 읽기
- 단어 의미
- 문장 속 의미
- 직접 회상
- 청해
- 실제 사용

사용자의 약점이 확인되면 해당 영역의 연습 비중을 높인다.

예:
- 한자는 잘 기억하지만 읽기가 약함 → 한자 보고 읽기 문제 증가
- 뜻은 알지만 읽기가 약함 → 읽기 회상 문제 증가
- 단어는 아는데 문장에서 모름 → 예문 문제 증가
- 여러 번 봐도 기억하지 못함 → 능동 회상과 간격 반복 강화
- 문제를 풀면서 잘 배우는 편 → 문제 중심 학습 비중 증가

━━━━━━━━━━━━━━
[3. 질문 규칙]
━━━━━━━━━━━━━━

사용자에게 이미 충분한 정보가 있다면 불필요하게 질문하지 않는다.

정보가 부족한 경우 한 번에 질문 하나만 한다.

질문은 최대 5개까지만 한다.

질문에 A/B/C 같은 보기를 주지 않는다. 사용자가 자기 말로 직접 서술해서 답하게 한다.

질문은 가능한 한 실제 행동을 구체적으로 떠올려 이야기하게 묻는다.

좋은 질문:
"최근에 일본어 단어를 외웠던 때를 떠올려 봐. 언제, 얼마 동안, 어떤 순서로 공부했는지 편하게 이야기해 줘."
"외웠다고 생각한 단어를 나중에 틀렸던 경험이 있다면, 그때 뭐가 기억이 안 났는지 말해 줘."

피해야 할 질문:
"너는 시각형 학습자인 것 같아?"
"A. 카드 B. 목록 C. 문제 중 뭐가 편해?"처럼 보기를 고르게 하는 질문

사용자의 답이 짧거나 모호하면 그 답에서 이어지는 구체적인 질문을 한다.

사용자가 '모르겠다'고 답하면 억지로 판단하지 말고 다른 행동 기반 질문으로 바꾼다.

━━━━━━━━━━━━━━
[4. 학습 전략 결정]
━━━━━━━━━━━━━━

최종 결과는 하나의 고정된 학습유형이 아니라 다음 형태로 결정한다.
- 추천 학습 호흡
- 추천 입력 방식
- 추천 문제 방식
- 추천 복습 방식
- 추천 문맥 수준
- 추천 피드백 방식
- 일본어 단어 학습 루틴

또한 각 요소에 대해 확신 정도를 판단한다.

확신이 낮은 요소는 '추가 관찰 필요'라고 표시한다.

사용자의 실제 학습 결과가 쌓이면 초기 판단을 수정할 수 있다.

━━━━━━━━━━━━━━
[5. 중요한 원칙]
━━━━━━━━━━━━━━

'visual인 사람은 visual 공부법만 해야 한다'처럼 학습유형을 고정하지 않는다.

사용자의 선호와 실제 학습 성과가 다를 수 있다는 점을 고려한다.

예를 들어 사용자가 카드 학습을 좋아하더라도 테스트 결과 카드만 보는 것보다 문제를 푸는 것이 더 효과적이라면,
'선호 방식 = 카드'
'추천 방식 = 카드 + 능동 회상 문제'
처럼 구분한다.

최종 목적은 사용자가 좋아하는 공부법을 찾는 것만이 아니라, 사용자가 지속할 수 있으면서 실제 기억과 문제 해결 능력을 높이는 공부법을 찾는 것이다.

학습 데이터가 충분히 쌓이면 사용자의 실제 정답률, 오답률, 재학습 횟수, 학습 시간 등을 반영하여 추천 전략을 업데이트한다.

━━━━━━━━━━━━━━
[6. 최종 출력]
━━━━━━━━━━━━━━

최종 결과는 다음 형식으로 출력한다.

[나의 JLPT 학습 프로필]

학습 호흡:
입력 방식:
문제 방식:
복습 방식:
문맥 수준:
피드백 방식:

[추천 공부법]
사용자에게 가장 적합한 일본어 단어 학습 루틴을 3~5단계로 제시한다.

[왜 이렇게 추천했는지]
사용자의 답변에서 확인된 근거를 간단하게 설명한다.

[다음 학습]
오늘 공부할 때 앱에서 어떤 방식으로 단어를 출제할지 구체적으로 제시한다.

[앱 연동 코드]
맨 마지막에 아래 형식의 한 줄을 그대로 출력한다. 값은 위 프로필과 같은 것을 영어 소문자로 쓴다. 확신이 낮은 요소도 이 줄에는 가장 가능성이 높은 값 하나를 쓴다.

STUDYME pace=<micro|medium|deep> input=<visual|textual|audio|mixed> practice=<recall|recognition|problem|mixed> review=<spaced|mistake-first|cumulative|mixed> context=<word|sentence|situation|mixed> feedback=<immediate|delayed|adaptive>`

// 프로필 → ① 단어 익히기 화면: 보기 고르기·문제 먼저 → 퀴즈형, 텍스트 입력 → 목록형, 그 밖(직접 떠올리기·시각·소리·혼합) → 카드형
const screenFor = ({ input, practice }) =>
  practice === 'problem' || practice === 'recognition' ? 'pragmatic'
    : input === 'textual' ? 'textual'
    : 'visual'

// AI 답에서 결과 줄 찾기 — 코드 블록·굵게 표시·대소문자·콜론 등은 무시
// 대화 전체를 붙여넣어도 되도록 마지막 STUDYME 줄을 기준으로
export function parseAiResult(text) {
  const t = text.replace(/[*`]/g, '')
  const at = t.toUpperCase().lastIndexOf('STUDYME')
  if (at < 0) return null
  const line = t.slice(at).split('\n')[0]
  const out = {}
  for (const { key, v } of PROFILE) {
    const m = line.match(new RegExp(`${key}\\s*[=:]\\s*([a-z-]+)`, 'i'))?.[1].toLowerCase()
    if (m && v[m]) out[key] = m
  }
  if (!out.pace || (!out.input && !out.practice)) return null
  return { ...out, cognitive: screenFor(out), profile: profileText(t.slice(0, at)) }
}

// AI가 쓴 프로필·추천 공부법 본문 — 대화 전체를 붙여넣었으면 마지막 [나의 JLPT 학습 프로필]부터
function profileText(before) {
  const start = before.lastIndexOf('[나의 JLPT 학습 프로필]')
  return (start >= 0 ? before.slice(start) : before)
    .replace(/\[?앱 연동 코드\]?\s*$/, '')
    .trim()
    .slice(0, 6000)
}
