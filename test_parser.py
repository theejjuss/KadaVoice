from order_processor import extract_orders, extract_unresolved_text

test_cases = [
    # 1. English + numbers
    "2 kg boiled rice, 1 kg sugar and 1 shampoo",

    # 2. Quantity after product name
    "rice 2 kg and sugar 1 kg",

    # 3. Product without quantity
    "oru soap venam",

    # 4. Similar product names — Boiled Rice must not become Rice
    "2 kg puzhukkalari",

    # 5. Product not in the catalogue
    "2 kg rice and 1 packet detergent",
]

for i, transcript in enumerate(test_cases, start=1):
    print(f"\nTEST {i}: {transcript}")
    print("Detected:", extract_orders(transcript))
    print("Unresolved:", extract_unresolved_text(transcript))