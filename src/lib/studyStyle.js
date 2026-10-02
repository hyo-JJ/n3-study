// 공부 성향 테스트 (Studyme PRD 3.1 온보딩을 JLPT 단어 공부에 맞게 옮김)
// pace: 학습 호흡 — micro(짧게 여러 번) / deep(한 번에 쭉)
// cognitive: 인지 선호 — visual(카드) / textual(목록) / pragmatic(퀴즈)

export const QUESTIONS = [
  {
    key: 'pace',
    tag: '학습 호흡',
    q: '평소 무언가를 배울 때, 더 좋아하는 시간 활용법은?',
    opts: [
      { v: 'deep', t: '각 잡고 앉아서 1시간 이상 푹 빠져서 파고드는 게 좋다' },
      { v: 'micro', t: '이동 시간이나 짬이 날 때 10~15분씩 짧게 치고 빠지는 게 좋다' },
    ],
  },
  {
    key: 'cognitive',
    tag: '인지 선호 1',
    q: '처음 보는 전자기기나 새 보드게임을 시작할 때, 나의 첫 행동은?',
    opts: [
      { v: 'textual', t: '설명서를 꼼꼼히 읽으며 작동 원리부터 이해한다' },
      { v: 'visual', t: '글보다는 그림·사진 위주의 요약본이나 튜토리얼 영상을 본다' },
      { v: 'pragmatic', t: '일단 버튼부터 눌러보고, 막히면 그때 찾아본다' },
    ],
  },
  {
    key: 'cognitive',
    tag: '인지 선호 2',
    q: '벼락치기를 해야 할 때, 머릿속에 가장 잘 들어오는 방식은?',
    opts: [
      { v: 'textual', t: '개념과 배경이 정리된 줄글을 쭉 읽어 내려간다' },
      { v: 'visual', t: '형광펜 칠한 핵심 단어나 요약 표·그림을 본다' },
      { v: 'pragmatic', t: '기출문제나 객관식 퀴즈를 풀면서 오답을 확인한다' },
    ],
  },
  {
    key: 'cognitive',
    tag: '단어 외우기',
    q: '처음 보는 일본어 단어를 외워야 할 때, 제일 손이 가는 방법은?',
    opts: [
      { v: 'textual', t: '단어·읽는 법·뜻을 목록으로 쭉 훑으며 눈에 익힌다' },
      { v: 'visual', t: '카드 한 장에 단어 하나씩, 크게 보면서 넘긴다' },
      { v: 'pragmatic', t: '일단 문제부터 풀어보고 틀린 것만 다시 본다' },
    ],
  },
]

export const PACE = {
  micro: { name: '마이크로', emoji: '⚡', short: '10단어씩 짧게', desc: '한 Day를 10단어씩 끊어서 공부해요. 한 세트가 끝날 때마다 쉬어 갈 수 있어요.' },
  deep: { name: '딥다이브', emoji: '🌊', short: '한 Day를 한 번에', desc: '한 Day의 단어를 끊지 않고 한 번에 쭉 공부해요.' },
}

export const COGNITIVE = {
  visual: { name: '카드형', emoji: '🃏', short: '한 장씩 크게', desc: '단어를 카드에 크게 띄우고, 탭하면 읽는 법과 뜻이 보여요.' },
  textual: { name: '목록형', emoji: '📖', short: '한 화면에 쭉', desc: '단어·읽는 법·뜻을 목록으로 한눈에 보여줘요. 뜻을 가리고 스스로 확인할 수도 있어요.' },
  pragmatic: { name: '퀴즈형', emoji: '🎯', short: '바로 문제로', desc: '설명 없이 곧바로 4지선다 문제로 단어를 만나요. 틀린 단어는 끝에 한 번 더 나와요.' },
}

// 세트 크기 (마이크로형)
export const CHUNK = 10

// 답 목록 → 성향. 인지 선호는 3문항 다수결, 셋 다 다르면 JLPT 단어 문항(마지막)을 따름
export function computeStyle(answers) {
  const pace = answers[0]
  const cog = answers.slice(1)
  const count = {}
  cog.forEach(v => { count[v] = (count[v] || 0) + 1 })
  const top = Object.keys(count).find(v => count[v] >= 2) ?? cog[cog.length - 1]
  return { pace, cognitive: top }
}

export const styleName = (s) => `${PACE[s.pace].name} · ${COGNITIVE[s.cognitive].name}`
