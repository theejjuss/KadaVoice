
import os
import tempfile

import pandas as pd
import requests
import streamlit as st

from stt import transcribe_audio
from order_processor import extract_orders, extract_unresolved_text
from database import create_tables, save_order, get_orders, get_products
from tts import (
    generate_speech,
    build_order_confirmation,
    AVAILABLE_VOICES,
    DEFAULT_VOICE,
)


# =====================================================
# APP CONFIGURATION
# =====================================================

st.set_page_config(
    page_title="KadaVoice",
    page_icon="🛒",
    layout="centered"
)

create_tables()

UNIT_OPTIONS = [
    "kg", "gram", "litre", "ml",
    "packet", "piece", "bottle", "box", "dozen"
]

defaults = {
    "orders": [],
    "transcript": "",
    "unresolved": [],
    "saved": False,
    "editor_version": 0,
    "confirmation_text": "",
    "confirmation_audio": "",
    "order_id": None,
    "selected_voice": DEFAULT_VOICE,
}

for key, value in defaults.items():
    if key not in st.session_state:
        st.session_state[key] = value


def reset_confirmation():
    st.session_state.saved = False
    st.session_state.order_id = None
    st.session_state.confirmation_text = ""
    st.session_state.confirmation_audio = ""


def row_to_dict(row):
    """Convert SQLite Row/dict records into dictionaries."""
    if isinstance(row, dict):
        return row

    try:
        return dict(row)
    except (TypeError, ValueError):
        return {}


def load_active_products():
    """Load active products from SQLite."""
    return [
        row_to_dict(row)
        for row in get_products(active_only=True)
    ]


# =====================================================
# HEADER AND CUSTOMER DETAILS
# =====================================================

st.title("🛒 KadaVoice")
st.subheader("Your Voice-Powered Grocery Assistant")

st.write(
    "Place grocery orders using Malayalam, Manglish or English."
)

st.caption(
    "Products are loaded from the shop's SQLite catalogue."
)

st.divider()

customer_name = st.text_input(
    "Customer Name",
    placeholder="Enter customer name"
)


# =====================================================
# VOICE SELECTION
# =====================================================

st.subheader("🔊 Choose Your KadaVoice Speaker")

selected_voice = st.radio(
    "Select your preferred voice",
    options=list(AVAILABLE_VOICES.keys()),
    format_func=lambda voice: (
        "Ambuja - Feminine-sounding voice"
        if voice == "Ambuja"
        else "Deepak - Masculine-sounding voice"
    ),
    key="selected_voice",
    horizontal=True,
)

st.caption(
    "Choose the speaker you prefer for Malayalam order confirmations."
)


# =====================================================
# LOAD DATABASE CATALOGUE
# =====================================================

try:
    catalogue_products = load_active_products()

except Exception as error:
    st.error(f"Could not load product catalogue: {error}")
    catalogue_products = []


product_by_name = {
    str(product.get("name", "")): product
    for product in catalogue_products
    if product.get("name")
}

product_options = sorted(product_by_name.keys())

unit_options = sorted(
    set(UNIT_OPTIONS)
    | {
        str(product.get("default_unit"))
        for product in catalogue_products
        if product.get("default_unit")
    }
)


# =====================================================
# AUDIO RECORDING AND UPLOAD
# =====================================================

st.divider()

st.header("🎙️ Record Your Order")

audio_file = st.audio_input(
    "Record your grocery order"
)

st.write("Or upload an existing WAV recording:")

uploaded_file = st.file_uploader(
    "Choose audio file",
    type=["wav"]
)

audio = (
    audio_file
    if audio_file is not None
    else uploaded_file
)


# =====================================================
# SPEECH RECOGNITION
# =====================================================

