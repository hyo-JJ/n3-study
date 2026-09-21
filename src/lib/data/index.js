import n3 from './n3.json'

export const LEVELS = {
  N3: {
    label: 'JLPT N3',
    color: '#5856D6',
    days: n3,
  },
  // N4, N5 추가 예정
}

export const getDay = (level, dayNum) => LEVELS[level]?.days[dayNum - 1]
export const getLevelDays = (level) => LEVELS[level]?.days ?? []
