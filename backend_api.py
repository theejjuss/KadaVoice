import io
import os
import csv
import tempfile
from pathlib import Path
from typing import Optional, List, Any
from datetime import datetime

from fastapi import FastAPI, File, HTTPException, UploadFile, Query, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from stt import transcribe_audio
from order_processor import extract_orders, extract_unresolved_items, detect_order_command, extract_customer_name
from database import (
    create_tables,
    save_order,
    get_orders,
    get_products,
    get_product_catalogue,
    add_product,
    update_product,
    deactivate_product,
    activate_product,
    delete_product,
    get_order_by_id,
    update_order_status,
    get_dashboard_stats,
    get_customers,
    upsert_customer,
    get_orders_by_customer,
    get_shop_settings,
    update_shop_settings,
    get_sales_report,
)
from tts import (
    generate_speech,
    build_order_confirmation,
    AVAILABLE_VOICES,
    is_audio_cached,
    get_audio_cache_path,
)


# ==================================================
# 1. APPLICATION CONFIGURATION
# ==================================================

BASE_DIRECTORY = Path(__file__).resolve().parent

RECORDING_DIRECTORY = BASE_DIRECTORY / "assets" / "recordings"
AUDIO_DIRECTORY = BASE_DIRECTORY / "assets" / "generated_audio"
PDF_DIRECTORY = BASE_DIRECTORY / "assets" / "invoices"

RECORDING_DIRECTORY.mkdir(parents=True, exist_ok=True)
AUDIO_DIRECTORY.mkdir(parents=True, exist_ok=True)
PDF_DIRECTORY.mkdir(parents=True, exist_ok=True)


app = FastAPI(
    title="KadaVoice API",
    description="Multilingual voice-powered grocery ordering and shop management API",
    version="2.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8443",
        "http://127.0.0.1:8443",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_tables()
    if not get_products():
        try:
            from seed_catalogue import seed_database
            seed_database()
        except Exception as e:
            print(f"Auto-seed warning: {e}")


# ==================================================
# 2. REQUEST MODELS
# ==================================================

class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    malayalam_name: str = ""
    category: str = "General"
    default_unit: str = "piece"
    price: Optional[float] = Field(default=None, ge=0)
    stock_quantity: int = Field(default=100, ge=0)
    image_url: str = ""
    aliases: list[str] = Field(default_factory=list)


class ProductUpdate(ProductCreate):
    pass


class OrderItem(BaseModel):
    product: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    unit: str = Field(min_length=1)
    product_id: Optional[int] = None


class OrderRequest(BaseModel):
    items: list[OrderItem]
    voice: str = "Ambuja"
    customer_name: str = "Walk-in Customer"
    customer_phone: str = ""
    phone: Optional[str] = None
    payment_method: str = "cash"
    payment_status: str = "pending"
    discount: float = 0.0
    tax: float = 0.0
    notes: str = ""


class OrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    customer_name: Optional[str] = None


class ShopSettingsUpdate(BaseModel):
    shop_name: Optional[str] = None
    shop_tagline: Optional[str] = None
    shop_phone: Optional[str] = None
    shop_address: Optional[str] = None
    tax_rate: Optional[Any] = None
    gstin: Optional[str] = None
    default_voice: Optional[str] = None
    invoice_footer: Optional[str] = None


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1)
    phone: str = ""
    notes: str = ""


# ==================================================
# 3. HELPER FUNCTIONS
# ==================================================

def product_response(product: dict) -> dict:
    """Convert database product row into API response."""
    result = dict(product)
    aliases = result.get("aliases")

    result["aliases"] = (
        [x for x in aliases.split("|") if x]
        if isinstance(aliases, str) and aliases
        else []
    )
    result["is_active"] = bool(result.get("is_active", 0))
    result["stock_quantity"] = int(result.get("stock_quantity") or 100)
    result["image_url"] = result.get("image_url") or ""
    return result


def invoice_number(order_id: int, created_at: str | None = None) -> str:
    """Generate a stable invoice number from the order ID and creation date."""
    try:
        date_part = (
            datetime.fromisoformat(created_at).strftime("%Y%m%d")
            if created_at
            else datetime.now().strftime("%Y%m%d")
        )
    except (TypeError, ValueError):
        date_part = datetime.now().strftime("%Y%m%d")

    return f"KV-{date_part}-{order_id:06d}"


