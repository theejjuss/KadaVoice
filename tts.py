
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from gnani.tts import GnaniTTSClient, AudioConfig


# ==========================================
# 1. CONFIGURATION
# ==========================================

load_dotenv()

API_KEY = os.getenv(
    "GNANI_API_KEY",
    "vach_1ytE2CY5X2Pmb1LHPTAP4M0q9Q9huHgDsmbJLnJtkESUx3s75LZb5jKrVxJgcWwAyG7Qb6g7YQQDXMAYlNQCuIA2iIlFHs9d_ba7e44d4ec804fce73dad90888f40e68"
)

client = None
if API_KEY:
    try:
        client = GnaniTTSClient(api_key=API_KEY)
    except Exception as e:
        print(f"Warning: GnaniTTSClient startup initialization error: {e}")


DEFAULT_VOICE = "Ambuja"

AVAILABLE_VOICES = {
    "Ambuja": "Ambuja",
    "Deepak": "Deepak"
}

DEFAULT_MODEL = "timbre-v2.5"
DEFAULT_LANGUAGE = "ml-IN"
DEFAULT_SPEED = 1.05
DEFAULT_SAMPLE_RATE = 24000

OUTPUT_DIRECTORY = Path("assets/generated_audio")


# ==========================================
# 2. MALAYALAM PRODUCT VOCABULARY
# ==========================================

PRODUCT_NAMES = {
    "Rice": "അരി",
    "Raw Rice": "പച്ചരി",
    "Boiled Rice": "പുഴുക്കലരി",
    "Sugar": "പഞ്ചസാര",
    "Cooking Oil": "എണ്ണ",
    "Coconut Oil": "വെളിച്ചെണ്ണ",
    "Sunflower Oil": "സൺഫ്ലവർ ഓയിൽ",
    "Milk": "പാൽ",
    "Curd": "തൈര്",
    "Bengal Gram": "കടല",
    "Green Gram": "ചെറുപയർ",
    "Toor Dal": "തുവരപ്പരിപ്പ്",
    "Urad Dal": "ഉഴുന്നുപരിപ്പ്",
    "Chilli Powder": "മുളകുപൊടി",
    "Turmeric Powder": "മഞ്ഞൾപ്പൊടി",
    "Coriander Powder": "മല്ലിപ്പൊടി",
    "Salt": "ഉപ്പ്",
    "Jaggery": "ശർക്കര",
    "Tea Powder": "ചായപ്പൊടി",
    "Coffee Powder": "കാപ്പിപ്പൊടി",
    "Potato": "ഉരുളക്കിഴങ്ങ്",
    "Onion": "സവാള",
    "Tomato": "തക്കാളി",
    "Eggs": "മുട്ട",
    "Bread": "ബ്രെഡ്",
    "Biscuits": "ബിസ്കറ്റ്",
    "Wheat": "ഗോതമ്പ്",
    "Rava": "റവ",
    "Puttu Powder": "പുട്ടുപൊടി",
    "Appam Powder": "അപ്പം പൊടി",
    "Black Pepper": "കുരുമുളക്",
    "Cardamom": "ഏലയ്ക്ക",
    "Cinnamon": "പട്ട",
    "Cloves": "ഗ്രാമ്പൂ",
    "Mustard": "കടുക്",
    "Tamarind": "പുളി",
    "Ghee": "നെയ്യ്",
    "Butter": "വെണ്ണ",
    "Garlic": "വെളുത്തുള്ളി",
    "Ginger": "ഇഞ്ചി",
    "Noodles": "നൂഡിൽസ്",
    "Detergent Powder": "അലക്കുപൊടി",
    "Dishwash Soap": "പാത്രം കഴുകുന്ന സോപ്പ്",
    "Bathing Soap": "കുളിക്കുന്ന സോപ്പ്",
    "Toothpaste": "ടൂത്ത് പേസ്റ്റ്",
    "Shampoo": "ഷാംപൂ"
}


