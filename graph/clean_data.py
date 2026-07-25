import json, sys, os

DIR = os.path.dirname(os.path.abspath(__file__))

# ─── 1. Load companies ───
with open(f'{DIR}/all_companies.json') as f:
    companies = json.load(f)
print(f'Companies before: {len(companies)}', file=sys.stderr)

# ─── 2. Filter Israeli companies ───
filtered = []
removed_israel = 0
for c in companies:
    country = (c.get('country') or '').lower().strip()
    location = (c.get('location') or '').lower().strip()
    name = (c.get('name') or '').strip()
    if country == 'israel' or 'israel' in location:
        removed_israel += 1
        print(f'  REMOVE Israel: {name}', file=sys.stderr)
        continue
    filtered.append(c)
print(f'Removed {removed_israel} Israeli companies', file=sys.stderr)
print(f'Companies after: {len(filtered)}', file=sys.stderr)

# Build name→country lookup
name_to_country = {}
for c in filtered:
    nk = c.get('name', '').strip().lower()
    if nk:
        name_to_country[nk] = c.get('country', '')

# ─── 3. Save filtered companies ───
with open(f'{DIR}/all_companies.json', 'w') as f:
    json.dump(filtered, f, indent=2)

# ─── 4. Load graph data ───
with open(f'{DIR}/graph_data.json') as f:
    graph = json.load(f)

# ─── 5. Find Regional tag indices ───
regional_indices = set()
for i, cat in enumerate(graph['categories']):
    path = cat.get('path', [])
    if path and path[0] == 'Regional':
        regional_indices.add(i)
        print(f'  Regional tag idx {i}: {cat["name"]}', file=sys.stderr)

# ─── 6. Build new data without Regional tags, add country ───
new_tc = {}
new_tags_list = []
new_counts_list = []
new_positions_list = []
new_categories_list = []
old_to_new = {}
new_i = 0

for i in range(len(graph['tags'])):
    if i in regional_indices:
        continue
    old_to_new[i] = new_i
    new_tags_list.append(graph['tags'][i])
    new_positions_list.append(graph['positions'][i])

    entries = graph['tagCompanies'].get(str(i), [])
    new_entries = []
    for entry in entries:
        nk = entry.get('n', '').strip().lower()
        country = name_to_country.get(nk, '')
        if country.lower().strip() == 'israel':
            continue
        new_entries.append({'n': entry['n'], 'l': entry.get('l', ''), 'c': country})

    new_tc[str(new_i)] = new_entries
    new_counts_list.append(len(new_entries))

    cat = graph['categories'][i]
    cat['count'] = len(new_entries)
    new_categories_list.append(cat)

    new_i += 1

# Filter and remap edges
new_edges = []
for edge in graph['edges']:
    a, b = edge[0], edge[1]
    w = edge[2] if len(edge) > 2 else 1.0
    if a not in regional_indices and b not in regional_indices:
        new_edges.append([old_to_new[a], old_to_new[b], w])

# ─── 7. Country index per tag ───
tag_countries = {}
for ti_str, entries in new_tc.items():
    cc = {}
    for entry in entries:
        ctry = entry.get('c', '')
        if ctry:
            cc[ctry] = cc.get(ctry, 0) + 1
    if cc:
        tag_countries[ti_str] = cc

all_countries = sorted(set(
    entry.get('c', '')
    for entries in new_tc.values()
    for entry in entries
    if entry.get('c')
))
print(f'Countries: {len(all_countries)}', file=sys.stderr)

# ─── 8. Remove Regional from hierarchy ───
hierarchy = graph['hierarchy']
if 'Regional' in hierarchy:
    del hierarchy['Regional']
    print('Removed Regional from hierarchy', file=sys.stderr)

# ─── 9. Assemble graph ───
graph['tags'] = new_tags_list
graph['tagCounts'] = new_counts_list
graph['positions'] = new_positions_list
graph['edges'] = new_edges
graph['tagCompanies'] = new_tc
graph['categories'] = new_categories_list
graph['hierarchy'] = hierarchy
graph['nTotal'] = len(new_tags_list)
graph['countries'] = all_countries
graph['tagCountries'] = tag_countries
graph['totalCompanies'] = len(filtered)

# ─── 10. Save ───
with open(f'{DIR}/graph_data.json', 'w') as f:
    json.dump(graph, f, separators=(',', ':'))
print(f'Saved: {len(new_tags_list)} tags, {len(new_edges)} edges, {len(all_countries)} countries', file=sys.stderr)
print('Done!', file=sys.stderr)