def find_active_product(name: str):
    """Find an active product by its exact normalized name."""
    target = " ".join(name.casefold().strip().split())

    for product in get_products(active_only=True):
        candidate = " ".join(
            str(product["name"]).casefold().strip().split()
        )
        if candidate == target:
            return product
    return None


def generate_pdf_invoice(order_data: dict, settings: dict, output_file: Path):
    """Generate a clean, high-resolution A4 invoice PDF using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    doc = SimpleDocTemplate(
        str(output_file),
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    story = []

    order = order_data.get("order", {})
    items = order_data.get("items", [])
    order_id = order.get("order_id", 0)
    created_at = order.get("created_at", "")
    inv_num = invoice_number(order_id, created_at)

    shop_name = settings.get("shop_name", "KadaVoice Supermarket")
    shop_phone = settings.get("shop_phone", "+91 98470 12345")
    shop_addr = settings.get("shop_address", "Alappuzha, Kerala")
    footer_text = settings.get("invoice_footer", "Thank you for shopping with your local Kada! Visit again.")

    title_style = ParagraphStyle(
        "ShopTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1b4d2e")
    )

    meta_style = ParagraphStyle(
        "ShopMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#556b5a")
    )

    inv_title_style = ParagraphStyle(
        "InvTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        alignment=2,  # Right
        textColor=colors.HexColor("#1b4d2e")
    )

    inv_meta_style = ParagraphStyle(
        "InvMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        alignment=2,
        textColor=colors.HexColor("#556b5a")
    )

    # Header Table: Shop on left, Invoice title on right
    header_data = [
        [
            Paragraph(f"<b>{shop_name}</b>", title_style),
            Paragraph("<b>TAX INVOICE</b>", inv_title_style)
        ],
        [
            Paragraph(f"{shop_addr}<br/>Phone: {shop_phone}", meta_style),
            Paragraph(f"<b>Invoice #:</b> {inv_num}<br/><b>Order ID:</b> #{order_id}<br/><b>Date:</b> {created_at[:16]}", inv_meta_style)
        ]
    ]

    header_table = Table(header_data, colWidths=[300, 220])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 15))

    # Customer & Payment details
    customer_name = order.get("customer_name") or "Walk-in Customer"
    payment_status = (order.get("payment_status") or "pending").upper()
    payment_method = (order.get("payment_method") or "cash").upper()

    bill_to_data = [
        [
            Paragraph(f"<b>Billed To:</b> {customer_name}", meta_style),
            Paragraph(f"<b>Payment:</b> {payment_method} ({payment_status})", inv_meta_style)
        ]
    ]
    bill_table = Table(bill_to_data, colWidths=[300, 220])
    story.append(bill_table)
    story.append(Spacer(1, 15))

    # Items Table
    table_data = [
        ["#", "Item Description", "Qty", "Rate (INR)", "Amount (INR)"]
    ]

    subtotal = 0.0
    for idx, item in enumerate(items, 1):
        rate_str = f"{item['unit_price']:.2f}" if item.get("unit_price") is not None else "-"
        amt_str = f"{item['line_total']:.2f}" if item.get("line_total") is not None else "-"
        if item.get("line_total") is not None:
            subtotal += float(item["line_total"])

        table_data.append([
            str(idx),
            str(item["product"]),
            f"{item['quantity']} {item['unit']}",
            rate_str,
            amt_str
        ])

    discount = float(order.get("discount") or 0.0)
    tax = float(order.get("tax") or 0.0)
    grand_total = subtotal - discount + tax

    table_data.append(["", "", "", "Subtotal:", f"Rs. {subtotal:.2f}"])
    if discount > 0:
        table_data.append(["", "", "", "Discount:", f"- Rs. {discount:.2f}"])
    if tax > 0:
        table_data.append(["", "", "", "Tax / GST:", f"+ Rs. {tax:.2f}"])
    table_data.append(["", "", "", "Grand Total:", f"Rs. {grand_total:.2f}"])

    items_table = Table(table_data, colWidths=[30, 240, 80, 85, 85])
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef5ee")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1b4d2e")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, len(items)), 0.5, colors.HexColor("#d5ded5")),
        ("FONTNAME", (3, len(items) + 1), (-1, -1), "Helvetica-Bold"),
        ("LINEBELOW", (3, -1), (-1, -1), 1.5, colors.HexColor("#1b4d2e")),
    ]))

    story.append(items_table)
    story.append(Spacer(1, 25))

    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12,
        alignment=1,  # Center
        textColor=colors.HexColor("#4b604e")
    )
    story.append(Paragraph(footer_text, footer_style))

    doc.build(story)


# ==================================================
# 4. HEALTH CHECK
# ==================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "KadaVoice API",
        "version": "2.0.0",
        "system": "Production-Ready Voice Grocery Platform",
        "timestamp": datetime.now().isoformat()
    }


# ==================================================
# 5. PRODUCT CATALOGUE ENDPOINTS
# ==================================================

@app.get("/api/products")
def list_products(
    active_only: bool = False,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Retrieve products with optional filtering by active status, category, or search."""
    try:
        products = get_products(active_only=active_only)
        catalogue = get_product_catalogue()

        aliases_by_id = {
            product["product_id"]: product.get("aliases", "")
            for product in catalogue
        }

        result = []
        for product in products:
            item = dict(product)
            item["aliases"] = aliases_by_id.get(item["product_id"], "")
            resp = product_response(item)

            if category and resp.get("category", "").lower() != category.lower():
                continue

            if search:
                s = search.lower()
                name_match = s in resp["name"].lower()
                mal_match = s in resp["malayalam_name"].lower()
                alias_match = any(s in a.lower() for a in resp["aliases"])
                if not (name_match or mal_match or alias_match):
                    continue

            result.append(resp)

        return {
            "success": True,
            "count": len(result),
            "products": result,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve products: {error}",
        )


