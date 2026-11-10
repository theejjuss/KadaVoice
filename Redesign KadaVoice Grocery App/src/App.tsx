import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import "./invoice-print.css";
import { DashboardView } from "./components/DashboardView";
import { CatalogueView } from "./components/CatalogueView";
import { CustomersView } from "./components/CustomersView";
import { ReportsView } from "./components/ReportsView";
import { SettingsView } from "./components/SettingsView";

// FastAPI backend used by the local KadaVoice development setup.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type Product = {
  product_id: number;
  name: string;
  malayalam_name: string;
  category: string;
  default_unit: string;
  price: number | null;
  is_active: boolean;
  aliases: string[];
};

type IconName =
  | "arrow"
  | "bag"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "headphones"
  | "leaf"
  | "menu"
  | "mic"
  | "minus"
  | "plus"
  | "shield"
  | "spark"
  | "stop"
  | "trash"
  | "upload"
  | "user"
  | "wave"
  | "search"
  | "receipt"
  | "dashboard"
  | "settings"
  | "download"
  | "edit"
  | "refresh"
  | "phone";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    bag: (
      <>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    headphones: (
      <>
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 4C10 4 5 9 5 16c5 1 12-1 15-12Z" />
        <path d="M4 20c3-6 7-9 12-12" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      </>
    ),
    minus: <path d="M5 12h14" />,
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    spark: (
      <path d="m12 3 1.3 4.7L18 9l-4.7 1.3L12 15l-1.3-4.7L6 9l4.7-1.3L12 3ZM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15ZM19 14l.7 1.3L21 16l-1.3.7L19 18l-.7-1.3L17 16l1.3-.7L19 14Z" />
    ),
    stop: <rect x="7" y="7" width="10" height="10" rx="1" />,
    trash: (
      <>
        <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
        <path d="M5 15v4h14v-4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    wave: (
      <>
        <path d="M3 12h2M7 9v6M11 6v12M15 8v8M19 10v4M22 12h-1" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </>
    ),
    receipt: (
      <>
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </>
    ),
    dashboard: (
      <>
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </>
    ),
    settings: (
      <>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    refresh: (
      <>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
      </>
    ),
    phone: (
      <>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

type View =
  | "home"
  | "order"
  | "catalogue"
  | "history"
  | "dashboard"
  | "customers"
  | "reports"
  | "settings"
  | "about";

type CartItem = {
  id: number;
  name: string;
  quantity: number | null;
  unit: string;
  product_id?: number | null;
  needs_review?: boolean;
};

type SavedOrder = {
  order_id: number;
  invoice_number: string;
  customer_name: string;
  phone?: string;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  total_amount?: number | null;
  created_at: string;
  items: Array<{
    product: string;
    quantity: number;
    unit: string;
    unit_price: number | null;
    line_total: number | null;
  }>;
  confirmation_text?: string;
  audio_url?: string | null;
  tts_error?: string | null;
};

/**
 * Convert browser-recorded audio into a high-performance 16kHz mono 16-bit PCM WAV.
 * Resampling to 16kHz reduces payload size by ~67% and matches Gnani STT's native sample rate.
 */
async function convertAudioToWav(input: Blob): Promise<Blob> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioCtx();
  try {
    const arrayBuffer = await input.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(arrayBuffer);

    const targetSampleRate = 16000;
    const targetLength = Math.max(1, Math.ceil(decoded.duration * targetSampleRate));
    const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    const resampled = await offlineCtx.startRendering();
    const samples = resampled.getChannelData(0);

    const bytesPerSample = 2;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeText = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i += 1) {
        view.setUint8(offset + i, value.charCodeAt(i));
      }
    };

    writeText(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeText(8, "WAVE");
    writeText(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeText(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, pcm, true);
      offset += bytesPerSample;
    }

    return new Blob([buffer], { type: "audio/wav" });
  } finally {
    await audioContext.close();
  }
}

const navItems: { id: View; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "leaf" },
  { id: "order", label: "Voice Order", icon: "mic" },
  { id: "catalogue", label: "Catalogue", icon: "bag" },
  { id: "history", label: "Orders", icon: "receipt" },
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "customers", label: "Customers", icon: "user" },
  { id: "reports", label: "Reports", icon: "spark" },
  { id: "settings", label: "Settings", icon: "settings" },
];

function Brand() {
  return (
    <button
      className="brand"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="KadaVoice home"
    >
      <span className="brand-mark">
        <Icon name="bag" size={25} />
        <span className="brand-leaf">
          <Icon name="leaf" size={10} />
        </span>
      </span>
      <span className="brand-name">
        Kada<span>Voice</span>
      </span>
    </button>
  );
}

function Header({
  view,
  setView,
}: {
  view: View;
  setView: (view: View) => void;
}) {
  const [open, setOpen] = useState(false);
  const navigate = (next: View) => {
    setView(next);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Brand />
        <nav
          className={open ? "nav-links open" : "nav-links"}
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="nav-cta" onClick={() => navigate("order")}>
          Start Ordering <Icon name="arrow" size={17} />
        </button>
        <button
          className="menu-button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
        >
          <Icon name={open ? "close" : "menu"} size={23} />
        </button>
      </div>
    </header>
  );
}

function GroceryIllustration() {
  return (
    <div
      className="hero-visual kerala-fixed-visual"
      aria-label="A local Kerala grocery market"
    >
      <div className="kerala-sun" />
      <div className="kerala-palm kerala-palm-one">
        <Icon name="leaf" size={40} />
      </div>
      <div className="kerala-palm kerala-palm-two">
        <Icon name="leaf" size={30} />
      </div>
      <div className="mini-card mini-card-top">
        <span>
          <Icon name="wave" size={19} />
        </span>
        <b>മലയാളം</b>
        <small>Voice ready</small>
      </div>
      <div className="mini-card mini-card-bottom">
        <span>
          <Icon name="check" size={18} />
        </span>
        <b>നാടൻ പലചരക്ക്</b>
        <small>Your familiar local kada</small>
      </div>
      <div className="kerala-hero-photo">
        <img
          src="https://images.unsplash.com/photo-1768157901365-e36e80cbd8b5?auto=format&fit=crop&w=1000&q=88"
          alt="A customer entering a busy local fruit and vegetable market"
        />
        <div className="kerala-photo-caption">
          <span>കേരളം</span>
          <p>
            <b>Local shopping, made effortless</b>
            <small>Voice ordering for everyday groceries</small>
          </p>
        </div>
      </div>
      <div className="voice-bubble">
        <Icon name="mic" size={22} />
        <span style={{ animationDelay: "0s" }} />
        <span style={{ animationDelay: ".12s" }} />
        <span style={{ animationDelay: ".24s" }} />
        <span style={{ animationDelay: ".36s" }} />
      </div>
      <div className="kasavu-line" />
    </div>
  );
}

