import re
from typing import Optional, List, Dict, Any, Tuple
from database import get_product_aliases

# RapidFuzz for typo-tolerant phonetic/spelling alias matching
try:
    from rapidfuzz import fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False


# =====================================================
# 1. NUMBER NORMALIZATION (Malayalam, Manglish, English)
# =====================================================

MALAYALAM_DIGITS = str.maketrans(
    "൦൧൨൩൪൫൬൭൮൯",
    "0123456789"
)

def normalize_digits(text: str) -> str:
    if not text:
        return ""
    return text.translate(MALAYALAM_DIGITS)


NUMBER_WORDS = {
    # Malayalam Script
    "ഒരു": 1.0,
    "ഒന്ന്": 1.0,
    "രണ്ട്": 2.0,
    "മൂന്ന്": 3.0,
    "നാല്": 4.0,
    "അഞ്ച്": 5.0,
    "ആറ്": 6.0,
    "ഏഴ്": 7.0,
    "എട്ട്": 8.0,
    "ഒമ്പത്": 9.0,
    "ഒൻപത്": 9.0,
    "പത്ത്": 10.0,
    "ഇരുപത്": 20.0,
    "മുപ്പത്": 30.0,
    "നാല്പത്": 40.0,
    "അമ്പത്": 50.0,
    "നൂറ്": 100.0,
    "അര": 0.5,
    "കാൽ": 0.25,
    "മുക്കാൽ": 0.75,
    "ഒന്നര": 1.5,
    "രണ്ടര": 2.5,
    "മൂന്നര": 3.5,

    # Manglish Words (Spoken Malayalam in English characters)
    "oru": 1.0,
    "onnu": 1.0,
    "onn": 1.0,
    "randu": 2.0,
    "rand": 2.0,
    "rande": 2.0,
    "moonu": 3.0,
    "moonnu": 3.0,
    "moon": 3.0,
    "naalu": 4.0,
    "naal": 4.0,
    "anju": 5.0,
    "aanch": 5.0,
    "aaru": 6.0,
    "aar": 6.0,
    "ezhu": 7.0,
    "aezhu": 7.0,
    "ettu": 8.0,
    "ett": 8.0,
    "onpathu": 9.0,
    "onbadhu": 9.0,
    "ombathu": 9.0,
    "onpath": 9.0,
    "pathu": 10.0,
    "path": 10.0,
    "irupathu": 20.0,
    "muppathu": 30.0,
    "nalpathu": 40.0,
    "anpathu": 50.0,
    "nooru": 100.0,
    "ara": 0.5,
    "ar": 0.5,
    "kaal": 0.25,
    "kal": 0.25,
    "mukkal": 0.75,
    "mukaal": 0.75,
    "muqqal": 0.75,
    "onnara": 1.5,
    "randara": 2.5,
    "moonara": 3.5,

    # English Words
    "one": 1.0,
    "two": 2.0,
    "three": 3.0,
    "four": 4.0,
    "five": 5.0,
    "six": 6.0,
    "seven": 7.0,
    "eight": 8.0,
    "nine": 9.0,
    "ten": 10.0,
    "eleven": 11.0,
    "twelve": 12.0,
    "fifteen": 15.0,
    "twenty": 20.0,
    "twentyfive": 25.0,
    "fifty": 50.0,
    "hundred": 100.0,
    "half": 0.5,
    "quarter": 0.25,
}


# =====================================================
# 2. UNIT NORMALIZATION (Malayalam, Manglish, English)
# =====================================================

