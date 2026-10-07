import n5 from './n5.json'
import n4 from './n4.json'
import n3 from './n3.json'
import n2 from './n2.json'
import n1 from './n1.json'

// 하루 1 Day 제한은 레벨이 아니라 가입한 학생의 레벨에 따라 정해짐 (lib/level.js)
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
  },
  N2: {
    label: 'JLPT N2',
    color: '#FF2D55',
    days: n2,
  },
  N1: {
    label: 'JLPT N1',
    color: '#AF52DE',
    days: n1,
  },
}

export const getDay = (level, dayNum) => LEVELS[level]?.days[dayNum - 1]
export const getLevelDays = (level) => LEVELS[level]?.days ?? []