function Home({ onStart }: { onStart: () => void }) {
  return (
    <>
      <main className="hero page-shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <span>
              <Icon name="spark" size={14} />
            </span>{" "}
            കേരളത്തിന്റെ വോയ്സ് ഗ്രോസറി അസിസ്റ്റന്റ്
          </div>
          <h1>
            നിങ്ങളുടെ സ്വന്തം
            <br />
            <em>വോയ്സ് ഗ്രോസറി</em>
            <br />
            അസിസ്റ്റന്റ്!
          </h1>
          <p className="hero-malayalam">
            ഇനി സാധനങ്ങൾ ഓർഡർ ചെയ്യാൻ ടൈപ്പ് ചെയ്യേണ്ടതില്ല. മലയാളത്തിൽ
            സംസാരിക്കൂ. KadaVoice നിങ്ങളുടെ ഓർഡർ തയ്യാറാക്കും.
          </p>
          <p className="hero-english">
            Your groceries, your language, your voice.
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={onStart}>
              Start Ordering <Icon name="arrow" size={18} />
            </button>
            <a className="button secondary" href="#how-it-works">
              How It Works <span className="play-icon">▶</span>
            </a>
          </div>
          <div className="trust-row">
            <div>
              <span>
                <Icon name="shield" size={17} />
              </span>
              <p>
                <b>Private & secure</b>
                <small>Your voice is handled safely</small>
              </p>
            </div>
            <div>
              <span>
                <Icon name="headphones" size={17} />
              </span>
              <p>
                <b>Malayalam-first</b>
                <small>Made for everyday Kerala</small>
              </p>
            </div>
          </div>
        </div>
        <GroceryIllustration />
      </main>

      <section className="feature-strip page-shell" id="how-it-works">
        <article>
          <span className="feature-number">01</span>
          <div className="feature-icon">
            <Icon name="mic" size={22} />
          </div>
          <div>
            <h3>Speak in Malayalam</h3>
            <p>പറഞ്ഞാൽ മാത്രം മതി</p>
          </div>
        </article>
        <article>
          <span className="feature-number">02</span>
          <div className="feature-icon">
            <Icon name="spark" size={22} />
          </div>
          <div>
            <h3>Smart grocery detection</h3>
            <p>സാധനങ്ങൾ സ്വയം കണ്ടെത്തും</p>
          </div>
        </article>
        <article>
          <span className="feature-number">03</span>
          <div className="feature-icon">
            <Icon name="wave" size={22} />
          </div>
          <div>
            <h3>Hear your confirmation</h3>
            <p>ഉറപ്പാക്കൽ ശബ്ദമായി കേൾക്കൂ</p>
          </div>
        </article>
      </section>

      <section className="kerala-essentials page-shell">
        <div className="section-heading-row">
          <div>
            <span className="section-kicker">EVERYDAY KERALA ESSENTIALS</span>
            <h2>From your neighbourhood kada</h2>
            <p>അടുക്കളയിലേക്ക് വേണ്ടതെല്ലാം — നിങ്ങൾ പറയുന്ന പോലെ.</p>
          </div>
          <button onClick={onStart}>
            Order by voice <Icon name="arrow" size={17} />
          </button>
        </div>
        <div className="essential-grid">
          {[
            {
              name: "Rice & grains",
              malayalam: "അരി & ധാന്യങ്ങൾ",
              image:
                "https://images.unsplash.com/photo-1562525882-d9dabe507593?auto=format&fit=crop&w=700&q=82",
            },
            {
              name: "Spices & masala",
              malayalam: "മസാലകൾ",
              image:
                "https://images.unsplash.com/photo-1635355995448-77b02d33621d?auto=format&fit=crop&w=700&q=82",
            },
            {
              name: "Milk & dairy",
              malayalam: "പാൽ ഉൽപ്പന്നങ്ങൾ",
              image:
                "https://images.unsplash.com/photo-1561385019-9efb424f3d31?auto=format&fit=crop&w=700&q=82",
            },
            {
              name: "Fresh vegetables",
              malayalam: "പച്ചക്കറികൾ",
              image:
                "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=700&q=82",
            },
            {
              name: "Banana & coconut",
              malayalam: "പഴം & തേങ്ങ",
              image:
                "https://images.unsplash.com/photo-1580554191491-500e2cce5f7c?auto=format&fit=crop&w=700&q=82",
            },
            {
              name: "Fruits",
              malayalam: "പഴവർഗ്ഗങ്ങൾ",
              image:
                "https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?auto=format&fit=crop&w=700&q=82",
            },
          ].map((category) => (
            <article key={category.name}>
              <img src={category.image} alt={category.name} />
              <div>
                <h3>{category.name}</h3>
                <p>{category.malayalam}</p>
              </div>
              <span>
                <Icon name="arrow" size={16} />
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="how-section page-shell">
        <div className="section-kicker">SIMPLE BY DESIGN</div>
        <h2>From voice to order in three easy steps</h2>
        <p>പറയൂ, പരിശോധിക്കൂ, ഓർഡർ ചെയ്യൂ — അത്ര മാത്രം.</p>
        <div className="steps">
          <article>
            <span>1</span>
            <div className="step-art">
              <Icon name="mic" size={32} />
            </div>
            <h3>Tell us what you need</h3>
            <p>Speak naturally in Malayalam, Manglish, or English.</p>
          </article>
          <article>
            <span>2</span>
            <div className="step-art">
              <Icon name="bag" size={32} />
            </div>
            <h3>Review your basket</h3>
            <p>Edit quantities, units, or add anything you missed.</p>
          </article>
          <article>
            <span>3</span>
            <div className="step-art">
              <Icon name="check" size={32} />
            </div>
            <h3>Confirm with confidence</h3>
            <p>Save your order and hear a Malayalam confirmation.</p>
          </article>
        </div>
      </section>

      <section className="local-kada page-shell">
        <div className="kada-photo">
          <img
            src="https://images.unsplash.com/photo-1629649407271-2dac934c1f1b?auto=format&fit=crop&w=1100&q=85"
            alt="Colourful spices arranged at a local market"
          />
          <div className="kada-photo-label">
            <span>
              <Icon name="leaf" size={17} />
            </span>
            <p>
              <b>Made for Kerala</b>
              <small>Familiar groceries. Familiar language.</small>
            </p>
          </div>
        </div>
        <div className="kada-copy">
          <span className="section-kicker">
            YOUR FAMILIAR KADA, MADE EASIER
          </span>
          <h2>Say your list just like you tell your local shopkeeper.</h2>
          <p className="kada-malayalam">
            “ചേട്ടാ, അഞ്ച് കിലോ അരി, ഒരു ലിറ്റർ വെളിച്ചെണ്ണ, രണ്ട് തേങ്ങ, ഒരു
            പാക്കറ്റ് ചായപ്പൊടി.”
          </p>
          <div className="spoken-cart">
            <div className="spoken-cart-top">
              <span>
                <Icon name="mic" size={17} />
              </span>
              <div>
                <b>Example spoken shopping list</b>
                <small>Products are organised automatically</small>
              </div>
              <em>4 items</em>
            </div>
            {[
              ["മട്ട അരി", "5 kg"],
              ["വെളിച്ചെണ്ണ", "1 litre"],
              ["തേങ്ങ", "2 pieces"],
              ["ചായപ്പൊടി", "1 packet"],
            ].map(([item, quantity]) => (
              <div className="spoken-item" key={item}>
                <span>
                  <Icon name="check" size={13} />
                </span>
                <b>{item}</b>
                <small>{quantity}</small>
              </div>
            ))}
          </div>
          <button className="button primary" onClick={onStart}>
            പറയാൻ തുടങ്ങൂ <Icon name="arrow" size={18} />
          </button>
        </div>
      </section>

      <section className="kerala-community page-shell">
        <div className="community-intro">
          <span className="section-kicker">DESIGNED AROUND REAL LIFE</span>
          <h2>For every home, every generation, and every local kada.</h2>
          <p>
            KadaVoice keeps grocery ordering familiar and
            approachable—especially for people who find speaking easier than
            navigating complicated shopping applications.
          </p>
          <div className="community-promise">
            <span>
              <Icon name="shield" size={18} />
            </span>
            <p>
              <b>Simple. Respectful. Malayalam-first.</b>
              <small>No confusing storefronts or unnecessary steps.</small>
            </p>
          </div>
        </div>
        <div className="people-grid">
          <article className="person-card person-card-large">
            <img
              src="https://images.unsplash.com/photo-1607160913770-0d8aa84c84aa?auto=format&fit=crop&w=850&q=85"
              alt="Woman in Kerala"
            />
            <div>
              <span>FOR FAMILIES</span>
              <h3>Order in the language of home</h3>
              <p>Malayalam, Manglish, or English—speak naturally.</p>
            </div>
          </article>
          <article className="person-card">
            <img
              src="https://images.unsplash.com/photo-1653716191226-332de824e1fd?auto=format&fit=crop&w=750&q=85"
              alt="Person carrying goods on a Kerala street"
            />
            <div>
              <span>FOR EVERY GENERATION</span>
              <h3>Fewer taps. More confidence.</h3>
            </div>
          </article>
          <article className="person-card">
            <img
              src="https://images.unsplash.com/photo-1775879983952-694e6256a6be?auto=format&fit=crop&w=750&q=85"
              alt="A local neighborhood grocery shop"
            />
            <div>
              <span>FOR LOCAL SHOPS</span>
              <h3>Orders that are easier to review</h3>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div className={active ? "waveform active" : "waveform"} aria-hidden="true">
      {[12, 22, 34, 18, 42, 28, 48, 20, 38, 26, 44, 18, 32, 24, 14].map(
        (height, index) => (
          <i
            key={index}
            style={{ height, animationDelay: `${index * 0.06}s` }}
          />
        ),
      )}
    </div>
  );
}

function VoiceOrder({
  initialCustomerName = "",
  initialCustomerPhone = "",
  initialCart = [],
}: {
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialCart?: CartItem[];
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioName, setAudioName] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [recognitionLoading, setRecognitionLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [unresolvedItems, setUnresolvedItems] = useState<Array<{ name: string; quantity: number | null; unit: string }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState("");
  const [speaker, setSpeaker] = useState<"Ambuja" | "Deepak">("Ambuja");
  const [newItem, setNewItem] = useState("");
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash");
  const [receiptFormat, setReceiptFormat] = useState<"a4" | "thermal">("a4");
  const [savingOrder, setSavingOrder] = useState(false);
  const [savedOrder, setSavedOrder] = useState<SavedOrder | null>(null);
  const [editingSavedCustomer, setEditingSavedCustomer] = useState(false);
  const [tempCustomerName, setTempCustomerName] = useState("");
  const [updatingCustomer, setUpdatingCustomer] = useState(false);
  const [confirmationAudioUrl, setConfirmationAudioUrl] = useState("");
  const [refreshingAudio, setRefreshingAudio] = useState(false);
  const confirmationAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (initialCustomerName) setCustomerName(initialCustomerName);
    if (initialCustomerPhone) setCustomerPhone(initialCustomerPhone);
  }, [initialCustomerName, initialCustomerPhone]);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setCatalogueLoading(true);
        setCatalogueError("");

        const response = await fetch(`${API_BASE}/api/products`);

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(
            `Product catalogue request failed (${response.status}). ${detail.slice(0, 180)}`,
          );
        }

        const payload = await response.json();

        // Accept either a raw product array or a wrapped API response.
        const rows = Array.isArray(payload)
          ? payload
          : (payload.products ?? payload.data ?? []);

        if (!Array.isArray(rows)) {
          throw new Error("The API response did not contain a product list.");
        }

        const normalized: Product[] = rows
          .filter((item: any) => item && item.product_id != null && item.name)
          .filter(
            (item: any) =>
              item.is_active === undefined || Boolean(item.is_active),
          )
          .map((item: any) => ({
            product_id: Number(item.product_id),
            name: String(item.name),
            malayalam_name: String(item.malayalam_name ?? ""),
            category: String(item.category ?? "General"),
            default_unit: String(item.default_unit ?? "piece"),
            price: item.price == null ? null : Number(item.price),
            is_active:
              item.is_active === undefined ? true : Boolean(item.is_active),
            aliases: Array.isArray(item.aliases)
              ? item.aliases.map(String)
              : typeof item.aliases === "string" && item.aliases
                ? item.aliases.split("|").filter(Boolean)
                : [],
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!cancelled) setProducts(normalized);
      } catch (error) {
        if (!cancelled) {
          setCatalogueError(
            error instanceof Error
              ? error.message
              : "Could not load shop products.",
          );
        }
      } finally {
        if (!cancelled) setCatalogueLoading(false);
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  useEffect(() => {
    if (!confirmationAudioUrl || !confirmationAudioRef.current) return;
    const player = confirmationAudioRef.current;
    player.src = confirmationAudioUrl;
    player.load();
    player.play().catch(() => {
      setNotice(
        "Order saved. Press Play confirmation to hear the audio (browser autoplay may be blocked).",
      );
    });
  }, [confirmationAudioUrl]);

  const startRecording = async () => {
    setNotice("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNotice(
        "Audio recording is not supported in this browser. Please upload a WAV file instead.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];
      recorder.ondataavailable = (event) =>
        event.data.size && chunks.current.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setAudioName("Voice recording");
        setTranscript("");
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setElapsed(0);
      setRecording(true);
    } catch {
      setNotice(
        "Microphone access was not granted. Allow access or upload a WAV file.",
      );
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  const uploadAudio = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setAudioName(file.name);
    setTranscript("");
    setElapsed(0);
    setNotice("");
    // Allow selecting the same file again after a failed attempt.
    event.target.value = "";
  };

  const clearRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl("");
    setAudioName("");
    setTranscript("");
    setElapsed(0);
    setNotice("");
    setUnresolvedItems([]);
  };

  const requestRecognition = async () => {
    if (!audioBlob) {
      setNotice("Please record or select an audio file first.");
      return;
    }

    setRecognitionLoading(true);
    setNotice("");
    setTranscript("");

    try {
      // Convert WebM recordings and uploaded audio to genuine PCM WAV bytes.
      const wavBlob = await convertAudioToWav(audioBlob);
      const wavFile = new File([wavBlob], "kadavoice-recording.wav", {
        type: "audio/wav",
      });
      const formData = new FormData();
      formData.append("file", wavFile);

      const response = await fetch(`${API_BASE}/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload.detail || `Speech recognition failed (${response.status}).`,
        );
      }

      const recognizedText = String(payload.transcript ?? "");
      setTranscript(recognizedText);

      // Handle assistant cart commands
      if (payload.command) {
        const cmd = payload.command;
        if (cmd.action === "clear") {
          setCart([]);
          setNotice(`Voice command: Cart cleared (${cmd.raw_phrase})`);
          return;
        } else if (cmd.action === "remove" && cmd.product) {
          setCart((current) => current.filter((it) => !it.name.toLowerCase().includes(cmd.product.toLowerCase())));
          setNotice(`Voice command: Removed ${cmd.product}`);
          return;
        } else if (cmd.action === "update" && cmd.product && cmd.quantity) {
          setCart((current) =>
            current.map((it) =>
              it.name.toLowerCase().includes(cmd.product.toLowerCase())
                ? { ...it, quantity: cmd.quantity, unit: cmd.unit || it.unit }
                : it
            )
          );
          setNotice(`Voice command: Updated ${cmd.product} to ${cmd.quantity} ${cmd.unit || ""}`);
          return;
        } else if (cmd.action === "add" && cmd.product) {
          setCart((current) => {
            const match = current.find((it) => it.name.toLowerCase().includes(cmd.product.toLowerCase()));
            if (match) {
              return current.map((it) => it.id === match.id ? { ...it, quantity: (it.quantity ?? 0) + (cmd.quantity ?? 1) } : it);
            }
            return [...current, { id: Date.now(), name: cmd.product, quantity: cmd.quantity ?? 1, unit: cmd.unit || "piece" }];
          });
          setNotice(`Voice command: Added ${cmd.quantity ?? 1} ${cmd.product}`);
          return;
        }
      }

      if (payload.customer_name && !customerName.trim()) {
        setCustomerName(payload.customer_name);
      }

      const recognizedOrders = Array.isArray(payload.orders)
        ? payload.orders
        : [];
      const unresolved = Array.isArray(payload.unresolved_items) ? payload.unresolved_items : [];
      setUnresolvedItems(unresolved);

      if (recognizedOrders.length === 0 && unresolved.length === 0) {
        setNotice(
          recognizedText
            ? "Transcript received, but no catalogue products were matched. Add the products manually or update the shop catalogue and aliases."
            : "No speech was detected. Please record again in a quiet place.",
        );
        return;
      }

      const timestamp = Date.now();
      const recognizedCart: CartItem[] = recognizedOrders.map(
        (order: any, index: number) => ({
          id: timestamp + index,
          name: String(order.product ?? order.name ?? "Unknown product"),
          // Do not invent a quantity when the parser could not detect one.
          quantity:
            order.quantity == null || order.quantity === ""
              ? null
              : Number(order.quantity),
          unit: String(order.unit ?? "piece"),
          product_id:
            order.product_id == null ? null : Number(order.product_id),
          needs_review: Boolean(order.needs_review) || order.quantity == null,
        }),
      );

      setCart((current) => [...current, ...recognizedCart]);
      const unresolvedMsg = unresolved.length > 0 ? ` (${unresolved.length} unregistered item(s) need review)` : "";
      setNotice(
        `${recognizedCart.length} product(s) detected${unresolvedMsg}. Review your basket before confirming.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not recognize this audio. Please try again.",
      );
    } finally {
      setRecognitionLoading(false);
    }
  };

  const addItem = (event: FormEvent) => {
    event.preventDefault();
    const name = newItem.trim();
    if (!name) return;
    setCart((items) => [
      ...items,
      { id: Date.now(), name, quantity: 1, unit: "packet" },
    ]);
    setNewItem("");
  };

  const addCatalogueProduct = (event: FormEvent) => {
    event.preventDefault();

    const selectedProduct = products.find(
      (product) => product.product_id === Number(selectedProductId),
    );

    if (!selectedProduct) return;

    setCart((items) => [
      ...items,
      {
        id: Date.now(),
        name: selectedProduct.name,
        quantity: 1,
        unit: selectedProduct.default_unit,
        product_id: selectedProduct.product_id,
        needs_review: false,
      },
    ]);

    setSelectedProductId("");
    setNotice(`${selectedProduct.name} added to your grocery list.`);
  };

  const updateItem = (id: number, patch: Partial<CartItem>) =>
    setCart((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const removeItem = (id: number) =>
    setCart((items) => items.filter((item) => item.id !== id));

  const confirmOrder = async () => {
    if (cart.length === 0) {
      setNotice("Add at least one product before confirming.");
      return;
    }
    const invalid = cart.find(
      (item) =>
        !item.name.trim() ||
        item.quantity == null ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        !item.unit.trim(),
    );
    if (invalid) {
      setNotice(
        `Please complete the quantity and unit for ${invalid.name || "every product"} before confirming.`,
      );
      return;
    }
    setSavingOrder(true);
    setNotice("Saving your order...");
    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim() || "Walk-in Customer",
          customer_phone: customerPhone.trim() || undefined,
          phone: customerPhone.trim() || undefined,
          payment_method: paymentMethod,
          voice: speaker,
          items: cart.map((item) => ({
            product: item.name.trim(),
            quantity: Number(item.quantity),
            unit: item.unit,
            product_id: item.product_id ?? null,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          payload.detail || `Order could not be saved (${response.status}).`,
        );
      const initialAudio = payload.audio_url
        ? `${API_BASE}${payload.audio_url}${payload.audio_url.includes("?") ? "&" : "?"}v=${Date.now()}`
        : "";
      const createdAt = payload.created_at ?? new Date().toISOString();
      const invoiceNumber =
        payload.invoice_number ??
        `KV-${createdAt.slice(0, 10).replaceAll("-", "")}-${String(payload.order_id).padStart(6, "0")}`;

      // Instant confirmation: display invoice and finish saving in milliseconds!
      setSavedOrder({
        order_id: Number(payload.order_id),
        invoice_number: invoiceNumber,
        customer_name:
          payload.customer_name || customerName.trim() || "Walk-in Customer",
        phone: payload.customer_phone || customerPhone.trim(),
        payment_method: paymentMethod,
        payment_status: payload.payment_status ?? "pending",
        status: payload.status ?? "pending",
        total_amount: payload.total_amount ?? invoiceTotal,
        created_at: createdAt,
        items: (payload.items ?? []).map((item: any) => ({
          product: item.product,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: item.unit_price == null ? null : Number(item.unit_price),
          line_total: item.line_total == null ? null : Number(item.line_total),
        })),
        confirmation_text: payload.confirmation_text || "Order saved.",
        audio_url: initialAudio,
        tts_error: null,
      });
      setConfirmationAudioUrl(initialAudio);

      if (initialAudio) {
        setNotice(`Order #${payload.order_id} saved instantly! Voice confirmation ready.`);
        setTimeout(() => {
          confirmationAudioRef.current?.play().catch(() => {});
        }, 150);
      } else {
        setNotice(`Order #${payload.order_id} saved instantly to SQLite. Preparing voice confirmation...`);
        // Background TTS synthesis: fetch audio as soon as ready without blocking order save
        void (async () => {
          try {
            const audioResponse = await fetch(
              `${API_BASE}/api/orders/${payload.order_id}/confirmation-audio?voice=${encodeURIComponent(speaker)}`,
              { method: "POST" },
            );
            const audioPayload = await audioResponse.json().catch(() => ({}));
            if (!audioResponse.ok)
              throw new Error(audioPayload.detail || "Audio generation failed.");
            const generatedUrl = `${API_BASE}${audioPayload.audio_url}${audioPayload.audio_url.includes("?") ? "&" : "?"}v=${Date.now()}`;
            setConfirmationAudioUrl(generatedUrl);
            setSavedOrder((current) =>
              current
                ? {
                    ...current,
                    audio_url: generatedUrl,
                    confirmation_text: audioPayload.confirmation_text || current.confirmation_text,
                    tts_error: null,
                  }
                : current,
            );
            setNotice(`Order #${payload.order_id} confirmed! Voice confirmation ready.`);
            setTimeout(() => {
              confirmationAudioRef.current?.play().catch(() => {});
            }, 100);
          } catch (audioError) {
            console.warn("Audio generation note:", audioError);
          }
        })();
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not save your order. Check that the backend is running.",
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const refreshConfirmationAudio = async () => {
    if (!savedOrder) return;
    setRefreshingAudio(true);
    setNotice("Regenerating confirmation audio...");
    try {
      const response = await fetch(
        `${API_BASE}/api/orders/${savedOrder.order_id}/confirmation-audio?voice=${encodeURIComponent(speaker)}`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          payload.detail || `Audio refresh failed (${response.status}).`,
        );
      const nextUrl = `${API_BASE}${payload.audio_url}${payload.audio_url.includes("?") ? "&" : "?"}v=${Date.now()}`;
      setConfirmationAudioUrl(nextUrl);
      setSavedOrder((current) =>
        current
          ? {
              ...current,
              audio_url: nextUrl,
              confirmation_text: payload.confirmation_text,
              tts_error: null,
            }
          : current,
      );
      setNotice("Confirmation audio regenerated successfully.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not regenerate confirmation audio.",
      );
    } finally {
      setRefreshingAudio(false);
    }
  };

  const money = (value: number | null | undefined) =>
    value == null || !Number.isFinite(Number(value))
      ? "—"
      : `₹${Number(value).toFixed(2)}`;

  // Use only prices returned by the shop's SQLite-backed product catalogue.
  // A catalogue price is valid only for that product's configured default unit.
  const getCatalogueProduct = (item: CartItem) => {
    const clean = (value: string) => value.trim().toLocaleLowerCase();
    return products.find((product) => {
      if (item.product_id != null && product.product_id === item.product_id)
        return true;
      const names = [product.name, product.malayalam_name, ...product.aliases]
        .filter(Boolean)
        .map(clean);
      return names.includes(clean(item.name));
    });
  };

  const draftInvoiceItems = cart.map((item) => {
    const product = getCatalogueProduct(item);
    const unitMatches =
      product &&
      product.default_unit.trim().toLocaleLowerCase() ===
        item.unit.trim().toLocaleLowerCase();
    const unitPrice =
      unitMatches && product.price != null && Number.isFinite(product.price)
        ? Number(product.price)
        : null;
    const lineTotal =
      unitPrice != null &&
      item.quantity != null &&
      Number.isFinite(item.quantity) &&
      item.quantity > 0
        ? unitPrice * item.quantity
        : null;
    return {
      product: item.name,
      quantity: item.quantity ?? 0,
      unit: item.unit,
      unit_price: unitPrice,
      line_total: lineTotal,
    };
  });

  const invoiceItems = savedOrder?.items ?? draftInvoiceItems;
  const allInvoicePricesAvailable =
    invoiceItems.length > 0 &&
    invoiceItems.every(
      (item) => item.unit_price != null && item.line_total != null,
    );
  const invoiceTotal = allInvoicePricesAvailable
    ? invoiceItems.reduce((sum, item) => sum + Number(item.line_total), 0)
    : null;
  const hasDraftInvoice = !savedOrder && cart.length > 0;

  return (
    <main className="page-shell order-page">
      <div className="page-heading">
        <div>
          <span className="section-kicker">VOICE ORDER</span>
          <h1>നിങ്ങളുടെ ഓർഡർ ഇവിടെ പറയൂ</h1>
          <p>
            Speak naturally. We’ll help turn your voice into a clear grocery
            list.
          </p>
        </div>
        <div className="secure-pill">
          <Icon name="shield" size={16} /> Voice handled securely
        </div>
      </div>

      <div className="order-grid">
        <section className="record-card panel">
          <div className="panel-top">
            <div>
              <span className="step-tag">STEP 1</span>
              <h2>Tell us what you need</h2>
            </div>
            <span className={recording ? "live-status active" : "live-status"}>
              <i />
              {recording
                ? "Recording..."
                : audioUrl
                  ? "Audio ready"
                  : "Ready to listen"}
            </span>
          </div>
          <div className="recorder">
            <div className={recording ? "mic-rings active" : "mic-rings"}>
              <button
                className={recording ? "mic-button recording" : "mic-button"}
                onClick={recording ? stopRecording : startRecording}
                aria-label={recording ? "Stop recording" : "Start recording"}
              >
                <Icon name={recording ? "stop" : "mic"} size={34} />
              </button>
            </div>
            <h3>
              {recording
                ? "ഞാൻ കേൾക്കുന്നു..."
                : audioUrl
                  ? "ഓഡിയോ തയ്യാറാണ്"
                  : "Tap to start speaking"}
            </h3>
            <p>
              {recording
                ? "Tap the button when you are finished"
                : "മൈക്ക് ബട്ടൺ അമർത്തി ഓർഡർ പറയൂ"}
            </p>
            <Waveform active={recording} />
            <div className="timer">
              <Icon name="clock" size={15} />{" "}
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
              {String(elapsed % 60).padStart(2, "0")}
            </div>
          </div>
          {audioUrl && (
            <div className="audio-preview">
              <div>
                <span>
                  <Icon name="wave" size={18} />
                </span>
                <p>
                  <b>{audioName}</b>
                  <small>Ready for recognition</small>
                </p>
              </div>
              <audio controls src={audioUrl} />
            </div>
          )}
          <div className="example-text">
            <Icon name="spark" size={16} />
            <p>
              <b>ഉദാഹരണം:</b> രണ്ട് കിലോ അരി, ഒരു ലിറ്റർ എണ്ണ, ഒരു പാക്കറ്റ്
              പഞ്ചസാര വേണം.
            </p>
          </div>
          <div className="record-actions" style={{ flexWrap: "wrap", gap: "10px" }}>
            <label className="upload-button">
              <Icon name="upload" size={18} /> Upload WAV audio
              <input
                type="file"
                accept="audio/wav,audio/x-wav,audio/*"
                onChange={uploadAudio}
              />
            </label>
            {audioUrl && !recording && (
              <>
                <button
                  type="button"
                  className="receipt-print"
                  onClick={startRecording}
                  title="Record audio again"
                >
                  <Icon name="refresh" size={15} /> Retry
                </button>
                <button
                  type="button"
                  className="receipt-print"
                  onClick={clearRecording}
                  title="Clear current recording"
                >
                  <Icon name="trash" size={15} /> Clear
                </button>
              </>
            )}
            <button
              className="button primary recognize"
              disabled={!audioUrl || recording || recognitionLoading}
              onClick={requestRecognition}
            >
              {recognitionLoading ? "Recognizing..." : "Recognize Order"}{" "}
              <Icon name="arrow" size={17} />
            </button>
          </div>
          {notice && (
            <div className="integration-notice" role="status">
              <Icon name="shield" size={17} />
              <p>{notice}</p>
            </div>
          )}
          {transcript && (
            <div className="integration-notice" style={{ marginTop: "10px" }}>
              <Icon name="wave" size={17} />
              <p>
                <strong>Recognized transcript:</strong> {transcript}
              </p>
            </div>
          )}
          {unresolvedItems.length > 0 && (
            <div
              style={{
                marginTop: "14px",
                padding: "14px 16px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#b45309", marginBottom: "6px" }}>
                <Icon name="spark" size={16} />
                <strong style={{ fontSize: "13px" }}>Uncatalogued items detected:</strong>
              </div>
              <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#92400e" }}>
                These items were spoken but aren't registered in your store catalogue yet. You can add them to this order now:
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {unresolvedItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#fff",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #fef3c7",
                      fontSize: "12px",
                    }}
                  >
                    <b style={{ textTransform: "capitalize" }}>{item.name}</b>
                    <span style={{ color: "#6b7280" }}>
                      ({item.quantity ?? 1} {item.unit})
                    </span>
                    <button
                      type="button"
                      className="receipt-print"
                      style={{ padding: "3px 8px", fontSize: "11px" }}
                      onClick={() => {
                        setCart((c) => [
                          ...c,
                          {
                            id: Date.now() + idx,
                            name: item.name,
                            quantity: item.quantity ?? 1,
                            unit: item.unit || "piece",
                            needs_review: true,
                          },
                        ]);
                        setUnresolvedItems((prev) => prev.filter((_, i) => i !== idx));
                        setNotice(`Added ${item.name} to grocery list.`);
                      }}
                    >
                      + Add to Order
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="tips-card panel">
          <span className="tips-icon">
            <Icon name="spark" size={23} />
          </span>
          <h3>For best results</h3>
          <ul>
            <li>
              <Icon name="check" size={15} /> Speak clearly and naturally
            </li>
            <li>
              <Icon name="check" size={15} /> Mention quantity and unit
            </li>
            <li>
              <Icon name="check" size={15} /> Find a quiet place
            </li>
          </ul>
          <div className="language-note">
            <b>നിങ്ങൾക്ക് അറിയാമോ?</b>
            <p>
              Malayalam, Manglish, English — speak in the way that feels natural
              to you.
            </p>
          </div>
        </aside>
      </div>

      <section className="review-card panel">
        <div className="panel-top">
          <div>
            <span className="step-tag">STEP 2</span>
            <h2>Review your grocery list</h2>
          </div>
          <span className="item-count">
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </span>
        </div>
        {cart.length === 0 ? (
          <div className="empty-cart">
            <span>
              <Icon name="bag" size={31} />
            </span>
            <h3>Your grocery list is waiting</h3>
            <p>
              Recognized products will appear here. You can also add an item
              manually.
            </p>
          </div>
        ) : (
          <div className="cart-list">
            {cart.map((item) => (
              <div className="cart-row" key={item.id}>
                <div
                  className="product-avatar"
                  title={item.needs_review ? "Needs review" : "Product"}
                >
                  <Icon name="bag" size={18} />
                </div>
                <input
                  aria-label="Product name"
                  value={item.name}
                  onChange={(event) =>
                    updateItem(item.id, { name: event.target.value })
                  }
                />
                <div className="quantity-control">
                  <button
                    onClick={() =>
                      updateItem(item.id, {
                        quantity: Math.max(1, (item.quantity ?? 1) - 1),
                      })
                    }
                  >
                    <Icon name="minus" size={14} />
                  </button>
                  <input
                    aria-label="Quantity"
                    type="number"
                    min="1"
                    value={item.quantity ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      updateItem(item.id, {
                        quantity:
                          raw === "" ? null : Math.max(0.01, Number(raw)),
                        needs_review: raw === "",
                      });
                    }}
                  />
                  <button
                    onClick={() =>
                      updateItem(item.id, {
                        quantity: (item.quantity ?? 0) + 1,
                        needs_review: false,
                      })
                    }
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>
                <select
                  aria-label="Unit"
                  value={item.unit}
                  onChange={(event) =>
                    updateItem(item.id, { unit: event.target.value })
                  }
                >
                  <option>packet</option>
                  <option>kg</option>
                  <option>g</option>
                  <option>litre</option>
                  <option>ml</option>
                  <option>piece</option>
                </select>
                <button
                  className="remove-button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div
          className="catalogue-picker"
          style={{
            marginTop: "22px",
            paddingTop: "18px",
            borderTop: "1px solid #e8ece6",
          }}
        >
          <div style={{ marginBottom: "10px" }}>
            <h3
              style={{ margin: "0 0 5px", color: "#35483b", fontSize: "13px" }}
            >
              Available Shop Products
            </h3>
            <p style={{ margin: 0, color: "#89938c", fontSize: "10px" }}>
              Choose from the live product catalogue managed by your shop.
            </p>
          </div>

          {catalogueLoading ? (
            <p role="status">Loading products from the shop...</p>
          ) : catalogueError ? (
            <div className="integration-notice" role="alert">
              <Icon name="shield" size={17} />
              <p>{catalogueError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="catalogue-retry"
              >
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <p>No active products were returned by the shop catalogue.</p>
          ) : (
            <>
              <form className="manual-add" onSubmit={addCatalogueProduct}>
                <select
                  aria-label="Select a shop product"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  required
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: "44px",
                    padding: "0 13px",
                    border: "1px solid #dce4d9",
                    borderRadius: "10px",
                    background: "#fcfdfb",
                    color: "#33463a",
                    fontSize: "11px",
                  }}
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.name}
                      {product.malayalam_name
                        ? ` — ${product.malayalam_name}`
                        : ""}
                      {` (${product.default_unit})`}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={!selectedProductId}>
                  <Icon name="plus" size={17} /> Add to cart
                </button>
              </form>
              <p
                className="catalogue-count"
                style={{
                  margin: "8px 0 0",
                  color: "#788578",
                  fontSize: "10px",
                }}
              >
                {products.length} active{" "}
                {products.length === 1 ? "product" : "products"} available
              </p>
            </>
          )}
        </div>

        <form className="manual-add" onSubmit={addItem}>
          <input
            placeholder="Add a product manually…"
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
          />
          <button type="submit">
            <Icon name="plus" size={17} /> Add product
          </button>
        </form>
      </section>

      <section className="speaker-card panel">
        <div className="speaker-heading">
          <div>
            <span className="step-tag">STEP 3</span>
            <h2>Customer Details & Confirmation Voice</h2>
            <p>കസ്റ്റമറുടെ പേരും ഓർഡർ ഉറപ്പാക്കാനുള്ള ശബ്ദവും തിരഞ്ഞെടുക്കൂ.</p>
          </div>
          <Icon name="user" size={27} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "18px" }}>
          <div>
            <label htmlFor="step3-customer-name" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1f2937", marginBottom: "6px" }}>
              Customer Name
            </label>
            <input
              id="step3-customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name (e.g. Rajesh, Priya)"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: customerName.trim() ? "2px solid #14532d" : "1px solid #d1d5db",
                fontSize: "14px",
                fontWeight: 600,
                background: customerName.trim() ? "#f0fdf4" : "#ffffff",
                boxSizing: "border-box"
              }}
            />
            <small style={{ display: "block", fontSize: "11px", color: customerName.trim() ? "#15803d" : "#6b7280", marginTop: "4px" }}>
              {customerName.trim() ? `✓ Bill to will be: "${customerName.trim()}"` : "Defaults to 'Walk-in Customer' if left blank"}
            </small>
          </div>

          <div>
            <label htmlFor="step3-customer-phone" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1f2937", marginBottom: "6px" }}>
              Phone Number (Optional)
            </label>
            <input
              id="step3-customer-phone"
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. 98470 12345"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1f2937", marginBottom: "8px" }}>
            Payment Method
          </label>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {(["cash", "upi", "card"] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1.5px solid",
                  borderColor: paymentMethod === method ? "#14532d" : "#d1d5db",
                  background: paymentMethod === method ? "#14532d" : "#fff",
                  color: paymentMethod === method ? "#fff" : "#374151",
                  fontWeight: paymentMethod === method ? 700 : 500,
                  textTransform: "uppercase",
                  fontSize: "13px",
                  cursor: "pointer",
                  letterSpacing: "0.5px"
                }}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1f2937", marginBottom: "8px" }}>
            Confirmation Voice
          </label>
          <div className="speakers">
            {(["Ambuja", "Deepak"] as const).map((name) => (
              <button
                key={name}
                className={speaker === name ? "speaker selected" : "speaker"}
                onClick={() => setSpeaker(name)}
              >
                <span className={`speaker-avatar ${name.toLowerCase()}`}>
                  <Icon name="user" size={24} />
                </span>
                <span>
                  <b>{name}</b>
                  <small>
                    {name === "Ambuja"
                      ? "Feminine-sounding voice"
                      : "Masculine-sounding voice"}
                  </small>
                </span>
                <i>{speaker === name && <Icon name="check" size={14} />}</i>
              </button>
            ))}
          </div>
        </div>

        <button
          className="button primary confirm-button"
          disabled={cart.length === 0 || savingOrder || Boolean(savedOrder)}
          onClick={confirmOrder}
        >
          <Icon name="check" size={18} />{" "}
          {savingOrder
            ? "Saving order..."
            : savedOrder
              ? `Order Saved (Billed to ${savedOrder.customer_name})`
              : `Confirm & Save Order (Bill to: ${customerName.trim() || "Walk-in Customer"})`}
        </button>
        {savedOrder && (
          <p className="order-saved-note" role="status">
            Order #{savedOrder.order_id} is stored in SQLite. Billed to <b>{savedOrder.customer_name}</b>.
          </p>
        )}
      </section>

      <section className="customer-receipt panel">
        <div className="receipt-toolbar">
          <div>
            <span className="step-tag">
              {savedOrder ? "SAVED CUSTOMER INVOICE" : "ORDER PREVIEW"}
            </span>
            <h2>{savedOrder ? "Final invoice" : "Invoice preview"}</h2>
            <p>
              {savedOrder
                ? "This invoice reflects the order saved in SQLite."
                : "Confirm your order to create a permanent invoice."}
            </p>
          </div>
          <div className="receipt-actions" style={{ alignItems: "center" }}>
            <div className="format-toggle">
              <button
                type="button"
                className={receiptFormat === "a4" ? "active" : ""}
                onClick={() => setReceiptFormat("a4")}
              >
                Standard A4
              </button>
              <button
                type="button"
                className={receiptFormat === "thermal" ? "active" : ""}
                onClick={() => setReceiptFormat("thermal")}
              >
                80mm Thermal
              </button>
            </div>
            {(savedOrder || hasDraftInvoice) && (
              <button
                className="receipt-print"
                onClick={() => {
                  if (receiptFormat === "thermal") {
                    document.body.classList.add("print-thermal-receipt");
                    window.print();
                    setTimeout(() => {
                      document.body.classList.remove("print-thermal-receipt");
                    }, 1000);
                  } else {
                    document.body.classList.remove("print-thermal-receipt");
                    window.print();
                  }
                }}
              >
                <Icon name="receipt" size={15} /> {savedOrder ? "Print invoice" : "Print estimate"}
              </button>
            )}
            {savedOrder && (
              <a
                href={`${API_BASE}/api/orders/${savedOrder.order_id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="receipt-print"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Icon name="download" size={15} /> Download PDF
              </a>
            )}
            {savedOrder && (
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setSavedOrder(null);
                  setCart([]);
                  setAudioBlob(null);
                  setAudioUrl("");
                  setAudioName("");
                  setTranscript("");
                  setNotice("");
                  setUnresolvedItems([]);
                }}
              >
                <Icon name="plus" size={15} /> New Order
              </button>
            )}
          </div>
        </div>
        <div className={receiptFormat === "thermal" ? "receipt-paper thermal-mode" : "receipt-paper"}>
          <div className="invoice-topline">
            <div className="invoice-brand-mark">KV</div>
            <div className="invoice-brand-copy">
              <h2>KadaVoice</h2>
              <p>VOICE-POWERED GROCERY ORDER</p>
            </div>
            <div className="invoice-label">
              <strong>INVOICE</strong>
              <span>{savedOrder?.invoice_number ?? "DRAFT ESTIMATE"}</span>
            </div>
          </div>
          <div className="invoice-rule" />
          <div className="invoice-details-grid">
            <div>
              <span>Bill to</span>
              {savedOrder ? (
                editingSavedCustomer ? (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px", flexWrap: "wrap" }}>
                    <input
                      value={tempCustomerName}
                      onChange={(e) => setTempCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                      style={{
                        padding: "4px 8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "1.5px solid #14532d",
                        width: "140px",
                        background: "#ffffff"
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="button primary"
                      disabled={updatingCustomer}
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                      onClick={async () => {
                        const newName = tempCustomerName.trim() || "Walk-in Customer";
                        setUpdatingCustomer(true);
                        try {
                          const res = await fetch(`${API_BASE}/api/orders/${savedOrder.order_id}/status`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ customer_name: newName }),
                          });
                          if (!res.ok) throw new Error("Update failed");
                          setSavedOrder((curr) => curr ? { ...curr, customer_name: newName } : null);
                          setCustomerName(newName);
                          setEditingSavedCustomer(false);
                          setNotice(`Order #${savedOrder.order_id} customer name updated to "${newName}".`);
                        } catch (err) {
                          setNotice("Could not update customer name.");
                        } finally {
                          setUpdatingCustomer(false);
                        }
                      }}
                    >
                      {updatingCustomer ? "..." : "Save"}
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: "4px 8px",
                        fontSize: "11px",
                        border: "1px solid #ccc",
                        background: "#f3f4f6",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                      onClick={() => setEditingSavedCustomer(false)}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "16px", color: "#14532d" }}>
                      {savedOrder.customer_name || "Walk-in Customer"}
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        setTempCustomerName(savedOrder.customer_name || "");
                        setEditingSavedCustomer(true);
                      }}
                      style={{
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        border: "1px solid #14532d",
                        background: "#f0fdf4",
                        color: "#14532d",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                      title="Edit customer name on saved order"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                )
              ) : (
                <div style={{ marginTop: "2px" }}>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "16px",
                      color: customerName.trim() ? "#14532d" : "#1f2937",
                      fontWeight: 700,
                    }}
                  >
                    {customerName.trim() || "Walk-in Customer"}
                  </strong>
                  <small style={{ display: "block", fontSize: "11px", color: customerName.trim() ? "#15803d" : "#6b7280", marginTop: "2px" }}>
                    {customerName.trim() ? "✓ Dynamic live preview" : "Type below to set customer name"}
                  </small>
                </div>
              )}
            </div>
            <div>
              <span>Order ID</span>
              <strong>
                {savedOrder ? `#${savedOrder.order_id}` : "Not confirmed"}
              </strong>
            </div>
            <div>
              <span>Invoice date</span>
              <strong>
                {savedOrder
                  ? new Date(savedOrder.created_at).toLocaleString("en-IN")
                  : new Date().toLocaleDateString("en-IN")}
              </strong>
            </div>
            <div>
              <span>Confirmation voice</span>
              <strong>{speaker}</strong>
            </div>
          </div>
          {!savedOrder && (
            <div className="receipt-customer" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", background: "#f8faf8", padding: "14px", borderRadius: "8px", border: "1px dashed #cbd5e1", margin: "16px 0" }}>
              <div>
                <label htmlFor="customer-name" style={{ fontWeight: 700, fontSize: "12px", color: "#374151", display: "flex", justifyContent: "space-between" }}>
                  <span>Customer name</span>
                  <span style={{ color: "#15803d", fontWeight: 600 }}>Updates 'Bill to' above live</span>
                </label>
                <input
                  id="customer-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Enter customer name (e.g. Rajesh, Priya)"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: customerName.trim() ? "2px solid #14532d" : "1px solid #d1d5db",
                    fontSize: "14px",
                    fontWeight: 600,
                    background: customerName.trim() ? "#f0fdf4" : "#ffffff",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              <div>
                <label htmlFor="customer-phone" style={{ fontWeight: 700, fontSize: "12px", color: "#374151" }}>
                  Phone number
                </label>
                <input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="e.g. 98470 12345"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    background: "#ffffff",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 700, fontSize: "12px", color: "#374151" }}>
                  Payment Method
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {(["cash", "upi", "card"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "1px solid",
                        borderColor: paymentMethod === method ? "#14532d" : "#d1d5db",
                        background: paymentMethod === method ? "#14532d" : "#fff",
                        color: paymentMethod === method ? "#fff" : "#374151",
                        fontWeight: paymentMethod === method ? 700 : 500,
                        textTransform: "uppercase",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="invoice-table-wrap">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, index) => (
                  <tr key={`${item.product}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{item.product}</td>
                    <td>
                      {item.quantity} {item.unit}
                    </td>
                    <td>{money(item.unit_price)}</td>
                    <td>{money(item.line_total)}</td>
                  </tr>
                ))}
                {!savedOrder && cart.length === 0 && (
                  <tr>
                    <td colSpan={5} className="invoice-empty">
                      Your products will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="invoice-total-row">
            <span>{savedOrder ? "Grand total" : "Estimated total"}</span>
            <strong>
              {invoiceTotal != null ? money(invoiceTotal) : "Price unavailable"}
            </strong>
          </div>
          <div className="invoice-footer-note">
            <strong>Thank you for shopping with your local Kada.</strong>
            <span>
              {savedOrder
                ? "This is an order invoice, not proof of payment."
                : "Draft estimate only — the order has not been confirmed or saved."}{" "}
              Rates are loaded from the shop catalogue. If a product or matching
              unit has no catalogue price, its amount is left blank and the
              total is not calculated.
            </span>
          </div>
        </div>
        {savedOrder && (
          <div className="confirmation-audio-panel">
            <div>
              <strong>Voice confirmation</strong>
              <span>
                {savedOrder.tts_error
                  ? savedOrder.tts_error
                  : confirmationAudioUrl
                    ? "Your Malayalam voice confirmation is ready."
                    : "⚡ Synthesizing Malayalam voice confirmation in background..."}
              </span>
            </div>
            <audio ref={confirmationAudioRef} src={confirmationAudioUrl || undefined} controls preload="auto" />
            <div className="audio-action-row">
              <button
                type="button"
                className="receipt-print"
                disabled={!confirmationAudioUrl}
                onClick={() =>
                  confirmationAudioRef.current
                    ?.play()
                    .catch(() =>
                      setNotice(
                        "Press Play on the audio player to start playback.",
                      ),
                    )
                }
              >
                {confirmationAudioUrl ? "▶ Play confirmation" : "⏳ Generating voice..."}
              </button>
              <button
                type="button"
                className="receipt-print"
                disabled={refreshingAudio}
                onClick={refreshConfirmationAudio}
              >
                {refreshingAudio ? "Refreshing..." : "↻ Refresh audio"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function History({
  onReorder,
}: {
  onReorder?: (customerName: string, items: Array<{ name: string; quantity: number; unit: string }>) => void;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/orders/history`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.detail || "Could not load order history.");
      setOrders(payload.orders ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load order history.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: number, nextStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.order_id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "all" || (o.status || "pending") === statusFilter;
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      String(o.order_id).includes(term) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  return (
    <main className="page-shell simple-page">
      <div className="page-heading">
        <div>
          <span className="section-kicker">ORDER HISTORY</span>
          <h1>Previous Shop Orders</h1>
          <p>Orders recorded in SQLite with live status tracking, invoice reprints, and 1-click reorder.</p>
        </div>
        <button className="receipt-print" onClick={() => void loadOrders()}>
          <Icon name="refresh" size={16} /> Refresh
        </button>
      </div>

      <section className="panel" style={{ padding: "16px 20px", marginBottom: "22px" }}>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by order # or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: "1 1 240px",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #dce4d9",
              fontSize: "13px",
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            {["all", "pending", "completed", "cancelled"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "1px solid",
                  borderColor: statusFilter === st ? "#14532d" : "#dce4d9",
                  background: statusFilter === st ? "#14532d" : "#fff",
                  color: statusFilter === st ? "#fff" : "#4b5563",
                  fontSize: "12px",
                  fontWeight: statusFilter === st ? 700 : 500,
                  textTransform: "capitalize",
                  cursor: "pointer",
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="panel history-empty">
          Loading saved orders...
        </section>
      ) : error ? (
        <section className="panel history-empty">
          <h2>Could not load orders</h2>
          <p>{error}</p>
        </section>
      ) : filteredOrders.length === 0 ? (
        <section className="panel history-empty">
          <span>
            <Icon name="clock" size={34} />
          </span>
          <h2>No matching orders found</h2>
          <p>Try clearing your search or status filter.</p>
        </section>
      ) : (
        <section className="history-list">
          {filteredOrders.map((order) => (
            <article className="panel history-order" key={order.order_id}>
              <div className="history-order-head">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>ORDER #{order.order_id}</span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background:
                          order.status === "completed"
                            ? "#dcfce7"
                            : order.status === "cancelled"
                              ? "#fee2e2"
                              : "#fef3c7",
                        color:
                          order.status === "completed"
                            ? "#15803d"
                            : order.status === "cancelled"
                              ? "#991b1b"
                              : "#b45309",
                      }}
                    >
                      {order.status || "pending"}
                    </span>
                  </div>
                  <h2>{order.customer_name || "Walk-in Customer"}</h2>
                  <small>
                    {new Date(order.created_at).toLocaleString("en-IN")}
                    {order.phone && ` • Phone: ${order.phone}`}
                    {order.payment_method && ` • Payment: ${order.payment_method.toUpperCase()}`}
                  </small>
                </div>
                <div style={{ textAlign: "right", display: "grid", gap: "6px" }}>
                  <strong>{order.items?.length ?? 0} items</strong>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#14532d" }}>
                    ₹{Number(order.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="history-order-items">
                {(order.items ?? []).map((item: any, index: number) => (
                  <div key={`${item.product}-${index}`}>
                    <span>{item.product}</span>
                    <span>
                      {item.quantity} {item.unit}
                    </span>
                    <span>
                      {item.line_total == null
                        ? "—"
                        : `₹${Number(item.line_total).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginTop: "16px",
                  paddingTop: "14px",
                  borderTop: "1px solid #edf0ec",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>Status:</label>
                  <select
                    value={order.status || "pending"}
                    onChange={(e) => updateStatus(order.order_id, e.target.value)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #dce4d9",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <a
                    href={`${API_BASE}/api/orders/${order.order_id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="receipt-print"
                    style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: "6px 10px" }}
                  >
                    <Icon name="download" size={13} /> PDF Invoice
                  </a>
                  {onReorder && (
                    <button
                      type="button"
                      className="button primary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                      onClick={() =>
                        onReorder(
                          order.customer_name || "",
                          (order.items || []).map((it: any) => ({
                            name: it.product,
                            quantity: Number(it.quantity) || 1,
                            unit: it.unit || "piece",
                          }))
                        )
                      }
                    >
                      <Icon name="refresh" size={13} /> Reorder
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function About({ onStart }: { onStart: () => void }) {
  return (
    <main className="page-shell simple-page">
      <section className="about-hero">
        <div>
          <span className="section-kicker">ABOUT KADAVOICE</span>
          <h1>Shopping should feel as easy as speaking.</h1>
          <p>
            KadaVoice is a Malayalam-first grocery assistant designed for
            Kerala’s local shops, families, and anyone who prefers the comfort
            of conversation over complicated screens.
          </p>
          <button className="button primary" onClick={onStart}>
            Try voice ordering <Icon name="arrow" size={18} />
          </button>
        </div>
        <div className="about-mark">
          <span>
            <Icon name="bag" size={58} />
          </span>
          <p>
            സംസാരിക്കൂ...
            <br />
            സാധനങ്ങൾ ഓർഡർ ചെയ്യൂ!
          </p>
        </div>
      </section>
      <section className="values">
        <article>
          <Icon name="leaf" size={24} />
          <h3>Local by design</h3>
          <p>Built around the language and shopping habits of Kerala.</p>
        </article>
        <article>
          <Icon name="shield" size={24} />
          <h3>Simple and trustworthy</h3>
          <p>Clear choices, no hidden prices, and no confusing flows.</p>
        </article>
        <article>
          <Icon name="headphones" size={24} />
          <h3>Accessible to everyone</h3>
          <p>
            A voice-first experience that makes digital ordering more
            approachable.
          </p>
        </article>
      </section>
    </main>
  );
}

function Footer({ setView }: { setView: (view: View) => void }) {
  return (
    <footer>
      <div className="page-shell footer-inner">
        <div>
          <Brand />
          <p>Speak Naturally. Shop Easily.</p>
        </div>
        <div className="footer-links">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setView(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <p className="footer-malayalam">
          കേരളത്തിനായി സ്നേഹത്തോടെ നിർമ്മിച്ചത്
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [prefilledCustomer, setPrefilledCustomer] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  const [prefilledCart, setPrefilledCart] = useState<CartItem[]>([]);

  const navigate = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartOrderForCustomer = (name: string, phone: string) => {
    setPrefilledCustomer({ name, phone });
    setPrefilledCart([]);
    setView("order");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReorder = (customerName: string, items: Array<{ name: string; quantity: number; unit: string }>) => {
    setPrefilledCustomer({ name: customerName, phone: "" });
    setPrefilledCart(
      items.map((it, idx) => ({
        id: Date.now() + idx,
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        needs_review: false,
      }))
    );
    setView("order");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      <Header view={view} setView={navigate} />
      {view === "home" && <Home onStart={() => navigate("order")} />}
      {view === "order" && (
        <VoiceOrder
          key={`${prefilledCustomer.name}-${prefilledCustomer.phone}-${prefilledCart.length}`}
          initialCustomerName={prefilledCustomer.name}
          initialCustomerPhone={prefilledCustomer.phone}
          initialCart={prefilledCart}
        />
      )}
      {view === "catalogue" && <CatalogueView />}
      {view === "history" && <History onReorder={handleReorder} />}
      {view === "dashboard" && <DashboardView onNavigate={navigate} />}
      {view === "customers" && <CustomersView onSelectCustomer={handleStartOrderForCustomer} />}
      {view === "reports" && <ReportsView />}
      {view === "settings" && <SettingsView />}
      {view === "about" && <About onStart={() => navigate("order")} />}
      <Footer setView={navigate} />
    </div>
  );
}
