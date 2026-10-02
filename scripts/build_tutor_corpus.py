"""AI Hub '일상생활 및 구어체 한-일 번역 병렬 말뭉치'에서 AI 회화 튜터용 예문을 골라 CSV로 만든다.

  python3 scripts/build_tutor_corpus.py
  → data/tutor_corpus.csv (Supabase 대시보드 > Table Editor > corpus > Import data from CSV)

데이터셋 원본과 CSV는 재배포가 제한되므로 git에 올리지 않는다(.gitignore).
"""
import csv, glob, json, os, random, re, unicodedata

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = glob.glob(os.path.join(ROOT, '027.*', '01.데이터', '*', '라벨링데이터', '*', '*', '*', '*.json'))
OUT = os.path.join(ROOT, 'data', 'tutor_corpus.csv')
PER_SITUATION = 8000
random.seed(27)

# 소분류 → 튜터 상황
SITUATION = {
    '공항, 기내': 'airport', '항공편': 'airport',
    '숙소': 'hotel', '호텔': 'hotel',
    '음식점': 'restaurant', '음식': 'restaurant',
    '쇼핑': 'shopping',
    '관광': 'sightseeing',
    '영화 및 여가': 'leisure', '영화': 'leisure', '음악': 'leisure',
    '운동': 'sports', '관람': 'sports', '스포츠': 'sports',
    '일반': 'daily', '기타': 'daily',
}

# 같은 틀에 고유명사·숫자만 바꾼 문장이 많아서, 그런 부분을 지운 '틀'이 같으면 2개까지만
def template(ja):
    return re.sub(r'[ァ-ヶー・A-Za-z0-9０-９Ａ-Ｚａ-ｚ]+', '*', ja)

HANGUL = re.compile(r'[가-힣]')
KANA = re.compile(r'[ぁ-んァ-ヶ]')

# 길이 제한 + 한국어 칸에 가나, 일본어 칸에 한글이 섞인 줄은 버림
def ok(ko, ja):
    return (4 <= len(ko) <= 60 and 3 <= len(ja) <= 60 and '\n' not in ko + ja
            and HANGUL.search(ko) and not KANA.search(ko) and not HANGUL.search(ja))

buckets = {}
for f in SRC:
    # macOS는 파일 경로를 자모 분리형(NFD)으로 돌려주므로 합쳐서 비교
    direction = 'ja-ko' if '/일한/' in unicodedata.normalize('NFC', f) else 'ko-ja'
    for x in json.load(open(f, encoding='utf-8')):
        if x['대분류'] == '해외영업':
            continue
        sit = SITUATION.get(x['소분류'])
        final = (x.get('최종번역문') or '').strip()
        src = (x.get('원문') or '').strip()
        if not sit or not final or not src:
            continue
        ko, ja = (src, final) if direction == 'ko-ja' else (final, src)
        if not ok(ko, ja):
            continue
        kind = x['중분류'] if x['중분류'] in ('문의', '답변') else ''
        buckets.setdefault(sit, []).append((x['ID'], direction, x['소분류'], kind, ko, ja))

rows, seen_ko = [], set()
for sit, items in sorted(buckets.items()):
    random.shuffle(items)
    per_template, picked = {}, 0
    for item in items:
        _, _, _, _, ko, ja = item
        t = template(ja)
        if ko in seen_ko or per_template.get(t, 0) >= 2:
            continue
        per_template[t] = per_template.get(t, 0) + 1
        seen_ko.add(ko)
        rows.append((sit, *item))
        picked += 1
        if picked >= PER_SITUATION:
            break
    print(f'{sit:12} 후보 {len(items):7,} → {picked:,}')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8', newline='') as fp:
    w = csv.writer(fp)
    w.writerow(['situation', 'source_id', 'direction', 'topic', 'kind', 'ko', 'ja'])
    w.writerows(rows)
print(f'총 {len(rows):,}문장 → {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT) / 1e6:.1f}MB)')