@app.post("/api/products", status_code=201)
def create_product(request: ProductCreate):
    try:
        product_id = add_product(
            name=request.name,
            malayalam_name=request.malayalam_name,
            category=request.category,
            default_unit=request.default_unit,
            price=request.price,
            stock_quantity=request.stock_quantity,
            image_url=request.image_url,
            aliases=request.aliases,
        )

        return {
            "success": True,
            "product_id": product_id,
            "message": "Product created successfully.",
        }

    except Exception as error:
        message = str(error)
        status = 409 if "UNIQUE constraint failed" in message else 400
        raise HTTPException(status_code=status, detail=message)


@app.put("/api/products/{product_id}")
def edit_product(product_id: int, request: ProductUpdate):
    try:
        update_product(
            product_id=product_id,
            name=request.name,
            malayalam_name=request.malayalam_name,
            category=request.category,
            default_unit=request.default_unit,
            price=request.price,
            aliases=request.aliases,
            stock_quantity=request.stock_quantity,
            image_url=request.image_url,
        )

        return {
            "success": True,
            "message": "Product updated successfully.",
        }

    except Exception as error:
        message = str(error)
        status = 404 if "Product not found" in message else 400
        if "UNIQUE constraint failed" in message:
            status = 409
        raise HTTPException(status_code=status, detail=message)