UNIT_ALIASES = {
    # Kilogram
    "kg": "kg",
    "kgs": "kg",
    "kilo": "kg",
    "kilos": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "കിലോ": "kg",
    "കിലോഗ്രാം": "kg",

    # Gram
    "g": "gram",
    "gm": "gram",
    "gms": "gram",
    "gram": "gram",
    "grams": "gram",
    "ഗ്രാം": "gram",

    # Litre
    "l": "litre",
    "litre": "litre",
    "litres": "litre",
    "liter": "litre",
    "liters": "litre",
    "ltr": "litre",
    "litr": "litre",
    "ലിറ്റർ": "litre",

    # Millilitre
    "ml": "ml",
    "millilitre": "ml",
    "milliliter": "ml",
    "മില്ലി": "ml",
    "മില്ലിലിറ്റർ": "ml",

    # Packet
    "packet": "packet",
    "packets": "packet",
    "pack": "packet",
    "packs": "packet",
    "pkt": "packet",
    "പാക്കറ്റ്": "packet",
    "പാക്കറ്റുകൾ": "packet",
    "podi": "packet",
    "poti": "packet",
    "koodu": "packet",

    # Piece
    "piece": "piece",
    "pieces": "piece",
    "പീസ്": "piece",
    "എണ്ണം": "piece",
    "ennam": "piece",
    "enam": "piece",
    "nos": "piece",
    "no": "piece",

    # Bottle
    "bottle": "bottle",
    "bottles": "bottle",
    "ബോട്ടിൽ": "bottle",
    "കുപ്പി": "bottle",
    "kuppi": "bottle",

    # Box / Tin
    "box": "box",
    "boxes": "box",
    "പെട്ടി": "box",
    "tin": "box",
    "dabba": "box",

    # Dozen
    "dozen": "dozen",
    "dozens": "dozen",
    "ഡസൻ": "dozen"
}

UNIT_PATTERN = "|".join(
    re.escape(unit)
    for unit in sorted(UNIT_ALIASES, key=len, reverse=True)
)

NUMBER_WORD_PATTERN = "|".join(
    re.escape(word)
    for word in sorted(NUMBER_WORDS, key=len, reverse=True)
)

NUMBER_PATTERN = (
    rf"\d+(?:\.\d+)?|{NUMBER_WORD_PATTERN}"
)

# Full quantity expression: "2 kg", "oru packet", "3", "half litre"
QUANTITY_PATTERN = re.compile(
    rf"(?<!\w)({NUMBER_PATTERN})\s*({UNIT_PATTERN})?(?!\w)",
    re.IGNORECASE
)

# Standalone unit expression without an explicit leading number (e.g. "packet biscuits", "kilo rice")
STANDALONE_UNIT_PATTERN = re.compile(
    rf"(?<!\w)({UNIT_PATTERN})(?!\w)",
    re.IGNORECASE
)


def parse_number(value: str) -> Optional[float]:
    if not value:
        return None
    val = value.strip().casefold()
    if val in NUMBER_WORDS:
        return float(NUMBER_WORDS[val])
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def parse_unit(value: Optional[str], default_unit: str = "piece") -> str:
    if not value:
        return default_unit
    clean = value.strip().casefold()
    return UNIT_ALIASES.get(clean, default_unit)


# =====================================================
# 3. FILLER WORDS & SAMPLES TO STRIP
# =====================================================

FILLER_WORDS = [
    # Malayalam script
    "എനിക്ക്", "എനിക്കു", "വേണം", "തരണം", "ചേട്ടാ", "ചേച്ചി", "തരൂ", "തരു",
    "ഒന്ന്", "കൂടി", "പിന്നെ", "എന്നും", "മാത്രം", "മതി", "ഉണ്ട്", "ഉണ്ടോ",
    "ഇവിടെ", "നന്ദി", "ഓർഡർ", "സാധനങ്ങൾ", "ലിസ്റ്റ്",
    # Manglish
    "enikku", "enikk", "venam", "tharanam", "tharu", "chetta", "chechi",
    "koodi", "pinne", "mathi", "undu", "undo", "edukku", "edutholu",
    "parayoo", "alla", "aanu", "athrem", "ithrem",
    # English & Command words
    "please", "give", "want", "need", "and", "also", "item", "items", "for",
    "me", "i", "a", "an", "the", "have", "with", "only", "order",
    "add", "more", "change", "remove", "delete", "clear", "what", "is",
    "my", "total", "bill", "how", "much", "to"
]


# =====================================================
# 4. PRODUCT CATALOGUE & SUFFIX NORMALIZATION
# =====================================================

def get_catalogue() -> List[Dict[str, Any]]:
    """Read active product aliases from SQLite."""
    return get_product_aliases() or []


