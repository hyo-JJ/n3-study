import n5 from './n5.json'
import n4 from './n4.json'
import n3 from './n3.json'

// dailyLimit: true면 하루에 Day 1개만 (다음 Day는 테스트 통과 다음 날 열림)
export const LEVELS = {
  N5: {
    label: 'JLPT N5',
    color: '#34C759',
    days: n5,
  },
  N4: {
    label: 'JLPT N4',
    color: '#FF9500',
    days: n4,
  },
  N3: {
    label: 'JLPT N3',
    color: '#5856D6',
    days: n3,
    dailyLimit: true,
  },
}

export const getDay = (level, dayNum) => LEVELS[level]?.days[dayNum - 1]
export const getLevelDays = (level) => LEVELS[level]?.days ?? []
