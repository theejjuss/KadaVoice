
import os
from pathlib import Path

from dotenv import load_dotenv
from gnani.tts import GnaniTTSClient, AudioConfig

load_dotenv()

API_KEY = os.getenv("GNANI_API_KEY")

if not API_KEY:
    raise ValueError("GNANI_API_KEY not found in .env")

client = GnaniTTSClient(api_key=API_KEY)

MODEL = "timbre-v2.5"
LANGUAGE = "ml-IN"
SPEED = 0.95

# Six voices for the first audition.
VOICES_TO_TEST = [
    "Kaveri",
    "Ambuja",
    "Asmita",
    "Suhana",
    "Deepak",
    "Pranav"
]

OUTPUT_DIR = Path("assets/voice_auditions")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_TEXT = (
    "നമസ്കാരം! "
    "നിങ്ങളുടെ ഓർഡർ വിജയകരമായി സ്വീകരിച്ചിട്ടുണ്ട്. "
    "ഓർഡർ നൽകിയതിന് വളരെ നന്ദി. "
    "നിങ്ങളുടെ ദിവസം സന്തോഷകരമാകട്ടെ. "
    "നന്ദി... വീണ്ടും വരണേ!"
)

available_voices = GnaniTTSClient.supported_voices(
    model=MODEL
)

print("Available Timbre v2.5 voices:", available_voices)

for voice in VOICES_TO_TEST:

    if voice not in available_voices:
        print(f"Skipping unsupported voice: {voice}")
        continue

    try:

        print(f"\nGenerating sample: {voice}")

        audio = client.synthesize(
            text=SAMPLE_TEXT,
            voice=voice,
            model=MODEL,
            language=LANGUAGE,
            speed=SPEED,
            audio_config=AudioConfig(
                container="wav",
                sample_rate=48000
            )
        )

        output_path = OUTPUT_DIR / f"{voice}.wav"

        output_path.write_bytes(audio)

        print(f"Saved: {output_path}")

    except Exception as error:

        print(f"Failed for {voice}: {error}")

print("\nVoice audition completed!")
print("Listen to the WAV files inside assets/voice_auditions/")