if st.button(
    "Recognize & Extract Order",
    type="primary"
):

    if audio is None:
        st.warning("Please record or upload an audio file.")

    else:

        temp_path = None

        try:

            audio_bytes = audio.getvalue()

            if not audio_bytes:
                st.error("The selected audio file is empty.")
                st.stop()

            mime_type = getattr(audio, "type", None) or ""
            file_name = getattr(audio, "name", "") or ""

            supported_mime_types = {
                "",
                "audio/wav",
                "audio/x-wav",
                "audio/wave",
                "application/octet-stream",
            }

            if mime_type not in supported_mime_types:

                st.error(
                    f"Unsupported audio format ({mime_type}). "
                    "Please record again or upload a WAV file."
                )

                st.stop()

            if (
                file_name
                and not file_name.lower().endswith(".wav")
            ):

                st.error(
                    "Please upload a WAV file. Other formats must "
                    "be converted before being sent to Gnani STT."
                )

                st.stop()

            with st.spinner(
                "Recognizing your speech with Gnani STT. Please wait..."
            ):

                with tempfile.NamedTemporaryFile(
                    delete=False,
                    suffix=".wav"
                ) as temp_audio:

                    temp_audio.write(audio_bytes)
                    temp_path = temp_audio.name

                transcript = transcribe_audio(temp_path)

                if not transcript or not transcript.strip():

                    st.warning(
                        "No speech was recognized. Please record again "
                        "in a quiet place and speak clearly."
                    )

                    st.stop()

                extracted_orders = extract_orders(transcript)

                try:
                    unresolved = extract_unresolved_text(transcript)

                except Exception:
                    unresolved = []

                st.session_state.transcript = transcript
                st.session_state.orders = extracted_orders
                st.session_state.unresolved = unresolved

                reset_confirmation()

                st.session_state.editor_version += 1

                if not extracted_orders:

                    st.warning(
                        "Speech was recognized, but no catalogue products "
                        "were detected. Add products manually or update "
                        "the shop catalogue."
                    )

                else:

                    st.success(
                        f"Detected {len(extracted_orders)} grocery item(s). "
                        "Please review quantities before saving."
                    )

        except requests.exceptions.HTTPError as error:

            status_code = (
                error.response.status_code
                if error.response is not None
                else None
            )

            if status_code == 504:

                st.error(
                    "Gnani STT returned a 504 Gateway Timeout. "
                    "Wait briefly and try again. Your saved order history "
                    "is unchanged."
                )

            else:

                st.error(
                    f"Gnani STT request failed"
                    f"{f' (HTTP {status_code})' if status_code else ''}: {error}"
                )

        except requests.exceptions.Timeout:

            st.error(
                "The speech recognition request timed out. "
                "Try a shorter, clear WAV recording."
            )

        except Exception as error:

            st.error(f"Processing failed: {error}")

        finally:

            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)


# =====================================================
# RECOGNIZED SPEECH
# =====================================================

if st.session_state.transcript:

    st.divider()

    st.header("📝 Recognized Speech")

    st.info(st.session_state.transcript)


# =====================================================
# UNRESOLVED WORDS
# =====================================================

if st.session_state.unresolved:

    st.subheader("🔎 Words to Review")

    st.warning(
        "These transcript fragments were not matched to catalogue "
        "products. They may include unknown products or ordinary speech. "
        "Check them before completing the order."
    )

    for fragment in st.session_state.unresolved:
        st.write(f"• {fragment}")


# =====================================================
# MANUAL PRODUCT ENTRY
# DATABASE-DRIVEN
# =====================================================

st.divider()

st.header("➕ Add Products Manually")

st.caption(
    "Choose an active product from the shop catalogue, "
    "or enter a custom product for this order."
)

manual_options = (
    product_options + ["Other / Custom Product"]
)

with st.form("add_product_form"):

    selected_product = st.selectbox(
        "Select Grocery Product",
        options=(
            manual_options
            if manual_options
            else ["Other / Custom Product"]
        ),
    )

    custom_product = ""

    if selected_product == "Other / Custom Product":

        custom_product = st.text_input(
            "Enter Product Name"
        )

    col1, col2 = st.columns(2)

    with col1:

        manual_quantity = st.number_input(
            "Quantity",
            min_value=0.01,
            value=1.0,
            step=0.25
        )

    with col2:

        manual_unit = st.selectbox(
            "Unit",
            options=unit_options
        )

    add_product_button = st.form_submit_button(
        "Add Product to Order"
    )

    if add_product_button:

        product_name = (
            custom_product.strip()
            if selected_product == "Other / Custom Product"
            else selected_product
        )

        if not product_name:

            st.error("Please enter a product name.")

        else:

            selected_record = product_by_name.get(
                product_name,
                {}
            )

            st.session_state.orders.append({

                "product_id": selected_record.get("product_id"),

                "product": product_name,

                "quantity": float(manual_quantity),

                "unit": manual_unit,

                "unit_price": selected_record.get("price"),

                "needs_review": False,

            })

            reset_confirmation()

            st.session_state.editor_version += 1

            st.success(
                f"{product_name} added to your order."
            )


# =====================================================
# REVIEW AND EDIT ORDER
# =====================================================

st.divider()

st.header("📦 Review Your Grocery Order")