@app.patch("/api/products/{product_id}/deactivate")
def archive_product(product_id: int):
    try:
        deactivate_product(product_id)
        return {
            "success": True,
            "message": "Product deactivated successfully.",
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.patch("/api/products/{product_id}/activate")
def unarchive_product(product_id: int):
    try:
        activate_product(product_id)
        return {
            "success": True,
            "message": "Product activated successfully.",
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.delete("/api/products/{product_id}")
def remove_product(product_id: int):
    try:
        deleted = delete_product(product_id)
        action = "deleted permanently" if deleted else "deactivated (has previous orders)"
        return {
            "success": True,
            "deleted": deleted,
            "message": f"Product #{product_id} {action}."
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# ==================================================
# 6. SPEECH-TO-TEXT & INTENT EXTRACTION
# ==================================================

@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()

    if suffix != ".wav":
        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload a WAV file. "
                "Browser recordings must be converted to 16kHz mono WAV first."
            ),
        )

    temp_path = None

    try:
        audio_data = await file.read()

        if not audio_data:
            raise HTTPException(
                status_code=400,
                detail="The uploaded audio file is empty.",
            )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".wav",
            dir=RECORDING_DIRECTORY,
        ) as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name

        transcript = transcribe_audio(temp_path)

        # 1. Extract confirmed catalogue orders
        orders = extract_orders(transcript)

        # 2. Extract unresolved items (potential unknown products)
        unresolved_items = extract_unresolved_items(transcript)

        # 3. Detect natural language assistant editing commands
        command = detect_order_command(transcript)

        # 4. Extract spoken customer name if mentioned
        detected_customer_name = extract_customer_name(transcript)

        return {
            "success": True,
            "transcript": transcript,
            "orders": orders,
            "unresolved_items": unresolved_items,
            "command": command,
            "customer_name": detected_customer_name,
            "message": "Audio transcribed successfully.",
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Speech recognition failed: {error}",
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


# ==================================================
# 7. CREATE ORDER + VOICE CONFIRMATION
# ==================================================

@app.post("/api/orders")
def create_order(request: OrderRequest, background_tasks: BackgroundTasks):
    if not request.items:
        raise HTTPException(
            status_code=400,
            detail="Your grocery list is empty.",
        )

    if request.voice not in AVAILABLE_VOICES:
        raise HTTPException(
            status_code=400,
            detail="Invalid confirmation voice.",
        )

    customer_name = (
        request.customer_name.strip()
        or "Walk-in Customer"
    )

    items = []

    try:
        for requested in request.items:
            item = requested.model_dump()
            product = find_active_product(item["product"])

            if product:
                item["product_id"] = product["product_id"]
                item["unit_price"] = product["price"]
                item["product"] = product["name"]
            else:
                item["product_id"] = None
                item["unit_price"] = None

            items.append(item)

        phone = (request.customer_phone or request.phone or "").strip()
        order_id = save_order(
            items,
            customer_name=customer_name,
            customer_phone=phone,
            payment_method=request.payment_method,
            payment_status=request.payment_status,
            discount=request.discount,
            tax=request.tax,
            notes=request.notes
        )

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Could not save order: {error}",
        )

    confirmation_text = build_order_confirmation(
        orders=items,
        customer_name=customer_name,
    )

    audio_url = None
    tts_error = None

    # Instant check: if audio is already cached, return URL in 0ms!
    if is_audio_cached(confirmation_text, request.voice):
        cached_file = get_audio_cache_path(confirmation_text, request.voice)
        audio_url = f"/api/audio/{cached_file.name}"
    else:
        # Generate in background so order saving completes in < 50ms!
        background_tasks.add_task(generate_speech, confirmation_text, request.voice)

    saved_order = get_order_by_id(order_id)
    order_header = saved_order["order"] if saved_order else {}
    created_at = order_header.get("created_at")

    return {
        "success": True,
        "order_id": order_id,
        "invoice_number": invoice_number(order_id, created_at),
        "customer_name": customer_name,
        "customer_phone": request.customer_phone,
        "status": order_header.get("status", "pending"),
        "payment_status": order_header.get("payment_status", "pending"),
        "total_amount": order_header.get("total_amount"),
        "created_at": created_at,
        "items": saved_order["items"] if saved_order else items,
        "confirmation_text": confirmation_text,
        "audio_url": audio_url,
        "audio_status": "ready" if audio_url else "generating",
        "tts_error": tts_error,
        "message": "Order saved successfully in SQLite.",
    }


# ==================================================
# 8. ORDER HISTORY & FILTERING
# ==================================================

