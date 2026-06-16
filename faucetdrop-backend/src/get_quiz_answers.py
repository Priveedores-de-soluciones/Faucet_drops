import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

async def get_quiz_answers(quiz_code: str):
    if DATABASE_URL.startswith("postgresql+asyncpg://"):
        db_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    else:
        db_url = DATABASE_URL

    conn = await asyncpg.connect(db_url)

    try:
        # Get the quiz first
        quiz = await conn.fetchrow(
            "SELECT id, title, status, creator_address FROM faucet_quizzes WHERE code = $1",
            quiz_code.upper()
        )

        if not quiz:
            print(f"❌ Quiz '{quiz_code}' not found.")
            return

        quiz_id = quiz["id"]
        print(f"\n{'='*60}")
        print(f"Quiz:    {quiz['title']}")
        print(f"Code:    {quiz_code.upper()}")
        print(f"Status:  {quiz['status']}")
        print(f"Creator: {quiz['creator_address']}")
        print(f"{'='*60}\n")

        # Get all answers with question text and player info
        rows = await conn.fetch("""
            SELECT
                p.username,
                p.wallet_address,
                qq.position         AS question_num,
                qq.question_text,
                qq.correct_id,
                a.answer_id,
                a.answer_id = qq.correct_id AS is_correct,
                a.time_taken_s,
                COALESCE(a.points_earned, 0) AS points_earned,
                a.answered_at
            FROM faucet_quiz_answers a
            JOIN faucet_quiz_questions qq
                ON qq.id = a.question_id
            JOIN faucet_quiz_participants p
                ON p.quiz_id = a.quiz_id
               AND p.wallet_address = a.wallet_address
            WHERE a.quiz_id = $1
            ORDER BY qq.position ASC, p.username ASC
        """, quiz_id)

        if not rows:
            print("No answers recorded for this quiz.")
            return

        # Group by question
        from collections import defaultdict
        by_question = defaultdict(list)
        for r in rows:
            by_question[r["question_num"]].append(r)

        for q_num in sorted(by_question.keys()):
            answers = by_question[q_num]
            first = answers[0]
            correct_count = sum(1 for a in answers if a["is_correct"])
            total = len(answers)

            print(f"Q{q_num + 1}: {first['question_text']}")
            print(f"     Correct answer: {first['correct_id']}  |  {correct_count}/{total} got it right")
            print(f"     {'Username':<20} {'Wallet':<14} {'Answer':<8} {'Correct':<8} {'Time(s)':<8} {'Points'}")
            print(f"     {'-'*70}")

            for a in answers:
                wallet_short = a["wallet_address"][:6] + "..." + a["wallet_address"][-4:]
                correct_icon = "✅" if a["is_correct"] else "❌"
                print(
                    f"     {a['username']:<20} {wallet_short:<14} "
                    f"{a['answer_id']:<8} {correct_icon:<8} "
                    f"{float(a['time_taken_s'] or 0):<8.2f} {a['points_earned']}"
                )
            print()

        # Summary leaderboard
        print(f"\n{'='*60}")
        print("FINAL LEADERBOARD")
        print(f"{'='*60}")
        participants = await conn.fetch("""
            SELECT
                username,
                wallet_address,
                COALESCE(final_points, points, 0) AS points,
                COALESCE(final_rank, 0)           AS rank
            FROM faucet_quiz_participants
            WHERE quiz_id = $1
            ORDER BY COALESCE(final_points, points, 0) DESC
        """, quiz_id)

        for i, p in enumerate(participants):
            wallet_short = p["wallet_address"][:6] + "..." + p["wallet_address"][-4:]
            rank = p["rank"] if p["rank"] > 0 else i + 1
            print(f"  #{rank:<4} {p['username']:<20} {wallet_short}   {p['points']} pts")

    finally:
        await conn.close()


if __name__ == "__main__":
    import sys
    code = sys.argv[1] if len(sys.argv) > 1 else input("Enter quiz code: ").strip()
    asyncio.run(get_quiz_answers(code))