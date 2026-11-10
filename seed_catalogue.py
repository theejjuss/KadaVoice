import sys
sys.stdout.reconfigure(encoding='utf-8')
from database import add_product, get_products, get_connection, insert_product_aliases, normalize_alias

# Comprehensive starter catalogue and aliases for a Kerala grocery shop
STAPLE_PRODUCTS = [
    {
        "name": "Rice",
        "malayalam_name": "അരി",
        "category": "Rice and Cereals",
        "default_unit": "kg",
        "price": 42.0,
        "aliases": [
            "ari", "rice", "ചോറ് അരി", "choru ari", "matta", "matta rice", "ponni rice", "വെള്ള അരി", "kuthari"
        ]
    },
    {
        "name": "Boiled Rice",
        "malayalam_name": "പുഴുക്കലരി",
        "category": "Rice and Cereals",
        "default_unit": "kg",
        "price": 44.0,
        "aliases": [
            "puzhukkalari", "boiled rice", "കുത്തരി", "ചുവന്ന അരി"
        ]
    },
    {
        "name": "Sugar",
        "malayalam_name": "പഞ്ചസാര",
        "category": "Essentials",
        "default_unit": "kg",
        "price": 46.0,
        "aliases": [
            "panchasara", "sugar", "panjasara", "പഞ്ചസാര"
        ]
    },
    {
        "name": "Coconut Oil",
        "malayalam_name": "വെളിച്ചെണ്ണ",
        "category": "Oils",
        "default_unit": "litre",
        "price": 180.0,
        "aliases": [
            "velichenna", "coconut oil", "thenga enna", "velichena", "വെളിച്ചെണ്ണ", "എണ്ണ", "enna", "oil", "kera"
        ]
    },
    {
        "name": "Sunflower Oil",
        "malayalam_name": "സൺഫ്ലവർ ഓയിൽ",
        "category": "Oils",
        "default_unit": "litre",
        "price": 135.0,
        "aliases": [
            "sunflower oil", "cooking oil", "refined oil", "സൺഫ്ലവർ ഓയിൽ", "savari enna"
        ]
    },
    {
        "name": "Bathing Soap",
        "malayalam_name": "കുളിക്കുന്ന സോപ്പ്",
        "category": "Household",
        "default_unit": "piece",
        "price": 38.0,
        "aliases": [
            "soap", "soaps", "soappu", "സോപ്പ്", "കുളിക്കുന്ന സോപ്പ്", "bathing soap", "body soap", "lux", "lifebuoy", "dove", "hamam", "santoor"
        ]
    },
    {
        "name": "Detergent Soap",
        "malayalam_name": "അലക്കു സോപ്പ്",
        "category": "Household",
        "default_unit": "piece",
        "price": 25.0,
        "aliases": [
            "detergent", "washing soap", "surf excel", "rin", "ariel", "detergent soap", "അലക്കു സോപ്പ്", "അലക്കുപൊടി", "detergent powder"
        ]
    },
    {
        "name": "Dishwash Bar",
        "malayalam_name": "പാത്രം കഴുകുന്ന സോപ്പ്",
        "category": "Household",
        "default_unit": "piece",
        "price": 20.0,
        "aliases": [
            "dishwash", "dishwash bar", "vim bar", "vim", "pril", "പാത്രം കഴുകുന്ന സോപ്പ്", "dish wash"
        ]
    },
    {
        "name": "Biscuits",
        "malayalam_name": "ബിസ്കറ്റ്",
        "category": "Snacks",
        "default_unit": "packet",
        "price": 30.0,
        "aliases": [
            "biscuit", "biscuits", "biskut", "bisket", "ബിസ്കറ്റ്", "ബിസ്ക്കറ്റ്", "marie", "parle g", "good day", "cookies"
        ]
    },
    {
        "name": "Shampoo",
        "malayalam_name": "ഷാംപൂ",
        "category": "Personal Care",
        "default_unit": "bottle",
        "price": 120.0,
        "aliases": [
            "shampoo", "shaampoo", "ഷാംപൂ", "clinic plus", "head and shoulders", "shampu"
        ]
    },
    {
        "name": "Milk",
        "malayalam_name": "പാൽ",
        "category": "Dairy",
        "default_unit": "litre",
        "price": 54.0,
        "aliases": [
            "paal", "milk", "പാൽ", "milma", "milma paal", "cow milk"
        ]
    },
    {
        "name": "Atta",
        "malayalam_name": "ആട്ട",
        "category": "Flour and Grains",
        "default_unit": "kg",
        "price": 52.0,
        "aliases": [
            "wheat flour", "atta", "aata", "ആട്ട", "godambu podi", "ashirvad"
        ]
    },
    {
        "name": "Maida",
        "malayalam_name": "മൈദ",
        "category": "Flour and Grains",
        "default_unit": "kg",
        "price": 45.0,
        "aliases": [
            "maida", "മൈദ", "all purpose flour"
        ]
    },
    {
        "name": "Tea Powder",
        "malayalam_name": "ചായപ്പൊടി",
        "category": "Beverages",
        "default_unit": "packet",
        "price": 95.0,
        "aliases": [
            "tea powder", "tea", "chaya podi", "chayapodi", "ചായപ്പൊടി", "kannan devan", "red label"
        ]
    },
    {
        "name": "Coffee Powder",
        "malayalam_name": "കാപ്പിപ്പൊടി",
        "category": "Beverages",
        "default_unit": "packet",
        "price": 110.0,
        "aliases": [
            "coffee powder", "coffee", "kaapi podi", "കാപ്പിപ്പൊടി", "bru", "nescafe"
        ]
    },
    {
        "name": "Salt",
        "malayalam_name": "ഉപ്പ്",
        "category": "Spices and Condiments",
        "default_unit": "packet",
        "price": 18.0,
        "aliases": [
            "salt", "uppu", "ഉപ്പ്", "tata salt"
        ]
    },
    {
        "name": "Chilli Powder",
        "malayalam_name": "മുളകുപൊടി",
        "category": "Spices and Condiments",
        "default_unit": "packet",
        "price": 55.0,
        "aliases": [
            "chilli powder", "mulaku podi", "മുളകുപൊടി", "red chilli powder", "eastern mulaku"
        ]
    },
    {
        "name": "Turmeric Powder",
        "malayalam_name": "മഞ്ഞൾപ്പൊടി",
        "category": "Spices and Condiments",
        "default_unit": "packet",
        "price": 40.0,
        "aliases": [
            "turmeric powder", "manjal podi", "മഞ്ഞൾപ്പൊടി", "haldi"
        ]
    },
    {
        "name": "Toor Dal",
        "malayalam_name": "തുവരപ്പരിപ്പ്",
        "category": "Pulses",
        "default_unit": "kg",
        "price": 160.0,
        "aliases": [
            "toor dal", "parippu", "പരിപ്പ്", "sambhar parippu", "തുവരപ്പരിപ്പ്", "dal"
        ]
    },
    {
        "name": "Green Gram",
        "malayalam_name": "ചെറുപയർ",
        "category": "Pulses",
        "default_unit": "kg",
        "price": 125.0,
        "aliases": [
            "green gram", "cherupayar", "ചെറുപയർ", "moong"
        ]
    },
    {
        "name": "Bengal Gram",
        "malayalam_name": "കടല",
        "category": "Pulses",
        "default_unit": "kg",
        "price": 95.0,
        "aliases": [
            "kadala", "കടല", "chana", "black chana"
        ]
    },
    {
        "name": "Onion",
        "malayalam_name": "സവാള",
        "category": "Vegetables",
        "default_unit": "kg",
        "price": 35.0,
        "aliases": [
            "onion", "onions", "savala", "savola", "സവാള", "big onion", "ulli"
        ]
    },
    {
        "name": "Potato",
        "malayalam_name": "ഉരുളക്കിഴങ്ങ്",
        "category": "Vegetables",
        "default_unit": "kg",
        "price": 38.0,
        "aliases": [
            "potato", "potatoes", "urulakkizhangu", "ഉരുളക്കിഴങ്ങ്", "aloo"
        ]
    },
    {
        "name": "Tomato",
        "malayalam_name": "തക്കാളി",
        "category": "Vegetables",
        "default_unit": "kg",
        "price": 32.0,
        "aliases": [
            "tomato", "tomatoes", "thakkali", "തക്കാളി"
        ]
    },
    {
        "name": "Eggs",
        "malayalam_name": "മുട്ട",
        "category": "Dairy and Poultry",
        "default_unit": "piece",
        "price": 6.5,
        "aliases": [
            "egg", "eggs", "mutta", "മുട്ട", "kozhi mutta"
        ]
    },
    {
        "name": "Bread",
        "malayalam_name": "ബ്രെഡ്",
        "category": "Bakery",
        "default_unit": "packet",
        "price": 40.0,
        "aliases": [
            "bread", "ബ്രെഡ്", "bun"
        ]
    },
    {
        "name": "Toothpaste",
        "malayalam_name": "ടൂത്ത് പേസ്റ്റ്",
        "category": "Personal Care",
        "default_unit": "piece",
        "price": 65.0,
        "aliases": [
            "toothpaste", "ടൂത്ത് പേസ്റ്റ്", "colgate", "close up", "paste"
        ]
    }
]