@app.get("/api/orders/history")
def order_history(
    q: Optional[str] = None,
    status: Optional[str] = None,
    date_filter: Optional[str] = None
):
    try:
        rows = get_orders()
        grouped = {}

        for row in rows:
            order_id = row["order_id"]

            if order_id not in grouped:
                grouped[order_id] = {
                    "order_id": order_id,
                    "invoice_number": invoice_number(
                        order_id,
                        row["created_at"]
                    ),
                    "customer_name": row["customer_name"],
                    "created_at": row["created_at"],
                    "status": row.get("status", "pending"),
                    "payment_method": row.get("payment_method", "cash"),
                    "payment_status": row.get("payment_status", "pending"),
                    "discount": row.get("discount", 0.0),
                    "tax": row.get("tax", 0.0),
                    "total_amount": row.get("total_amount"),
                    "notes": row.get("notes", ""),
                    "items": [],
                }

            grouped[order_id]["items"].append({
                "product": row["product"],
                "quantity": row["quantity"],
                "unit": row["unit"],
                "unit_price": row.get("unit_price"),
                "line_total": row.get("line_total"),
            })

        orders_list = list(grouped.values())

        # Filtering
        if q:
            query_str = q.lower().strip()
            orders_list = [
                o for o in orders_list
                if query_str in str(o["order_id"])
                or query_str in o["customer_name"].lower()
                or query_str in o["invoice_number"].lower()
            ]

        if status and status != "all":
            orders_list = [o for o in orders_list if o.get("status") == status]

        if date_filter and date_filter != "all":
            today_str = datetime.now().strftime("%Y-%m-%d")
            if date_filter == "today":
                orders_list = [o for o in orders_list if o["created_at"].startswith(today_str)]

        return {
            "success": True,
            "count": len(orders_list),
            "orders": orders_list,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve order history: {error}",
        )


# ==================================================
# 9. SINGLE ORDER DETAILS & STATUS UPDATE
# ==================================================