# ==========================================
# 3. MALAYALAM UNIT VOCABULARY
# ==========================================

UNIT_NAMES = {
    "kg": "കിലോ",
    "gram": "ഗ്രാം",
    "litre": "ലിറ്റർ",
    "ml": "മില്ലി ലിറ്റർ",
    "packet": "പാക്കറ്റ്",
    "piece": "എണ്ണം",
    "bottle": "കുപ്പി",
    "box": "പെട്ടി",
    "dozen": "ഡസൻ"
}


# ==========================================
# 4. QUANTITY FORMATTING
# ==========================================

def format_quantity(quantity):

    quantity = float(quantity)

    special_quantities = {
        0.25: "കാൽ",
        0.5: "അര",
        0.75: "മുക്കാൽ",
        1.0: "ഒരു",
        1.5: "ഒന്നര",
        2.0: "രണ്ട്",
        3.0: "മൂന്ന്",
        4.0: "നാല്",
        5.0: "അഞ്ച്"
    }

    rounded_quantity = round(quantity, 2)

    if rounded_quantity in special_quantities:
        return special_quantities[rounded_quantity]

    return (
        f"{rounded_quantity:.2f}"
        .rstrip("0")
        .rstrip(".")
    )


# ==========================================
# 5. BUILD MALAYALAM ORDER CONFIRMATION
# ==========================================

import hashlib
import shutil

# ==========================================
# 5. BUILD MALAYALAM ORDER CONFIRMATION
# ==========================================

def build_order_confirmation(
    orders,
    customer_name=None
):

    if not orders:
        return (
            "ക്ഷമിക്കണം, ഓർഡറിൽ സാധനങ്ങളൊന്നും "
            "ചേർത്തിട്ടില്ല. ദയവായി വീണ്ടും ശ്രമിക്കുക."
        )

    clean_name = (customer_name or "").strip()
    is_walk_in = clean_name.casefold() in {
        "walk-in customer", "walkin customer", "walk in customer", "walk-in", "walkin", ""
    }

    if not is_walk_in:
        greeting = f"നമസ്കാരം {clean_name}."
    else:
        greeting = "നമസ്കാരം."

    message_parts = []
    limit = 3

    for item in orders[:limit]:
        product = item.get("product", "")
        quantity = item.get("quantity", 1)
        unit = item.get("unit", "piece")

        malayalam_product = PRODUCT_NAMES.get(product, product)
        malayalam_unit = UNIT_NAMES.get(unit, unit)
        spoken_quantity = format_quantity(quantity)

        message_parts.append(f"{spoken_quantity} {malayalam_unit} {malayalam_product}")

    items_message = ", ".join(message_parts)

    if len(orders) > limit:
        confirmation = (
            f"{greeting} {items_message} ഉൾപ്പെടെ {len(orders)} സാധനങ്ങൾ "
            f"നിങ്ങളുടെ ഓർഡറിൽ ചേർത്തിട്ടുണ്ട്. ഓർഡർ നൽകിയതിന് നന്ദി! വീണ്ടും വരണേ!"
        )
    else:
        confirmation = (
            f"{greeting} {items_message} "
            f"നിങ്ങളുടെ ഓർഡറിൽ ചേർത്തിട്ടുണ്ട്. ഓർഡർ നൽകിയതിന് നന്ദി! വീണ്ടും വരണേ!"
        )

    return confirmation


# ==========================================
# 6. CACHING & SPEECH SYNTHESIS (GNANI TIMBRE)
# ==========================================

def get_audio_cache_path(text: str, voice: str = DEFAULT_VOICE) -> Path:
    """Deterministic hash path for cached TTS audio files."""
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    cache_key = f"{voice}:{DEFAULT_MODEL}:{DEFAULT_LANGUAGE}:{DEFAULT_SPEED}:{text.strip()}".encode("utf-8")
    digest = hashlib.sha256(cache_key).hexdigest()[:20]
    return OUTPUT_DIRECTORY / f"tts_{voice}_{digest}.wav"