def strip_morphological_suffixes(word: str) -> List[str]:
    """
    Generate candidate base forms by stripping common Malayalam & English suffixes:
    - Conjunction '-um' ('ariyum' -> 'ari', 'soapum' -> 'soap', 'വെളിച്ചെണ്ണയും' -> 'വെളിച്ചെണ്ണ')
    - Malayalam script conjunction '-യും' / '-ഉം'
    - Question/emphasis '-o', '-a', '-e'
    - English plural '-s', '-es' ('biscuits' -> 'biscuit', 'soaps' -> 'soap')
    """
    candidates = [word]
    w = word.strip().casefold()

    # English plural
    if w.endswith("ies") and len(w) > 4:
        candidates.append(w[:-3] + "y")
    elif w.endswith("es") and len(w) > 4:
        candidates.append(w[:-2])
    elif w.endswith("s") and len(w) > 3 and not w.endswith("ss"):
        candidates.append(w[:-1])

    # Manglish '-um' conjunction (e.g., 'ariyum', 'soapum', 'oilum')
    if w.endswith("um") and len(w) > 4:
        candidates.append(w[:-2])
    elif w.endswith("yum") and len(w) > 5:
        candidates.append(w[:-3])

    # Malayalam script '-യും' / '-ഉം'
    if word.endswith("യും") and len(word) > 2:
        candidates.append(word[:-2])
    elif word.endswith("ഉം") and len(word) > 2:
        candidates.append(word[:-2])
    elif word.endswith("ം") and len(word) > 2:
        candidates.append(word[:-1])

    return list(dict.fromkeys(candidates))


# =====================================================
# 5. SMART PRODUCT MATCHING (Exact, Suffix, Fuzzy)
# =====================================================