if st.session_state.orders:

    order_df = pd.DataFrame(
        [
            {
                "product": item.get("product", ""),
                "quantity": item.get("quantity"),
                "unit": item.get("unit", "piece"),
            }
            for item in st.session_state.orders
        ],
        columns=["product", "quantity", "unit"],
    )

    edited_df = st.data_editor(

        order_df,

        key=f"order_editor_{st.session_state.editor_version}",

        num_rows="dynamic",

        use_container_width=True,

        hide_index=True,

        column_config={

            "product": st.column_config.TextColumn(
                "Product",
                required=True
            ),

            "quantity": st.column_config.NumberColumn(
                "Quantity",
                min_value=0.01,
                step=0.25,
                format="%.2f",
                required=True
            ),

            "unit": st.column_config.SelectboxColumn(
                "Unit",
                options=unit_options,
                required=True
            ),

        },

    )

else:

    edited_df = pd.DataFrame(
        columns=["product", "quantity", "unit"]
    )

    st.info(
        "No products in your order yet. "
        "Record your voice or add products manually."
    )


# =====================================================
# CONFIRM AND SAVE ORDER
# =====================================================

if st.button(

    "✅ Confirm & Save Order",

    type="primary",

    disabled=(
        st.session_state.saved
        or edited_df.empty
    ),

):

    final_orders = edited_df.to_dict(
        orient="records"
    )

    valid_orders = []

    has_invalid_item = False

    for item in final_orders:

        product_name = str(
            item.get("product", "")
        ).strip()

        unit = str(
            item.get("unit", "")
        ).strip()

        quantity = item.get("quantity")

        if (
            not product_name
            or not unit
            or pd.isna(quantity)
            or quantity <= 0
        ):

            has_invalid_item = True
            break

        # Resolve product ID and price from database.

        product_record = product_by_name.get(
            product_name,
            {}
        )

        valid_orders.append({

            "product": product_name,

            "quantity": float(quantity),

            "unit": unit,

            "product_id": product_record.get("product_id"),

            "unit_price": product_record.get("price"),

        })

    if has_invalid_item:

        st.error(
            "Incomplete order! Please provide a product, "
            "quantity and unit for every row."
        )

    elif not valid_orders:

        st.error(
            "Please add at least one valid product."
        )

    else:

        try:

            # Save first so a TTS failure cannot lose the order.

            order_id = save_order(

                valid_orders,

                customer_name=(
                    customer_name.strip()
                    or "Walk-in Customer"
                ),

            )

            st.session_state.saved = True

            st.session_state.order_id = order_id

            st.success(
                f"Order #{order_id} saved successfully!"
            )

            try:

                with st.spinner(
                    f"Preparing your {selected_voice} voice confirmation..."
                ):

                    confirmation_text = build_order_confirmation(

                        orders=valid_orders,

                        customer_name=(
                            customer_name.strip()
                            or None
                        ),

                    )

                    audio_path = generate_speech(

                        text=confirmation_text,

                        voice=selected_voice

                    )

                    st.session_state.confirmation_text = (
                        confirmation_text
                    )

                    st.session_state.confirmation_audio = (
                        audio_path
                    )

            except Exception as tts_error:

                st.warning(
                    "Your order was saved, but voice confirmation "
                    f"could not be generated: {tts_error}"
                )

        except Exception as error:

            st.error(
                f"Could not save order: {error}"
            )


# =====================================================
# MALAYALAM VOICE CONFIRMATION
# =====================================================

if st.session_state.saved:

    st.divider()

    st.success(
        f"Order #{st.session_state.order_id} "
        "has been saved successfully!"
    )

    if st.session_state.confirmation_text:

        st.header("🔊 KadaVoice Confirmation")

        st.info(
            st.session_state.confirmation_text
        )

        audio_path = (
            st.session_state.confirmation_audio
        )

        if (
            audio_path
            and os.path.exists(audio_path)
        ):

            st.audio(
                audio_path,
                format="audio/wav",
                autoplay=True
            )

            st.caption(
                f"Confirmation spoken by "
                f"{st.session_state.selected_voice} "
                "| Powered by Gnani Timbre v2.5"
            )


# =====================================================
# PREVIOUS ORDERS
# =====================================================

st.divider()

st.header("📋 Previous Orders")

if st.button("View Saved Orders"):

    previous_orders = get_orders()

    if previous_orders:

        history_df = pd.DataFrame(

            previous_orders,

            columns=[

                "Order ID",
                "Customer",
                "Date",
                "Product",
                "Quantity",
                "Unit",

            ],

        )

        st.dataframe(

            history_df,

            use_container_width=True,

            hide_index=True

        )

    else:

        st.info("No saved orders yet.")
