// 가입할 때 정해진 내 레벨에 따라 열리는 단어 레벨과 하루 제한
// - 내 레벨: 하루에 1 Day씩
// - 내 레벨보다 쉬운 레벨: 순서대로 제한 없이
// - 내 레벨보다 어려운 레벨은 바로 아래 레벨을 모두 끝내면 하나씩 열림 (하루 1 Day씩)
//   예) N3 학생: N3 완주 → N2, N2 완주 → N1
export const ORDER = ['N5', 'N4', 'N3', 'N2', 'N1']
const rank = (lv) => ORDER.indexOf(lv)

let myLevel = 'N3'
export const setMyLevel = (lv) => { if (ORDER.includes(lv)) myLevel = lv }
export const getMyLevel = () => myLevel

export const isDaily = (level) => rank(level) >= 0 && rank(level) >= rank(myLevel)
export const basicLevels = () => ORDER.filter(l => rank(l) < rank(myLevel))
export const upperLevels = () => ORDER.filter(l => rank(l) > rank(myLevel))
export const visibleLevels = () => ORDER
// 이 레벨을 열려면 끝내야 하는 바로 아래 레벨 (내 레벨 이하는 처음부터 열려 있음)
export const prevLevel = (level) => (rank(level) > rank(myLevel) ? ORDER[rank(level) - 1] : null)