def find_products(transcript: str, catalogue: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Find catalogue products mentioned in the transcript.
    Supports:
    1. Exact normalized alias matches (multi-word and single-word).
    2. Suffix-normalized matches (e.g. 'biscuits' -> 'biscuit', 'ariyum' -> 'ari').
    3. High-confidence fuzzy alias matching (Rapidfuzz ratio >= 90) for transliteration typos.
    Prefers longer, more specific matches when spans overlap.
    """
    if not transcript or not transcript.strip():
        return []

    if catalogue is None:
        catalogue = get_catalogue()

    text = normalize_digits(transcript).casefold()
    matches: List[Dict[str, Any]] = []

    # 1. Exact alias matches (sorted by alias length descending so multi-word matches first)
    for product in catalogue:
        alias = product.get("normalized_alias")
        if not alias:
            continue
        alias = alias.strip().casefold()
        if not alias or len(alias) < 2:
            continue

        pattern = r"(?<!\w)" + re.escape(alias) + r"(?!\w)"
        for match in re.finditer(pattern, text):
            matches.append({
                "start": match.start(),
                "end": match.end(),
                "product_id": product["product_id"],
                "product": product["name"],
                "default_unit": product.get("default_unit") or "piece",
                "price": product.get("price"),
                "alias": alias,
                "confidence": 1.0,
                "match_type": "exact"
            })

    # 2. Suffix-stripped matches (e.g., 'biscuits' -> 'biscuit', 'soapum' -> 'soap')
    words_with_spans = [(m.group(), m.start(), m.end()) for m in re.finditer(r"\b[\w\u0D00-\u0D7F]+\b", text)]
    for word, w_start, w_end in words_with_spans:
        # Check if already covered by an exact match
        if any(m["start"] <= w_start and m["end"] >= w_end for m in matches):
            continue

        stripped_forms = strip_morphological_suffixes(word)
        for base in stripped_forms:
            if base == word:
                continue
            for product in catalogue:
                alias = (product.get("normalized_alias") or "").strip().casefold()
                if alias == base:
                    matches.append({
                        "start": w_start,
                        "end": w_end,
                        "product_id": product["product_id"],
                        "product": product["name"],
                        "default_unit": product.get("default_unit") or "piece",
                        "price": product.get("price"),
                        "alias": alias,
                        "confidence": 0.95,
                        "match_type": "stemmed"
                    })
                    break

    # 3. High-confidence Fuzzy matching if RapidFuzz is available
    if HAS_RAPIDFUZZ:
        for word, w_start, w_end in words_with_spans:
            if len(word) < 4:
                continue
            # Skip if this word is inside an already matched span
            if any(m["start"] <= w_start and m["end"] >= w_end for m in matches):
                continue
            # Skip common filler words
            if word in FILLER_WORDS or word in NUMBER_WORDS or word in UNIT_ALIASES:
                continue

            best_ratio = 0.0
            best_prod = None
            best_alias = ""

            for product in catalogue:
                alias = (product.get("normalized_alias") or "").strip().casefold()
                if not alias or len(alias) < 4 or " " in alias:
                    continue

                # Token similarity
                ratio = fuzz.ratio(word, alias)
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_prod = product
                    best_alias = alias

            # Strict threshold of 88% similarity to prevent false positives
            if best_ratio >= 88.0 and best_prod:
                matches.append({
                    "start": w_start,
                    "end": w_end,
                    "product_id": best_prod["product_id"],
                    "product": best_prod["name"],
                    "default_unit": best_prod.get("default_unit") or "piece",
                    "price": best_prod.get("price"),
                    "alias": best_alias,
                    "confidence": round(best_ratio / 100.0, 2),
                    "match_type": "fuzzy"
                })

    # Resolve overlapping matches: Prefer longer aliases, higher confidence
    matches.sort(
        key=lambda item: (
            -(item["end"] - item["start"]),
            -item["confidence"],
            item["start"]
        )
    )

    selected: List[Dict[str, Any]] = []
    for match in matches:
        overlaps = any(
            match["start"] < existing["end"] and match["end"] > existing["start"]
            for existing in selected
        )
        if not overlaps:
            selected.append(match)

    return sorted(selected, key=lambda item: item["start"])


# =====================================================
# 6. QUANTITY EXTRACTION & SMART ASSIGNMENT
# =====================================================

def find_quantity_matches(text: str) -> List[Dict[str, Any]]:
    """
    Find all quantity expressions in text (numbers + optional units).
    Also detects standalone units (e.g. 'packet biscuit') implying quantity 1.
    """
    matches = []
    text_norm = normalize_digits(text)

    # 1. Standard explicit quantities ("2 kg", "oru packet", "3")
    for m in QUANTITY_PATTERN.finditer(text_norm):
        raw_num = m.group(1)
        raw_unit = m.group(2)
        matches.append({
            "start": m.start(),
            "end": m.end(),
            "quantity": parse_number(raw_num),
            "unit": parse_unit(raw_unit) if raw_unit else None,
            "has_explicit_number": True
        })

    # 2. Standalone units without an explicit leading number
    for m in STANDALONE_UNIT_PATTERN.finditer(text_norm):
        u_start, u_end = m.start(), m.end()
        # If this unit is already part of an explicit quantity match, skip
        if any(q["start"] <= u_start and q["end"] >= u_end for q in matches):
            continue
        matches.append({
            "start": u_start,
            "end": u_end,
            "quantity": 1.0,  # Implicit quantity 1 when unit is named without a number
            "unit": parse_unit(m.group(1)),
            "has_explicit_number": False
        })

    return sorted(matches, key=lambda x: x["start"])


def assign_quantities(text: str, product_matches: List[Dict[str, Any]]) -> Dict[int, Optional[Dict[str, Any]]]:
    """
    Associate each quantity with the nearest detected product.
    Supports:
        '2 kg rice' (quantity before product)
        'rice 2 kg' (quantity after product)
        '3 soap'    (quantity without unit before product)
        'soap 3'    (quantity without unit after product)
    """
    quantity_matches = find_quantity_matches(text)

    assignments: Dict[int, Optional[Dict[str, Any]]] = {
        idx: None for idx in range(len(product_matches))
    }

    used_quantities = set()
    candidates = []

    for q_idx, q_match in enumerate(quantity_matches):
        for p_idx, product in enumerate(product_matches):
            if q_match["end"] <= product["start"]:
                distance = product["start"] - q_match["end"]
            elif q_match["start"] >= product["end"]:
                distance = q_match["start"] - product["end"]
            else:
                continue

            candidates.append((distance, q_idx, p_idx))

    candidates.sort(key=lambda item: item[0])

    assigned_products = set()

    for distance, q_idx, p_idx in candidates:
        if q_idx in used_quantities or p_idx in assigned_products:
            continue

        q_match = quantity_matches[q_idx]
        assignments[p_idx] = {
            "quantity": q_match["quantity"],
            "unit": q_match["unit"]
        }

        used_quantities.add(q_idx)
        assigned_products.add(p_idx)

    return assignments


# =====================================================
# 7. MAIN ORDER EXTRACTION & DUPLICATE MERGING
# =====================================================

def extract_orders(transcript: str, catalogue: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Main extraction pipeline converting spoken transcript into structured order items.
    """
    if not transcript or not transcript.strip():
        return []

    text = normalize_digits(transcript).casefold()
    product_matches = find_products(text, catalogue=catalogue)

    if not product_matches:
        return []

    quantity_assignments = assign_quantities(text, product_matches)
    orders: List[Dict[str, Any]] = []

    for index, product in enumerate(product_matches):
        quantity_data = quantity_assignments.get(index)

        if quantity_data is None:
            quantity = None
            unit = product["default_unit"]
        else:
            quantity = quantity_data["quantity"]
            unit = quantity_data["unit"] or product["default_unit"]

        orders.append({
            "product_id": product["product_id"],
            "product": product["product"],
            "quantity": quantity,
            "unit": unit,
            "unit_price": product["price"],
            "needs_review": quantity is None or quantity <= 0,
            "confidence": product.get("confidence", 1.0)
        })

    # Merge duplicates if the same product is repeated with identical unit
    consolidated: Dict[Tuple[int, str], Dict[str, Any]] = {}
    for item in orders:
        key = (item["product_id"], item["unit"])
        if key in consolidated and item["quantity"] is not None and consolidated[key]["quantity"] is not None:
            consolidated[key]["quantity"] += item["quantity"]
            consolidated[key]["needs_review"] = False
        else:
            consolidated[key] = dict(item)

    return list(consolidated.values())


# =====================================================
# 8. UNRESOLVED & UNKNOWN PRODUCT DETECTION
# =====================================================

def extract_unresolved_text(transcript: str, catalogue: Optional[List[Dict[str, Any]]] = None) -> List[str]:
    """
    Return transcript portions not matched to known products, quantities, or common fillers.
    Uses regex word boundaries to prevent accidental substring deletion.
    """
    if not transcript or not transcript.strip():
        return []

    text = normalize_digits(transcript)
    product_matches = find_products(text, catalogue=catalogue)

    remaining = list(text)

    # Mask recognized products
    for match in product_matches:
        for pos in range(match["start"], match["end"]):
            remaining[pos] = " "

    unresolved = "".join(remaining)

    # Mask recognized quantities and units
    unresolved = QUANTITY_PATTERN.sub(" ", unresolved)
    unresolved = STANDALONE_UNIT_PATTERN.sub(" ", unresolved)

    # Mask known filler words using word boundaries
    for word in FILLER_WORDS:
        pattern = rf"(?<!\w){re.escape(word)}(?!\w)"
        unresolved = re.sub(pattern, " ", unresolved, flags=re.IGNORECASE)

    segments = re.split(r"[,;.!?\n]+", unresolved)

    cleaned = []
    for segment in segments:
        words = segment.strip().split()
        # Keep segments that have non-trivial content
        if words:
            text_seg = " ".join(words)
            if len(text_seg) > 1:
                cleaned.append(text_seg)

    return cleaned


def extract_unresolved_items(transcript: str, catalogue: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Identify potential unknown grocery items mentioned in the transcript.
    Extracts leftover names and any associated nearby quantity or unit.
    """
    if not transcript or not transcript.strip() or detect_order_command(transcript):
        return []

    text = normalize_digits(transcript)
    product_matches = find_products(text, catalogue=catalogue)
    quantity_matches = find_quantity_matches(text)
    quantity_assignments = assign_quantities(text, product_matches)

    # Determine which quantities were consumed by recognized products
    consumed_quantity_indices = set()
    for q_idx, q_match in enumerate(quantity_matches):
        for p_idx in range(len(product_matches)):
            assigned = quantity_assignments.get(p_idx)
            if assigned and assigned["quantity"] == q_match["quantity"] and assigned["unit"] == q_match["unit"]:
                # Check proximity
                p = product_matches[p_idx]
                if q_match["end"] <= p["start"] + 15 or q_match["start"] >= p["end"] - 15:
                    consumed_quantity_indices.add(q_idx)
                    break

    # Mask recognized products and their consumed quantities
    remaining = list(text)
    for p in product_matches:
        for pos in range(p["start"], p["end"]):
            remaining[pos] = " "

    for q_idx in consumed_quantity_indices:
        q = quantity_matches[q_idx]
        for pos in range(q["start"], q["end"]):
            remaining[pos] = " "

    unresolved_raw = "".join(remaining)

    # Mask known filler words using word boundaries
    for word in FILLER_WORDS:
        pattern = rf"(?<!\w){re.escape(word)}(?!\w)"
        unresolved_raw = re.sub(pattern, " ", unresolved_raw, flags=re.IGNORECASE)

    segments = re.split(r"[,;.!?\n]+", unresolved_raw)
    items = []

    for seg in segments:
        seg_clean = seg.strip()
        if not seg_clean:
            continue

        q_matches = find_quantity_matches(seg_clean)
        clean_name = seg_clean
        qty = 1.0
        unit = "piece"

        if q_matches:
            q = q_matches[0]
            if q["quantity"] is not None:
                qty = q["quantity"]
            if q["unit"]:
                unit = q["unit"]
            clean_name = (seg_clean[:q["start"]] + " " + seg_clean[q["end"]:]).strip()

        clean_name = " ".join(clean_name.split()).strip()

        if clean_name and len(clean_name) >= 2:
            if clean_name.casefold() not in FILLER_WORDS and clean_name.casefold() not in NUMBER_WORDS:
                items.append({
                    "name": clean_name.title(),
                    "quantity": qty,
                    "unit": unit,
                    "needs_review": True,
                    "is_unknown": True
                })

    return items


# =====================================================
# 9. NATURAL LANGUAGE ASSISTANT COMMANDS
# =====================================================

def detect_order_command(transcript: str) -> Optional[Dict[str, Any]]:
    """
    Detect conversational grocery editing commands:
    - "Add two more soaps"
    - "Change rice to 5 kg"
    - "Remove coconut oil"
    - "What is my total"
    - "Clear my order"
    """
    if not transcript or not transcript.strip():
        return None

    text = normalize_digits(transcript).strip().casefold()

    # Clear order
    if re.search(r"\b(clear|delete all|reset|remove all)\b", text):
        return {"action": "clear", "target": "all"}

    # Total inquiry
    if re.search(r"\b(total|how much|bill|amount|ethra aayi|ethrayayi)\b", text):
        return {"action": "query_total"}

    # Remove item
    remove_match = re.search(r"\b(remove|delete|venda|ozhivakku)\s+(.+)", text)
    if remove_match:
        target = remove_match.group(2).strip()
        return {"action": "remove", "target": target}

    # Change quantity
    change_match = re.search(r"\b(change|update|maattu)\s+(.+?)\s+(to|aakku)\s+(.+)", text)
    if change_match:
        target = change_match.group(2).strip()
        new_val = change_match.group(4).strip()
        return {"action": "update", "target": target, "value": new_val}

    return None


# =====================================================
# 10. SPOKEN CUSTOMER NAME EXTRACTION
# =====================================================

def extract_customer_name(transcript: str) -> Optional[str]:
    """
    Detect spoken customer names in Malayalam, Manglish, or English:
    e.g. "Ente peru Rajesh...", "Njan Priya...", "My name is Rahul..."
    """
    if not transcript or not transcript.strip():
        return None

    patterns = [
        r'(?:ente\s+peru|ente\s+per|പേര്|എന്റെ\s+പേര്)\s+([A-Za-z\u0D00-\u0D7F]+)',
        r'(?:my\s+name\s+is|name\s+is|customer\s+name\s+is|customer\s+is|customer)\s+([A-Za-z\u0D00-\u0D7F]+)',
        r'(?:njan|njaan|ഞാൻ)\s+([A-Za-z\u0D00-\u0D7F]+)',
    ]
    for pat in patterns:
        m = re.search(pat, transcript, re.IGNORECASE)
        if m:
            name = m.group(1).strip()
            # Ignore common grocery words
            if name.casefold() not in FILLER_WORDS and name.casefold() not in NUMBER_WORDS and name.lower() not in {'oru', 'onnu', 'randu', 'two', 'one', 'kilo', 'ari', 'venam', 'please', 'kg', 'packet'}:
                return name.capitalize()
    return None

