
import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

API_KEY = os.getenv(
    "GNANI_API_KEY",
    "vach_1ytE2CY5X2Pmb1LHPTAP4M0q9Q9huHgDsmbJLnJtkESUx3s75LZb5jKrVxJgcWwAyG7Qb6g7YQQDXMAYlNQCuIA2iIlFHs9d_ba7e44d4ec804fce73dad90888f40e68"
)

API_URL = "https://api.vachana.ai/stt/v3"


def transcribe_audio(audio_path, language_code="ml-IN"):

    if not API_KEY:
        raise ValueError("Gnani API key not found in .env")

    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    headers = {
        "X-API-Key-ID": API_KEY
    }

    payload = {
        "language_code": language_code,
        "preferred_language": language_code,
        "format": "transcribe",
        "itn_native_numerals": "true"
    }

    with open(audio_path, "rb") as audio_file:

        files = {
            "audio_file": (
                os.path.basename(audio_path),
                audio_file
            )
        }

        response = requests.post(
            API_URL,
            headers=headers,
            data=payload,
            files=files,
            timeout=60
        )

    response.raise_for_status()

    result = response.json()

    if not result.get("success"):
        raise RuntimeError(f"Gnani API error: {result}")

    return result.get("transcript", "")


if __name__ == "__main__":

    audio_path = "assets/recordings/recording.wav"

    try:
        transcript = transcribe_audio(audio_path)

        print("\nRecognized Speech:")
        print(transcript)

    except Exception as error:
        print(f"\nError: {error}")
