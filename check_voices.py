from dotenv import load_dotenv
from gnani.tts import GnaniTTSClient

load_dotenv()

client = GnaniTTSClient()

voices = GnaniTTSClient.supported_voices(model="timbre-v2.5")

print("Available Timbre v2.5 voices:")
print(voices)