def seed_database():
    print("=== SEEDING AND ENRICHING KADAVOICE CATALOGUE ===")

    existing_products = {p["name"].casefold(): p for p in get_products()}

    for p in STAPLE_PRODUCTS:
        name_key = p["name"].casefold()

        if name_key in existing_products:
            prod = existing_products[name_key]
            prod_id = prod["product_id"]

            with get_connection() as conn:
                # Update price if currently None
                if prod["price"] is None and p["price"] is not None:
                    conn.execute("UPDATE products SET price = ? WHERE product_id = ?", (p["price"], prod_id))
                    print(f"Updated price for {p['name']}: Rs.{p['price']}", flush=True)

                # Insert any missing aliases
                all_aliases = [p["name"], p["malayalam_name"], *p["aliases"]]
                insert_product_aliases(conn, prod_id, all_aliases)
                print(f"Enriched aliases for: {p['name']}", flush=True)

        else:
            try:
                prod_id = add_product(
                    name=p["name"],
                    malayalam_name=p["malayalam_name"],
                    category=p["category"],
                    default_unit=p["default_unit"],
                    price=p["price"],
                    aliases=p["aliases"]
                )
                print(f"Created new product: {p['name']} (ID: {prod_id})", flush=True)
            except Exception as error:
                print(f"Error adding {p['name']}: {error}", flush=True)

    # Also specifically enrich Bathing Soap, Biscuits, and Oils
    with get_connection() as conn:
        for row in conn.execute("SELECT product_id, name FROM products").fetchall():
            pid = row["product_id"]
            pname = row["name"].lower()

            if "soap" in pname:
                extra = ["soap", "soaps", "soappu", "സോപ്പ്", "കുളിക്കുന്ന സോപ്പ്", "bathing soap", "bath soap"]
                insert_product_aliases(conn, pid, extra)
                print(f"Explicitly verified soap aliases on product ID {pid} ({row['name']})", flush=True)

            if "biscuit" in pname:
                extra = ["biscuit", "biscuits", "biskut", "bisket", "ബിസ്കറ്റ്", "ബിസ്ക്കറ്റ്", "marie", "cookies"]
                insert_product_aliases(conn, pid, extra)
                print(f"Explicitly verified biscuit aliases on product ID {pid} ({row['name']})", flush=True)

            if "oil" in pname.split():
                extra = ["oil", "velichenna", "thenga enna", "വെളിച്ചെണ്ണ", "എണ്ണ", "enna"]
                insert_product_aliases(conn, pid, extra)
                print(f"Explicitly verified oil aliases on product ID {pid} ({row['name']})", flush=True)

    print("\nCatalogue update complete! Current active products:", flush=True)
    for p in get_products(active_only=True):
        print(f"- #{p['product_id']} {p['name']} ({p.get('malayalam_name','')}) | Rs.{p.get('price')} / {p.get('default_unit')}", flush=True)


if __name__ == "__main__":
    seed_database()

