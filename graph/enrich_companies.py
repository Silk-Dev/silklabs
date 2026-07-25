import json, sys, time, re, os, requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter

DIR = os.path.dirname(os.path.abspath(__file__))
SEARXNG_URL = "http://localhost:8888/search"
WORKERS = 8  # concurrent requests
BATCH_SAVE = 500

S = requests.Session()
S.headers.update({'X-Forwarded-For': '127.0.0.1'})

# ─── Load companies ───
with open(f'{DIR}/all_companies.json') as f:
    companies = json.load(f)
print(f'Total companies: {len(companies)}', file=sys.stderr)

# ─── Find companies with generic descriptions ───
generic_patterns = [
    r'^[a-z]+ company based in',
    r'^[a-z]+ startup based in',
    r'^[a-z]+ company from',
]
generic = []
for c in companies:
    desc = c.get('description', '').strip().lower()
    src = c.get('source', '')
    if any(re.match(p, desc) for p in generic_patterns):
        generic.append(c)
    elif src == 'crunchbase2013' and (len(desc) < 30 or not desc):
        generic.append(c)

print(f'Companies to enrich: {len(generic)}', file=sys.stderr)

def search_company(name):
    try:
        r = S.get(SEARXNG_URL, params={
            'q': f'"{name}" startup company',
            'format': 'json',
            'language': 'en',
        }, timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()
        results = data.get('results', [])
        if not results:
            return None
        for res in results:
            if 'wikipedia.org' in res.get('url', ''):
                return res.get('content', '')[:300]
        for res in results:
            content = res.get('content', '')
            if len(content) > 50 and not any(x in content.lower() for x in ['test your', 'internet speed', 'dictionary', 'sign in']):
                return content[:300]
        return results[0].get('content', '')[:200]
    except:
        return None

enriched = 0
skipped = 0
start = time.time()

with ThreadPoolExecutor(max_workers=WORKERS) as pool:
    fut_to_idx = {}
    for i, c in enumerate(generic):
        name = c.get('name', '').strip()
        if not name:
            skipped += 1
            continue
        fut = pool.submit(search_company, name)
        fut_to_idx[fut] = i

    for fut in as_completed(fut_to_idx):
        i = fut_to_idx[fut]
        c = generic[i]
        snippet = fut.result()
        if snippet:
            old = c.get('description', '')
            c['description'] = f"{old} | {snippet}"[:800]
            enriched += 1
        else:
            skipped += 1

        if (enriched + skipped) % BATCH_SAVE == 0:
            with open(f'{DIR}/all_companies.json', 'w') as f:
                json.dump(companies, f, indent=2)
            elapsed = time.time() - start
            rate = (enriched + skipped) / elapsed
            eta = (len(generic) - enriched - skipped) / rate if rate > 0 else 0
            print(f'  {enriched+skipped}/{len(generic)} enriched={enriched} skipped={skipped} rate={rate:.1f}/s eta={eta:.0f}s', file=sys.stderr)

with open(f'{DIR}/all_companies.json', 'w') as f:
    json.dump(companies, f, indent=2)
elapsed = time.time() - start
print(f'\nDone! {enriched} enriched, {skipped} skipped in {elapsed:.0f}s ({elapsed/60:.1f}min)', file=sys.stderr)