@app.get("/api/orders/{order_id}")
def single_order(order_id: int):
    try:
        result = get_order_by_id(order_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Order not found.")

        order = result.get("order", {})
        return {
            "success": True,
            "invoice_number": invoice_number(order_id, order.get("created_at")),
            **result,
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.patch("/api/orders/{order_id}/status")
def change_order_status(order_id: int, request: OrderStatusUpdate):
    try:
        updated = update_order_status(
            order_id=order_id,
            status=request.status,
            payment_status=request.payment_status,
            payment_method=request.payment_method,
            notes=request.notes,
            customer_name=request.customer_name,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Order not found or no changes provided.")

        return {
            "success": True,
            "order_id": order_id,
            "message": "Order status updated successfully."
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# ==================================================
# 10. REGENERATE AUDIO
# ==================================================

@app.post("/api/orders/{order_id}/confirmation-audio")
def regenerate_confirmation_audio(
    order_id: int,
    voice: str = "Ambuja"
):
    if voice not in AVAILABLE_VOICES:
        raise HTTPException(status_code=400, detail="Invalid confirmation voice.")

    result = get_order_by_id(order_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Order not found.")

    order = result["order"]
    items = [
        {
            "product": row["product"],
            "quantity": row["quantity"],
            "unit": row["unit"],
        }
        for row in result["items"]
    ]

    confirmation_text = build_order_confirmation(
        orders=items,
        customer_name=order.get("customer_name", "Walk-in Customer"),
    )

    try:
        audio_path = generate_speech(text=confirmation_text, voice=voice)
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Voice generation failed: {error}")

    return {
        "success": True,
        "order_id": order_id,
        "invoice_number": invoice_number(order_id, order.get("created_at")),
        "confirmation_text": confirmation_text,
        "audio_url": f"/api/audio/{Path(audio_path).name}",
    }


# ==================================================
# 11. PDF INVOICE EXPORT
# ==================================================

@app.get("/api/orders/{order_id}/pdf")
def get_pdf_invoice(order_id: int):
    try:
        order_data = get_order_by_id(order_id)
        if not order_data:
            raise HTTPException(status_code=404, detail="Order not found.")

        settings = get_shop_settings()
        created_at = order_data["order"].get("created_at", "")
        inv_num = invoice_number(order_id, created_at)
        pdf_filename = f"{inv_num}.pdf"
        pdf_path = PDF_DIRECTORY / pdf_filename

        generate_pdf_invoice(order_data, settings, pdf_path)

        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=pdf_filename,
        )

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Could not generate invoice PDF: {error}")


# ==================================================
# 12. DASHBOARD ANALYTICS
# ==================================================

@app.get("/api/dashboard")
def dashboard_analytics():
    try:
        stats = get_dashboard_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Dashboard error: {error}")


# ==================================================
# 13. CUSTOMER MANAGEMENT
# ==================================================

@app.get("/api/customers")
def list_customers(search: Optional[str] = None):
    try:
        customers = get_customers(search=search or "")
        return {
            "success": True,
            "count": len(customers),
            "customers": customers
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/api/customers", status_code=201)
def add_customer(request: CustomerCreate):
    try:
        cust_id = upsert_customer(request.name, request.phone, request.notes)
        return {
            "success": True,
            "customer_id": cust_id,
            "message": "Customer profile created/updated successfully."
        }
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.get("/api/customers/{customer_name}/orders")
def customer_orders(customer_name: str):
    try:
        orders = get_orders_by_customer(customer_name)
        return {
            "success": True,
            "customer_name": customer_name,
            "count": len(orders),
            "orders": orders
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# ==================================================
# 14. SHOP SETTINGS
# ==================================================

@app.get("/api/settings")
def read_settings():
    try:
        settings = get_shop_settings()
        return {
            "success": True,
            "settings": settings
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.put("/api/settings")
def write_settings(request: ShopSettingsUpdate):
    try:
        data = {k: str(v) for k, v in request.model_dump(exclude_none=True).items()}
        update_shop_settings(data)
        return {
            "success": True,
            "settings": get_shop_settings(),
            "message": "Settings updated successfully."
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# ==================================================
# 15. SALES REPORTS & CSV EXPORT
# ==================================================

@app.get("/api/reports/sales")
def sales_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    try:
        data = get_sales_report(start_date, end_date)
        total_revenue = sum(float(r.get("total_sales") or 0) for r in data)
        total_orders = sum(int(r.get("order_count") or 0) for r in data)
        return {
            "success": True,
            "report": data,
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "daily_breakdown": [
                {
                    "date": r["date"],
                    "orders_count": r["order_count"],
                    "daily_sales": r["total_sales"]
                }
                for r in data
            ]
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.get("/api/reports/sales/csv")
def sales_report_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    try:
        data = get_sales_report(start_date, end_date)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Date", "Total Orders", "Total Sales (INR)", "Items Sold"])
        for row in data:
            writer.writerow([row["date"], row["order_count"], row["total_sales"], row["items_sold"]])

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=kadavoice_sales_report.csv"}
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


# ==================================================
# 16. SERVE GENERATED AUDIO
# ==================================================

@app.get("/api/audio/{filename}")
def get_audio(filename: str):
    if Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid audio filename.")

    audio_path = AUDIO_DIRECTORY / filename
    if not audio_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found.")

    return FileResponse(
        path=audio_path,
        media_type="audio/wav",
        filename=filename,
    )


# ==================================================
# 17. SERVE FRONTEND SINGLE-PAGE APPLICATION (SPA)
# ==================================================

FRONTEND_DIST = BASE_DIRECTORY / "Redesign KadaVoice Grocery App" / "dist"
if not (FRONTEND_DIST / "index.html").is_file():
    FRONTEND_DIST = BASE_DIRECTORY / "dist"

if (FRONTEND_DIST / "index.html").is_file():
    from fastapi.staticfiles import StaticFiles

    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend_assets")

    @app.get("/")
    def serve_frontend_root():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    def serve_frontend_fallback(full_path: str):
        target = FRONTEND_DIST / full_path
        if full_path and target.is_file():
            return FileResponse(target)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def home():
        return {
            "message": "Welcome to KadaVoice API",
            "status": "running",
            "version": "2.0.0",
            "system": "Production-Ready Voice Grocery Platform"
        }

if __name__ == "__main__":
    import uvicorn
    raw_port = os.environ.get("PORT", "8000")
    try:
        port = int(str(raw_port).strip())
    except Exception:
        port = 8000
    print(f"Starting KadaVoice unified server on 0.0.0.0:{port}...", flush=True)
    uvicorn.run("backend_api:app", host="0.0.0.0", port=port, reload=False)



