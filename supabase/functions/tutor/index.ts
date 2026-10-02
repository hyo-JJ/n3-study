// AI 회화 튜터 — Supabase Edge Function
// 데이터셋(corpus)에서 비슷한 실제 예문을 찾아 Claude에게 함께 주고, 상황극 대화 + 내 문장 첨삭을 돌려준다.
//
// 배포: Supabase 대시보드 > Edge Functions > Deploy a new function > 이름 tutor > 이 파일 내용 붙여넣기
// 키:   Edge Functions > Secrets 에 ANTHROPIC_API_KEY 추가 (키가 없으면 예문만 돌려줌)
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// 상황별 역할 — AI가 맡는 사람과 장면
const SITUATIONS: Record<string, string> = {
  airport: "공항 체크인 카운터 직원 또는 기내 승무원 (탑승 수속, 수하물, 좌석, 기내 서비스)",
  hotel: "호텔 프런트 직원 (체크인·체크아웃, 객실 문제, 주변 안내)",
  restaurant: "음식점 점원 (자리 안내, 주문, 추천 메뉴, 계산)",
  shopping: "가게 점원 (물건 찾기, 사이즈·색상, 가격, 결제·면세)",
  sightseeing: "관광지 안내소 직원이나 길에서 만난 현지인 (길 묻기, 명소 추천, 교통)",
  leisure: "영화·음악·취미 이야기를 나누는 일본인 친구",
  sports: "운동·스포츠 관람 이야기를 나누는 일본인 친구",
  daily: "일상 이야기를 나누는 일본인 친구 (반말·구어체도 자연스럽게)",
};

const FEEDBACK: Record<string, string> = {
  immediate: "학습자는 매 턴 바로 첨삭받는 것을 선호한다.",
  adaptive: "학습자는 틀렸을 때만 첨삭받는 것을 선호한다. 자연스러우면 첨삭을 비워 둔다.",
  delayed: "학습자는 대화가 끝난 뒤 첨삭을 몰아서 본다. 첨삭은 똑같이 꼼꼼히 쓰되, 대화 중 답장에서는 틀린 점을 언급하지 않는다.",
};

const SYSTEM = `너는 한국인 일본어 학습자를 위한 일본어 회화 튜터다. 정해진 상황에서 역할을 맡아 일본어로 대화하면서, 학습자가 쓴 문장을 자연스러운 일본어로 고쳐 준다.

대화 규칙
- 맡은 역할의 사람으로서 자연스럽고 짧게(1~2문장) 말한다. 대화를 이어갈 수 있도록 상대에게 묻거나 다음 행동을 유도한다.
- 학습자 수준(JLPT)에 맞는 어휘를 쓰고, 너무 어려운 표현은 피한다.
- 학습자는 일본어로 답하는 것이 원칙이지만, 한국어로 쓰거나 섞어 써도 된다. 그때는 그 뜻을 일본어로 어떻게 말하는지 첨삭에서 알려 준다.
- 함께 주어지는 <examples>는 실제 한-일 대화 데이터셋에서 찾은 비슷한 문장이다. 자연스러운 표현을 고를 때 참고하되, 어색한 예문은 따라 하지 않는다.

첨삭 규칙
- 학습자의 마지막 발화를 평가한다. 문법·어휘·높임말(상황에 맞는 존댓말/반말)·자연스러움을 본다.
- 고칠 점이 있으면 corrected에 자연스러운 일본어 문장을, explanation에 왜 그렇게 고쳤는지 한국어로 짧게(1~3문장) 쓴다.
- 이미 자연스러우면 needed를 false로 하고 corrected와 explanation은 빈 문자열로 둔다.
- 학습자의 첫 발화가 아직 없으면(대화 시작) needed는 false다.

hint는 학습자가 다음에 말할 만한 일본어 문장 하나(쉬운 것)와 그 뜻을 "일본어 (한국어 뜻)" 형식으로 쓴다.`;

const SCHEMA = {
  type: "object",
  properties: {
    reply_ja: { type: "string", description: "역할로서 하는 일본어 대사" },
    reply_ko: { type: "string", description: "reply_ja의 한국어 뜻" },
    correction: {
      type: "object",
      properties: {
        needed: { type: "boolean" },
        corrected: { type: "string" },
        explanation: { type: "string" },
      },
      required: ["needed", "corrected", "explanation"],
      additionalProperties: false,
    },
    hint: { type: "string" },
  },
  required: ["reply_ja", "reply_ko", "correction", "hint"],
  additionalProperties: false,
};

type Turn = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "METHOD" }, 405);

  // 로그인한 사용자만 — 사용자 토큰으로 DB를 부르므로 search_corpus의 로그인 확인도 그대로 적용됨
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "AUTH" }, 401);

  const { situation, turns = [], level = "N3", feedback = "immediate" } = await req.json() as {
    situation: string; turns: Turn[]; level?: string; feedback?: string;
  };
  if (!SITUATIONS[situation]) return json({ error: "SITUATION" }, 400);
  // 대화가 너무 길어지지 않게 최근 20턴만, 한 턴은 300자까지
  const history = turns.slice(-20).map((t) => ({ role: t.role, content: String(t.content).slice(0, 300) }));
  const lastUser = [...history].reverse().find((t) => t.role === "user")?.content ?? "";

  const { data: examples, error } = await supabase.rpc("search_corpus", { p_situation: situation, p_query: lastUser || null, p_limit: 6 });
  if (error) console.error("search_corpus", error);
  const ex = examples ?? [];

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "NO_KEY", examples: ex });

  // 이번 턴에만 쓰는 정보(예문·학습자 설정)는 마지막 user 메시지에 붙여 앞부분 캐시를 유지
  const context = `<situation>${SITUATIONS[situation]}</situation>
<learner>JLPT ${level} 수준. ${FEEDBACK[feedback] ?? FEEDBACK.immediate}</learner>
<examples>
${ex.map((e: { ko: string; ja: string }) => `- ${e.ja} (${e.ko})`).join("\n")}
</examples>`;
  const messages: Anthropic.Beta.BetaMessageParam[] = history.length && history[0].role === "user"
    ? history.map((t) => ({ role: t.role, content: t.content }))
    : [{ role: "user", content: "(대화 시작)" }, ...history.map((t) => ({ role: t.role, content: t.content }))];
  const last = messages[messages.length - 1];
  if (last.role !== "user") messages.push({ role: "user", content: "(학습자가 아무 말도 하지 않음 — 대화를 이어가 줘)" });
  messages[messages.length - 1] = { role: "user", content: `${context}\n\n학습자: ${messages[messages.length - 1].content}` };

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages,
    });

    if (res.stop_reason === "refusal") return json({ error: "REFUSAL", examples: ex });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "EMPTY", examples: ex }, 502);
    return json({ ...JSON.parse(text.text), examples: ex.slice(0, 3) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "BUSY", examples: ex }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "BAD_KEY", examples: ex }, 500);
    if (e instanceof Anthropic.APIError) { console.error("claude", e.status, e.message); return json({ error: "API", examples: ex }, 502); }
    console.error(e);
    return json({ error: "SERVER", examples: ex }, 500);
  }
});