def is_audio_cached(text: str, voice: str = DEFAULT_VOICE) -> bool:
    """Return True if the synthesized audio for this text/voice already exists on disk."""
    cache_file = get_audio_cache_path(text, voice)
    return cache_file.is_file() and cache_file.stat().st_size > 500


import threading

_active_events: dict[str, threading.Event] = {}
_events_lock = threading.Lock()


def generate_speech(
    text,
    voice=DEFAULT_VOICE,
    output_path=None
):

    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    if voice not in AVAILABLE_VOICES:
        raise ValueError(
            f"Unsupported voice: {voice}. "
            f"Choose from {list(AVAILABLE_VOICES.keys())}"
        )

    OUTPUT_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True
    )

    # 1. Check instant hash cache (0 ms if already synthesized)
    cached_file = get_audio_cache_path(text, voice)
    if cached_file.is_file() and cached_file.stat().st_size > 500:
        if output_path and Path(output_path) != cached_file:
            shutil.copyfile(cached_file, output_path)
            return str(output_path)
        return str(cached_file)

    cache_key = cached_file.name

    # 2. Check if another thread/background task is already synthesizing this
    with _events_lock:
        if cache_key in _active_events:
            event = _active_events[cache_key]
            is_worker = False
        else:
            event = threading.Event()
            _active_events[cache_key] = event
            is_worker = True

    if not is_worker:
        # Wait for the in-progress synthesis to finish
        event.wait(timeout=15.0)
        if cached_file.is_file() and cached_file.stat().st_size > 500:
            if output_path and Path(output_path) != cached_file:
                shutil.copyfile(cached_file, output_path)
                return str(output_path)
            return str(cached_file)

    # 3. Primary worker: synthesize using Gnani Timbre at optimized 24kHz and 1.05 speed
    global client
    if client is None:
        if not API_KEY:
            raise ValueError("GNANI_API_KEY is not set.")
        client = GnaniTTSClient(api_key=API_KEY)

    try:
        audio = client.synthesize(
            text=text,
            voice=voice,
            model=DEFAULT_MODEL,
            language=DEFAULT_LANGUAGE,
            speed=DEFAULT_SPEED,
            audio_config=AudioConfig(
                container="wav",
                sample_rate=DEFAULT_SAMPLE_RATE
            )
        )

        if not audio:
            raise RuntimeError(
                "Gnani TTS returned empty audio."
            )

        # Save to cache
        cached_file.write_bytes(audio)

    finally:
        with _events_lock:
            event.set()
            _active_events.pop(cache_key, None)

    if output_path and Path(output_path) != cached_file:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(cached_file, output_path)
        return str(output_path)

    return str(cached_file)


# ==========================================
# 7. TEST KADAVOICE VOICE RESPONSE
# ==========================================

if __name__ == "__main__":

    sample_orders = [
        {
            "product": "Rice",
            "quantity": 2,
            "unit": "kg"
        },
        {
            "product": "Coconut Oil",
            "quantity": 0.5,
            "unit": "litre"
        },
        {
            "product": "Sugar",
            "quantity": 0.75,
            "unit": "kg"
        },
        {
            "product": "Milk",
            "quantity": 1,
            "unit": "litre"
        }
    ]

    try:

        message = build_order_confirmation(
            orders=sample_orders
        )

        print("\nKadaVoice Malayalam Response:")
        print(message)

        for voice_name in AVAILABLE_VOICES:

            print(f"\nGenerating {voice_name} voice...")

            audio_path = generate_speech(
                text=message,
                voice=voice_name
            )

            print(f"Audio saved at: {audio_path}")

        print("\nVoice testing completed!")

    except Exception as error:

        print(f"\nTTS Error: {error}")
