import { supabase } from './supabase'

// 게임별 랭킹 — 게임마다 최고 기록으로 순위 (짝 맞추기는 걸린 시간이 짧을수록 위)
export const LOWER_IS_BETTER = { match: true }
const better = (game, a, b) => b == null || (LOWER_IS_BETTER[game] ? a < b : a > b)

export const defaultNickname = (user) =>
  (user?.user_metadata?.full_name || user?.user_metadata?.username || '익명').trim().slice(0, 12)

// 네트워크가 끊겨 올리지 못한 기록은 게임별 최고값만 기기에 모아뒀다가 다음 기록·조회 때 함께 보낸다
const pendingKey = (userId) => `game-best-pending:${userId}`
const readPending = (userId) => {
  try { return JSON.parse(localStorage.getItem(pendingKey(userId))) || {} } catch { return {} }
}
const writePending = (userId, v) => {
  try { Object.keys(v).length ? localStorage.setItem(pendingKey(userId), JSON.stringify(v)) : localStorage.removeItem(pendingKey(userId)) } catch {}
}

async function flush(user) {
  const pending = readPending(user.id)
  let ok = true
  for (const [game, value] of Object.entries(pending)) {
    const { error } = await supabase.rpc('submit_game_score', { p_game: game, p_value: value, p_nickname: defaultNickname(user) })
    if (error) { console.error('기록 올리기 실패', error); ok = false; continue }
    delete pending[game]
  }
  writePending(user.id, pending)
  return ok
}

export async function submitScore(user, game, value) {
  if (!user) return false
  const pending = readPending(user.id)
  if (better(game, value, pending[game])) writePending(user.id, { ...pending, [game]: value })
  return flush(user)
}

export async function fetchLeaderboard(user, game, weekly) {
  await flush(user)
  const { data, error } = await supabase.rpc('game_best_leaderboard', { p_game: game, p_weekly: weekly })
  if (error) throw error
  return data
}

export async function setNickname(nickname) {
  const { error } = await supabase.rpc('set_game_nickname', { p_nickname: nickname })
  if (error) throw error
}
