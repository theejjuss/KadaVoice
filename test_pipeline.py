
from stt import transcribe_audio
from order_processor import extract_orders
from database import create_tables, save_order

audio_path = "assets/recordings/recording.wav"

try:
    # Create database tables
    create_tables()

    # Step 1: Speech recognition
    print("1. Recognizing speech...")

    transcript = transcribe_audio(audio_path)

    print("\nTranscript:")
    print(transcript)

    # Step 2: Extract grocery items
    print("\n2. Extracting order...")

    orders = extract_orders(transcript)

    # Step 3: Save order
    if orders:
        print("\n3. Saving order...")

        order_id = save_order(orders)

        print(f"\nOrder saved successfully!")
        print(f"Order ID: {order_id}")

        for item in orders:
            print(
                f"{item['product']} - "
                f"{item['quantity']} "
                f"{item['unit']}"
            )

    else:
        print("No grocery items detected. Nothing saved.")

except Exception as error:
    print(f"Pipeline Error: {error}")
