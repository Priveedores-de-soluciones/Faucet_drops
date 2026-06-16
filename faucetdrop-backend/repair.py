import asyncio
import os
import resend
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# ── INIT (mirrors your main.py exactly) ──────────────────────────────────────
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
# Force correct sender — overrides whatever .env has
FROM_EMAIL  = "quests@faucetdrops.io"
ADMIN_EMAIL = "quests@faucetdrops.io"
FRONTEND_URL   = os.getenv("FRONTEND_URL", "https://faucetdrops.io")

service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
supabase_url     = os.getenv("SUPABASE_URL")
supabase: Client = create_client(supabase_url, service_role_key)

resend.api_key = RESEND_API_KEY

# ── QUEST DETAILS ─────────────────────────────────────────────────────────────
QUEST_TITLE       = "RIFT NIGERIA"
QUEST_DESCRIPTION = "This is a Quest to onboard new users to Rift from the Nigeria community. Complete tasks and earn rewards in USDT"
QUEST_IMAGE_URL   = "https://sdivyxgmyrjevjzufodz.supabase.co/storage/v1/object/public/quest-images/5bb37d6a-c27e-4792-8284-4cf6384ec89f.jpeg"
QUEST_SLUG        = "rift-nigeria-0b49"

# ── EXACT SAME STYLE FROM YOUR main.py ───────────────────────────────────────
QUEST_EMAIL_STYLE = """
    body { font-family: sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .wrap { max-width: 560px; margin: 20px auto; border: 1px solid #262626; border-radius: 12px; overflow: hidden; background: #141414; }
    .hero { width: 100%; height: auto; border-bottom: 1px solid #262626; }
    .content { padding: 32px; }
    h1 { color: #ffffff; font-size: 24px; margin-bottom: 16px; }
    p { line-height: 1.6; color: #a3a3a3; }
    .btn { display: inline-block; padding: 12px 24px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #525252; }
    .reward-box { background: #1a1a1a; border: 1px solid #262626; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
    .reward-label { font-size: 11px; color: #737373; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    .reward-amount { font-size: 26px; font-weight: 900; color: #22c55e; margin-top: 4px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1f1f1f; }
    .row:last-of-type { border-bottom: none; }
    .lbl { font-size: 11px; color: #737373; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    .val { font-size: 13px; font-weight: 700; color: #e5e5e5; }
"""


# ── EXACT SAME FUNCTION FROM YOUR main.py ────────────────────────────────────
async def get_all_user_emails() -> list[str]:
    """Fetch all emails from user_profiles table — identical to main.py"""
    try:
        res = supabase.table("user_profiles").select("email").not_.is_("email", "null").execute()
        return [row["email"] for row in res.data if row.get("email")]
    except Exception as e:
        print(f"⚠️ Error fetching user emails: {e}")
        return []


# ── FIXED VERSION OF send_new_quest_email FROM YOUR main.py ──────────────────
async def send_new_quest_email(title: str, description: str, image_url: str):
    emails = await get_all_user_emails()

    if not emails:
        print("❌ No emails found in database. Aborting.")
        return

    if not RESEND_API_KEY:
        print("❌ RESEND_API_KEY not set. Aborting.")
        return

    # Deduplicate
    emails = list(set(emails))
    print(f"📨 Found {len(emails)} unique emails. Starting broadcast...")

    html_body = f"""
    <html>
    <head><style>{QUEST_EMAIL_STYLE}</style></head>
    <body>
        <div class="wrap">
            <img src="{image_url}" class="hero" alt="{title}" />
            <div class="content">
                <h1>🇳🇬 {title}</h1>
                <p>{description}</p>

                <div class="reward-box">
                    <div class="reward-label">💰 Total Reward Pool</div>
                    <div class="reward-amount">100 USDT</div>
                </div>

                <div class="row">
                    <span class="lbl">Token</span>
                    <span class="val">USDT (Stablecoin)</span>
                </div>
                <div class="row">
                    <span class="lbl">Community</span>
                    <span class="val">🇳🇬 Nigeria</span>
                </div>
                <div class="row">
                    <span class="lbl">Platform</span>
                    <span class="val">Rift × FaucetDrops</span>
                </div>

                <a href="{FRONTEND_URL}/quests/{QUEST_SLUG}" class="btn">
                    Start Quest & Earn USDT →
                </a>
            </div>
            <div class="footer">© FaucetDrops · Drip with Purpose</div>
        </div>
    </body>
    </html>
    """

    # ── BATCHING FIX (50 per request — Resend hard limit) ────────────────────
    batch_size   = 50
    delay_secs   = 0.8
    batches      = [emails[i:i + batch_size] for i in range(0, len(emails), batch_size)]
    total_sent   = 0
    total_failed = 0

    for idx, batch in enumerate(batches, start=1):
        try:
            resend.Emails.send({
                "from":    f"FaucetDrops Quests <{ADMIN_EMAIL}>",
                "to":      [FROM_EMAIL],          # send to yourself
                "bcc":     batch,                 # everyone hidden from each other
                "subject": f"🚀 New Quest Live: {title}",
                "html":    html_body,
            })
            total_sent += len(batch)
            print(f"   ✅ Batch {idx}/{len(batches)} — {len(batch)} emails sent | Running total: {total_sent}")
        except Exception as e:
            total_failed += len(batch)
            print(f"   ❌ Batch {idx}/{len(batches)} FAILED: {e}")

    if idx < len(batches):
        await asyncio.sleep(delay_secs)
    print("\n" + "=" * 50)
    print(f"📊 BROADCAST COMPLETE")
    print(f"   ✅ Sent    : {total_sent}")
    print(f"   ❌ Failed  : {total_failed}")
    print(f"   📧 Total   : {len(emails)}")
    print("=" * 50)


# ── RUN ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    asyncio.run(send_new_quest_email(
        title       = QUEST_TITLE,
        description = QUEST_DESCRIPTION,
        image_url   = QUEST_IMAGE_URL,
    ))