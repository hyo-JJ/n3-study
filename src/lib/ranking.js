import { supabase } from './supabase'

// 게임 포인트: 맞힌 개수 × 10P, 짝 맞추기는 빨리 끝낼수록 보너스
export const POINT = 10
export const gamePoints = {
  speed: (correct) => correct * POINT,
  reading: (correct) => correct * POINT,
  match: (pairs, secs) => pairs * POINT + Math.max(0, 30 - secs) * 2,
}

export const defaultNickname = (user) =>
  (user?.user_metadata?.full_name || user?.user_metadata?.username || '익명').trim().slice(0, 12)

// 네트워크가 끊겨 적립에 실패한 포인트는 기기에 모아뒀다가 다음 적립·조회 때 함께 보낸다
const pendingKey = (userId) => `game-points-pending:${userId}`
const readPending = (userId) => {
  try { return Number(localStorage.getItem(pendingKey(userId))) || 0 } catch { return 0 }
}
const writePending = (userId, v) => {
  try { v ? localStorage.setItem(pendingKey(userId), String(v)) : localStorage.removeItem(pendingKey(userId)) } catch {}
}

export async function addPoints(user, points) {
  if (!user) return false
  const total = readPending(user.id) + points
  if (!total) return true
  writePending(user.id, total)
  const { error } = await supabase.rpc('add_game_points', { p_points: total, p_nickname: defaultNickname(user) })
  if (error) { console.error('포인트 적립 실패', error); return false }
  writePending(user.id, 0)
  return true
}

export async function fetchLeaderboard(user, weekly) {
  await addPoints(user, 0)
  const { data, error } = await supabase.rpc('game_leaderboard', { p_weekly: weekly })
  if (error) throw error
  return data
}

export async function setNickname(nickname) {
  const { error } = await supabase.rpc('set_game_nickname', { p_nickname: nickname })
  if (error) throw error
}
