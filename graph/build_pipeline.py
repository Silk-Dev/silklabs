import json, csv, re, sys, os, collections
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import normalize

OUT = os.path.dirname(os.path.abspath(__file__))

# ─── Load hierarchy ───
with open(f'{OUT}/tag_hierarchy.json') as f:
    HIERARCHY = json.load(f)

# All tags from hierarchy
ALL_TAGS = sorted(set(
    t for subs in HIERARCHY.values()
    for tags in subs.values() for t in tags
))
print(f'Tags in hierarchy: {len(ALL_TAGS)}', file=sys.stderr)

# ─── Kaggle cache paths ───
CACHE = os.path.expanduser('~/.cache/kagglehub/datasets')
PATHS = {
    'startup_ds': f'{CACHE}/adarsh2626/startup-dataset/versions/1/Startup Dataset.csv',
    'crunchbase': f'{CACHE}/hitashu/crunchbasse-companies-details-dataset/versions/4/Data2.xlsx',
    'indian': f'{CACHE}/srisankargiri/list-of-118-unicorn-startups-in-indiamay-2025/versions/1/tracxn.csv',
    'unicorns': f'{CACHE}/khaiid/startups-by-valuation/versions/1/Startups.csv',
    'yc': f'{CACHE}/ankit07chy/list-of-companies-startup/versions/1/StartUpCompany.csv',
    'top1000': f'{CACHE}/muhammadehsan000/top-1000-global-tech-companies-dataset-2024/versions/1/Top 1000 technology companies.csv',
    'ai_funding': f'{CACHE}/prajitdatta/ai-company-and-startup-funding-database/versions/1/ai_startup_funding_database_2014_2025.csv',
    'crunchbase2013': f'{CACHE}/mauriciocap/crunchbase2013/versions/1/crunchbase-companies.csv',
    'yc_2024': f'{OUT}/yc_2012_2024.zip',
    'tunisia': f'{OUT}/tunisia_startups.zip',
    'unicorns_2026': f'{OUT}/global_unicorns_2026.zip',
    'yc_jobs': f'{OUT}/y-combinator-jobs-enriched.zip',
    'shark_tank': f'{OUT}/shark-tank-us-dataset.zip',
    'startup_pitches': f'{OUT}/startup-pitches.zip',
    'techcrunch': f'{OUT}/techcrunch-startup-battlefield-companies.zip',
}

# ─── 1. Parse each dataset ───
def parse_startup_ds():
    companies = []
    with open(PATHS['startup_ds'], encoding='latin-1') as f:
        for row in csv.DictReader(f):
            name = (row.get('Company Name') or row.get('Company Name ') or '').strip()
            desc = (row.get('Description') or row.get('Description ') or '').strip()
            loc = (row.get('HQ Location') or row.get('HQ Location ') or '').strip()
            if not name:
                continue
            companies.append({
                'name': name, 'description': desc[:800], 'location': loc,
                'types': [], 'source': 'startup_ds'
            })
    print(f'  Startup DS: {len(companies)}', file=sys.stderr)
    return companies

def parse_crunchbase():
    import openpyxl
    wb = openpyxl.load_workbook(PATHS['crunchbase'])
    sheet = wb.active
    companies = []
    for row in sheet.iter_rows(min_row=2, values_only=True):
        name = str(row[1] or '').strip()
        if not name:
            continue
        name = re.sub(r'^\d+\.\s*', '', name).strip()
        types_str = str(row[2] or '').strip()
        types = [t.strip() for t in types_str.split(',') if t.strip()]
        hq = str(row[3] or '').strip()
        hq_parts = [p.strip() for p in hq.split(',')]
        country = hq_parts[-1] if len(hq_parts) >= 2 else ''
        companies.append({
            'name': name, 'description': ' '.join(types[:5]),
            'location': hq, 'country': country,
            'types': types, 'source': 'crunchbase'
        })
    print(f'  Crunchbase: {len(companies)}', file=sys.stderr)
    return companies

def parse_indian():
    companies = []
    with open(PATHS['indian'], encoding='latin-1') as f:
        content = f.read().replace('\xa0', ' ')
    for row in csv.DictReader(content.splitlines()):
        name = (row.get('Company') or '').strip()
        sector = (row.get('primary_sector') or '').strip()
        desc = (row.get('company_background') or '').strip()
        loc = (row.get('location') or '').strip()
        if not name:
            continue
        companies.append({
            'name': name, 'description': f'{sector} {desc[:500]}',
            'location': f'{loc}, India', 'country': 'India',
            'types': [sector] if sector else [], 'source': 'indian'
        })
    print(f'  Indian: {len(companies)}', file=sys.stderr)
    return companies

def parse_unicorns():
    companies = []
    with open(PATHS['unicorns'], encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            name = (row.get('\ufeffCompany') or row.get('Company') or '').strip()
            industry = (row.get('Industry') or '').strip()
            country = (row.get('Country') or '').strip().replace('\xa0', '').strip()
            if not name:
                continue
            companies.append({
                'name': name, 'description': industry,
                'location': country, 'country': country,
                'types': [industry] if industry else [], 'source': 'unicorns'
            })
    print(f'  Unicorns: {len(companies)}', file=sys.stderr)
    return companies

CAT_PRODUCT = {
    'software': ['enterprise software platform', 'SaaS application', 'business software suite', 'cloud-based platform', 'desktop application', 'API platform'],
    'biotech': ['gene therapy treatment', 'diagnostic test kit', 'therapeutic drug', 'biotech research tool', 'clinical diagnostic platform', 'lab analysis system'],
    'web': ['web application', 'online platform', 'internet service', 'web-based tool', 'SaaS web service', 'digital content platform'],
    'mobile': ['mobile app', 'smartphone application', 'mobile platform', 'iOS/Android app', 'mobile messaging service', 'on-demand mobile service'],
    'enterprise': ['enterprise software suite', 'B2B platform', 'business management tool', 'corporate IT solution', 'enterprise SaaS product', 'business workflow system'],
    'ecommerce': ['online marketplace', 'e-commerce platform', 'shopping app', 'retail technology', 'D2C brand', 'digital storefront'],
    'hardware': ['hardware device', 'IoT product', 'smart gadget', 'embedded system', 'consumer electronics', 'industrial sensor'],
    'advertising': ['ad serving platform', 'marketing automation tool', 'programmatic ad platform', 'audience targeting engine', 'demand-side platform', 'ad measurement tool'],
    'cleantech': ['solar energy system', 'renewable energy solution', 'energy storage product', 'environmental monitoring tool', 'clean energy platform', 'emissions reduction technology'],
    'games_video': ['video game', 'gaming platform', 'streaming service', 'digital media player', 'interactive entertainment', 'AR/VR experience'],
    'medical': ['medical device', 'diagnostic imaging tool', 'patient monitoring system', 'surgical instrument', 'clinical workflow software', 'healthcare hardware'],
    'analytics': ['data analytics platform', 'business intelligence dashboard', 'predictive analytics engine', 'data visualization tool', 'reporting software', 'customer analytics product'],
    'health': ['digital health platform', 'telemedicine app', 'wellness tracker', 'patient portal', 'health management app', 'fitness application'],
    'network_hosting': ['cloud hosting service', 'content delivery network', 'data center solution', 'network infrastructure', 'edge computing platform', 'bandwidth management tool'],
    'finance': ['digital banking app', 'investment platform', 'payment processing tool', 'personal finance app', 'trading platform', 'robo-advisor service'],
    'social': ['social network platform', 'community app', 'content sharing service', 'messaging platform', 'creator economy tool', 'social media management'],
    'security': ['cybersecurity platform', 'antivirus software', 'identity management system', 'threat detection tool', 'encryption product', 'access control solution'],
    'semiconductor': ['microprocessor chip', 'semiconductor component', 'integrated circuit', 'sensor module', 'ASIC design', 'memory chip'],
    'consulting': ['management consulting service', 'technology advisory', 'strategy consulting', 'digital transformation service', 'IT consulting', 'business optimization service'],
    'legal': ['legal document automation', 'e-discovery platform', 'contract management software', 'legal research tool', 'practice management system', 'compliance tracking software'],
    'transportation': ['ride-hailing app', 'logistics platform', 'fleet management system', 'route optimization tool', 'delivery service app', 'supply chain software'],
    'education': ['online learning platform', 'edtech app', 'virtual classroom', 'learning management system', 'educational game', 'course marketplace'],
    'real_estate': ['property listing platform', 'real estate management tool', 'smart building system', 'property analytics software', 'rental marketplace', 'real estate CRM'],
    'nanotech': ['nanomaterial product', 'nanosensor device', 'nanomedicine treatment', 'nanofabrication tool', 'nano-coating material', 'nanoparticle delivery system'],
    'manufacturing': ['manufacturing automation system', 'industrial robot', 'production management software', '3D printing service', 'factory optimization tool', 'supply chain platform'],
    'energy': ['energy management system', 'smart grid solution', 'battery storage product', 'power generation technology', 'energy analytics platform', 'utility management software'],
    'other': ['innovative technology product', 'digital platform', 'tech-enabled service', 'software solution', 'technology product'],
}

def product_phrase(cat, name=''):
    import hashlib
    products = CAT_PRODUCT.get(cat, CAT_PRODUCT['other'])
    # Use company name to vary the product, not just category
    seed = int(hashlib.md5((name or cat).encode()).hexdigest(), 16) % len(products)
    return products[seed]

def parse_crunchbase2013():
    import random, hashlib
    companies = []
    with open(PATHS['crunchbase2013'], encoding='latin-1') as f:
        for row in csv.DictReader(f):
            name = (row.get('name') or '').strip()
            if not name or name == '#NAME?':
                continue
            cat = (row.get('category_code') or '').strip().lower()
            region = (row.get('region') or '').strip()
            city = (row.get('city') or '').strip()
            funding = (row.get('funding_total_usd') or '').strip()
            status = (row.get('status') or '').strip()
            founded = (row.get('founded_at') or '').strip()[:4]
            prod = product_phrase(cat, name)

            # Product/service-focused templates
            rand = int(hashlib.md5(name.encode()).hexdigest(), 16)
            templates = [
                f'Offers {prod} for {cat} use cases.',
                f'A {prod} serving the {cat} industry.',
                f'Provides {prod} designed for {cat} professionals.',
                f'Delivers {prod} with focus on {cat} applications.',
                f'Builds {prod} tailored to {cat} needs.',
                f'{prod} for the {cat} sector.',
            ]
            desc = templates[rand % len(templates)]

            parts = []
            if city and region:
                parts.append(f'Based in {city}, {region}')
            elif region:
                parts.append(f'Based in {region}')
            if founded and founded.isdigit():
                parts.append(f'Founded {founded}')
            if funding and funding != '0' and funding.isdigit():
                try:
                    fval = int(funding)
                    if fval >= 1000000000:
                        parts.append(f'Raised ${fval/1000000000:.1f}B')
                    elif fval >= 1000000:
                        parts.append(f'Raised ${fval/1000000:.0f}M')
                    elif fval >= 1000:
                        parts.append(f'Raised ${fval/1000:.0f}K')
                    else:
                        parts.append(f'Raised ${fval}')
                except:
                    pass
            if status and status != 'operating':
                parts.append(f'Status: {status}')

            desc = desc + ' ' + '. '.join(parts) if parts else desc
            desc = desc.strip(' .')

            companies.append({
                'name': name, 'description': desc[:800],
                'location': f'{city}, {region}, United States'.strip(', ').strip(','),
                'country': 'United States',
                'types': [cat] if cat else [],
                'source': 'crunchbase2013'
            })
    print(f'  Crunchbase2013: {len(companies)}', file=sys.stderr)
    return companies

def parse_yc_jobs():
    import zipfile
    companies = []
    with zipfile.ZipFile(PATHS['yc_jobs']) as zf:
        csv_name = [n for n in zf.namelist() if n.endswith('.csv')][0]
        with zf.open(csv_name) as f:
            for row in csv.DictReader(f.read().decode('utf-8', errors='replace').splitlines()):
                name = (row.get('company_name') or '').strip()
                if not name:
                    continue
                desc = (row.get('short_description') or row.get('long_description') or '').strip()[:500]
                batch = (row.get('batch') or '').strip()
                location = (row.get('company_location') or '').strip()
                loc_parts = [p.strip() for p in location.split(',')]
                country = loc_parts[-1] if len(loc_parts) >= 2 else 'United States'
                if country in ('USA', 'US'):
                    country = 'United States'
                industries = row.get('tags', '').strip()
                companies.append({
                    'name': name, 'description': f'{desc} [{batch}]'[:800],
                    'location': location, 'country': country,
                    'types': [industries] if industries else [],
                    'source': 'yc_jobs'
                })
    print(f'  YC Jobs: {len(companies)}', file=sys.stderr)
    return companies

def parse_shark_tank():
    import zipfile
    companies = []
    with zipfile.ZipFile(PATHS['shark_tank']) as zf:
        csv_name = [n for n in zf.namelist() if n.endswith('.csv')][0]
        with zf.open(csv_name) as f:
            for row in csv.DictReader(f.read().decode('utf-8').splitlines()):
                name = (row.get('Startup Name') or '').strip()
                if not name:
                    continue
                desc = (row.get('Business Description') or '').strip()[:300]
                industry = (row.get('Industry') or '').strip()
                companies.append({
                    'name': name, 'description': f'{industry}: {desc}'[:800],
                    'location': 'United States', 'country': 'United States',
                    'types': [industry] if industry else [],
                    'source': 'shark_tank'
                })
    print(f'  Shark Tank: {len(companies)}', file=sys.stderr)
    return companies

def parse_startup_pitches():
    import zipfile
    companies = []
    with zipfile.ZipFile(PATHS['startup_pitches']) as zf:
        for csv_name in zf.namelist():
            if not csv_name.endswith('.csv'):
                continue
            with zf.open(csv_name) as f:
                for row in csv.DictReader(f.read().decode('utf-8', errors='replace').splitlines()):
                    name = (row.get('company') or '').strip()
                    if not name:
                        continue
                    pitch = (row.get('pitch') or '').strip()[:300]
                    companies.append({
                        'name': name, 'description': pitch[:800],
                        'location': '', 'country': '',
                        'types': [],
                        'source': 'startup_pitches'
                    })
    print(f'  Startup Pitches: {len(companies)}', file=sys.stderr)
    return companies

def parse_techcrunch():
    import zipfile
    companies = []
    with zipfile.ZipFile(PATHS['techcrunch']) as zf:
        csv_name = [n for n in zf.namelist() if n.endswith('.csv')][0]
        with zf.open(csv_name) as f:
            for row in csv.DictReader(f.read().decode('utf-8').splitlines()):
                name = (row.get('name') or '').strip()
                if not name:
                    continue
                industry = (row.get('industry') or '').strip()
                location = (row.get('location') or '').strip()
                funding = (row.get('money_raised') or '').strip()
                status = (row.get('status') or '').strip()
                event = (row.get('event') or '').strip()
                # Extract country from location
                loc_parts = [p.strip() for p in location.split(',')]
                country = loc_parts[-1] if len(loc_parts) >= 2 else ''
                if country in ('USA', 'US', 'U.S.A.'):
                    country = 'United States'
                elif country == 'UK':
                    country = 'United Kingdom'
                desc = f'{industry} startup'
                if funding:
                    desc += f' raised {funding}'
                companies.append({
                    'name': name, 'description': desc[:800],
                    'location': location, 'country': country,
                    'types': [industry] if industry else [],
                    'source': 'techcrunch'
                })
    print(f'  TechCrunch: {len(companies)}', file=sys.stderr)
    return companies

def parse_yc_2024():
    import zipfile
    companies = []
    with zipfile.ZipFile(PATHS['yc_2024']) as zf:
        csv_name = [n for n in zf.namelist() if n.endswith('.csv')][0]
        with zf.open(csv_name) as f:
            for row in csv.DictReader(f.read().decode('utf-8').splitlines()):
                name = (row.get('name') or '').strip()
                if not name:
                    continue
                desc = (row.get('one_liner') or row.get('long_description') or '').strip()
                industry = (row.get('industry') or '').strip()
                subindustry = (row.get('subindustry') or '').strip()
                locations = (row.get('all_locations') or '').strip()
                batch = (row.get('batch') or '').strip()
                # Extract first location and country
                loc_parts = [p.strip() for p in locations.split(',')]
                country = loc_parts[-1] if len(loc_parts) >= 2 else ''
                if country in ('USA', 'US', 'U.S.A.'):
                    country = 'United States'
                elif country == 'UK':
                    country = 'United Kingdom'
                first_loc = loc_parts[0] if loc_parts else ''
                companies.append({
                    'name': name, 'description': f'{industry} {subindustry} {desc} [{batch}]'[:800],
                    'location': locations or first_loc,
                    'country': country,
                    'types': [industry, subindustry],
                    'source': 'yc_2024'
                })
    print(f'  YC 2024: {len(companies)}', file=sys.stderr)
    return companies

def parse_tunisia():
    import zipfile
    companies = []
    with zipfile.ZipFile(PATHS['tunisia']) as zf:
        csv_name = [n for n in zf.namelist() if n.endswith('.csv')][0]
        with zf.open(csv_name) as f:
            content = f.read().decode('utf-8', errors='replace')
            for row in csv.DictReader(content.splitlines()):
                name_col = [c for c in row.keys() if 'name' in c.lower()][0]
                name = (row.get(name_col) or '').strip()
                if not name:
                    continue
                sector = (row.get('sector') or '').strip()
                summary = (row.get('summary') or '').strip()
                year = (row.get('year_founded') or '').strip()
                desc = f'{sector} startup from Tunisia'
                if summary:
                    desc += f': {summary[:200]}'
                companies.append({
                    'name': name, 'description': desc[:800],
                    'location': f'Tunisia',
                    'country': 'Tunisia',
                    'types': [sector] if sector else [],
                    'source': 'tunisia'
                })
    print(f'  Tunisia: {len(companies)}', file=sys.stderr)
    return companies

def parse_unicorns_2026():
    import zipfile
    companies = []
    with zipfile.ZipFile(PATHS['unicorns_2026']) as zf:
        csv_name = [n for n in zf.namelist() if n.endswith('.csv')][0]
        with zf.open(csv_name) as f:
            content = f.read().decode('utf-8', errors='replace')
            for row in csv.DictReader(content.splitlines()):
                name = (row.get('Company') or '').strip()
                if not name:
                    continue
                industry = (row.get('Industry') or '').strip()
                country = (row.get('Country') or '').strip()
                city = (row.get('City') or '').strip()
                year = (row.get('Year_Founded') or '').strip()
                valuation = (row.get('Valuation_Formatted') or '').strip()
                desc = f'{industry} unicorn valued at {valuation}'
                companies.append({
                    'name': name, 'description': desc[:800],
                    'location': f'{city}, {country}'.strip(', '),
                    'country': country,
                    'types': [industry] if industry else [],
                    'source': 'unicorns_2026'
                })
    print(f'  Unicorns 2026: {len(companies)}', file=sys.stderr)
    return companies

def parse_yc():
    companies = []
    with open(PATHS['yc'], encoding='utf-8') as f:
        for row in csv.DictReader(f):
            name = (row.get('CompanyName') or '').strip()
            desc = (row.get('Discription') or '').strip()
            addr = (row.get('Address') or '').strip()
            sector = (row.get('sector') or '').strip()
            industry = (row.get('industry_sector') or '').strip()
            if not name:
                continue
            # Extract country from address
            parts = [p.strip() for p in addr.split(',')]
            country = parts[-1] if len(parts) >= 2 else ''
            if country in ('USA', 'US', 'U.S.A.'):
                country = 'United States'
            elif country == 'UK':
                country = 'United Kingdom'
            companies.append({
                'name': name, 'description': f'{sector} {industry} {desc}'[:800],
                'location': addr, 'country': country,
                'types': [sector, industry], 'source': 'yc'
            })
    print(f'  YC: {len(companies)}', file=sys.stderr)
    return companies

def parse_top1000():
    companies = []
    with open(PATHS['top1000'], encoding='utf-8') as f:
        for row in csv.DictReader(f):
            name = (row.get('Company') or '').strip()
            country = (row.get('Country') or '').strip()
            sector = (row.get('Sector') or '').strip()
            industry = (row.get('Industry') or '').strip()
            market_cap = (row.get('Market Cap') or '').strip()
            if not name:
                continue
            companies.append({
                'name': name,
                'description': f'{sector} {industry} Market Cap: {market_cap}'[:800],
                'location': country, 'country': country,
                'types': [sector, industry], 'source': 'top1000'
            })
    print(f'  Top 1000: {len(companies)}', file=sys.stderr)
    return companies

def parse_ai_funding():
    import collections
    raw = []
    with open(PATHS['ai_funding'], encoding='utf-8') as f:
        for row in csv.DictReader(f):
            name = (row.get('company') or '').strip()
            if not name:
                continue
            sector = (row.get('sector') or '').strip()
            subsector = (row.get('subsector') or '').strip()
            products = (row.get('key_products') or '').strip()
            country = (row.get('hq_country') or '').strip()
            city = (row.get('hq_city') or '').strip()
            round_type = (row.get('round_type') or '').strip()
            amount = (row.get('amount_usd_millions') or '').strip()
            raw.append({
                'name': name, 'sector': sector, 'subsector': subsector,
                'products': products, 'country': country, 'city': city,
                'round': round_type, 'amount': amount,
            })
    # Deduplicate by name, merge descriptions
    merged = collections.OrderedDict()
    for r in raw:
        key = r['name'].lower().strip()
        if key not in merged:
            merged[key] = {
                'name': r['name'],
                'description': f"{r['sector']} {r['subsector']} {r['products']}"[:800],
                'location': f"{r['city']}, {r['country']}".strip(', '),
                'country': r['country'],
                'types': [r['sector'], r['subsector']],
                'source': 'ai_funding'
            }
        else:
            # Merge descriptions
            extra = f"{r['sector']} {r['subsector']} {r['products']}"
            cur = merged[key]['description']
            if extra not in cur:
                merged[key]['description'] = f"{cur} {extra}"[:800]
    companies = list(merged.values())
    print(f'  AI Funding: {len(companies)} unique', file=sys.stderr)
    return companies

# ─── 2. Tag via embedding ───
def tag_companies(companies):
    model = SentenceTransformer('all-MiniLM-L6-v2')
    tag_embs = model.encode(ALL_TAGS, convert_to_numpy=True, show_progress_bar=True)
    tag_embs = normalize(tag_embs, norm='l2')

    texts = []
    for c in companies:
        txt = f"{c['name']} {c.get('description','')}"
        texts.append(txt)

    print(f'  Encoding {len(texts)} companies...', file=sys.stderr)
    all_embs = model.encode(texts, convert_to_numpy=True, show_progress_bar=True, batch_size=256)
    all_embs = normalize(all_embs, norm='l2')

    sims = np.dot(tag_embs, all_embs.T)
    for i, c in enumerate(companies):
        scores = sims[:, i]
        top = np.argsort(-scores)[:5]
        tags = [ALL_TAGS[idx] for idx in top if scores[idx] >= 0.2]
        if not tags:
            tags = [ALL_TAGS[idx] for idx in top[:3] if scores[idx] >= 0.15]
        c['tags'] = tags

    tagged = sum(1 for c in companies if c['tags'])
    print(f'  Tagged: {tagged}/{len(companies)}', file=sys.stderr)
    return companies

# ─── 3. Merge ───
def merge(all_companies, new_batch):
    existing = {c['name'].strip().lower() for c in all_companies}
    added = 0
    for c in new_batch:
        name = c['name'].strip().lower()
        if name not in existing:
            existing.add(name)
            c['id'] = len(all_companies) + 1
            all_companies.append(c)
            added += 1
    return added

# ─── 4. Build graph ───
def build_graph(companies):
    tag_idx = collections.defaultdict(list)
    for i, c in enumerate(companies):
        for t in c.get('tags') or []:
            tag_idx[t].append(i)

    tag_names = sorted(tag_idx.keys())
    name_to_id = {t: i for i, t in enumerate(tag_names)}
    tag_counts = [len(tag_idx[t]) for t in tag_names]

    print(f'Building graph: {len(companies)} companies, {len(tag_names)} tags', file=sys.stderr)

    # 2D positions from embeddings
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embs = model.encode(tag_names, normalize_embeddings=True, show_progress_bar=True)
    import umap
    reducer = umap.UMAP(n_components=2, random_state=42, n_neighbors=15, min_dist=0.3)
    coords = reducer.fit_transform(embs) * 15
    positions = coords.tolist()

    # Edges (co-occurrence)
    edges = []
    for c in companies:
        tags = sorted(set(c.get('tags') or []))
        for a in tags:
            for b in tags:
                if a < b:
                    edges.append((name_to_id[a], name_to_id[b]))
    ew = collections.Counter(edges)
    max_ew = max(ew.values()) if ew else 1
    edge_list = [[a, b, w / max_ew] for (a, b), w in ew.items()]

    # Company data per tag (top 50) with country
    tag_companies = {}
    all_countries_set = set()
    tag_countries = {}
    for t, indices in tag_idx.items():
        tid = name_to_id[t]
        entries = []
        cc = {}
        for i in sorted(indices, key=lambda x: companies[x].get('name',''))[:50]:
            ctry = companies[i].get('country', '')
            if ctry:
                all_countries_set.add(ctry)
                cc[ctry] = cc.get(ctry, 0) + 1
            entries.append({
                "n": companies[i].get('name',''),
                "l": companies[i].get('description','')[:80],
                "c": ctry,
            })
        tag_companies[str(tid)] = entries
        if cc:
            tag_countries[str(tid)] = cc

    # Build flat categories for the legend (from hierarchy)
    tag_to_path = {}
    for top_cat, subs in HIERARCHY.items():
        for sub_cat, tags in subs.items():
            for t in tags:
                tag_to_path[t] = [top_cat, sub_cat]

    categories = []
    for i, t in enumerate(tag_names):
        path = tag_to_path.get(t, [t, t])
        categories.append({
            "name": t, "centroidId": i, "tags": [i], "size": 1,
            "tagNames": [t], "children": [], "count": tag_counts[i],
            "path": path
        })

    # Tag embeddings for browser-side idea matching
    tag_embeddings = embs.tolist() if hasattr(embs, 'tolist') else embs

    graph = {
        "tags": tag_names,
        "tagCounts": tag_counts,
        "nTotal": len(tag_names),
        "positions": positions,
        "edges": edge_list,
        "maxEdgeWeight": max_ew,
        "tagCompanies": tag_companies,
        "totalCompanies": len(companies),
        "categories": categories,
        "hierarchy": HIERARCHY,
        "countries": sorted(all_countries_set),
        "tagCountries": tag_countries,
        "tagEmbs": tag_embeddings,
    }

    with open(f'{OUT}/graph_data.json', 'w') as f:
        json.dump(graph, f, separators=(',', ':'))
    print(f'Saved graph_data.json ({len(tag_names)} tags, {len(edge_list)} edges)', file=sys.stderr)

# ─── Main ───
def filter_israel(companies):
    """Hard filter: remove any company from Israel."""
    filtered = []
    removed = 0
    for c in companies:
        country = (c.get('country') or '').lower().strip()
        location = (c.get('location') or '').lower().strip()
        if country == 'israel' or 'israel' in location:
            removed += 1
            continue
        filtered.append(c)
    if removed:
        print(f'  Filtered {removed} Israeli companies', file=sys.stderr)
    return filtered

if __name__ == '__main__':
    print('Parsing datasets...', file=sys.stderr)
    all_c = []
    merge(all_c, filter_israel(parse_startup_ds()))
    merge(all_c, filter_israel(parse_crunchbase()))
    merge(all_c, filter_israel(parse_indian()))
    merge(all_c, filter_israel(parse_unicorns()))
    merge(all_c, filter_israel(parse_yc()))
    merge(all_c, filter_israel(parse_top1000()))
    merge(all_c, filter_israel(parse_ai_funding()))
    merge(all_c, filter_israel(parse_crunchbase2013()))
    merge(all_c, filter_israel(parse_yc_2024()))
    merge(all_c, filter_israel(parse_tunisia()))
    merge(all_c, filter_israel(parse_unicorns_2026()))
    merge(all_c, filter_israel(parse_yc_jobs()))
    merge(all_c, filter_israel(parse_shark_tank()))
    merge(all_c, filter_israel(parse_startup_pitches()))
    merge(all_c, filter_israel(parse_techcrunch()))
    print(f'Total unique: {len(all_c)}', file=sys.stderr)

    print('\nTagging companies...', file=sys.stderr)
    tag_companies(all_c)

    # Save companies
    with open(f'{OUT}/all_companies.json', 'w') as f:
        json.dump(all_c, f, indent=2)
    print(f'Saved all_companies.json', file=sys.stderr)

    print('\nBuilding graph...', file=sys.stderr)
    build_graph(all_c)
    print('Done!', file=sys.stderr)
