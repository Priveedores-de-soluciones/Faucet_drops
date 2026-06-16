import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fetch from 'node-fetch';

interface GoogleSearchResponse {
  items?: {
    title: string;
    link: string;
  }[];
}

const apiKey = process.env.GEMINI_API_KEY;
const TELEGRAM_SUPPORT_LINK = "https://t.me/faucetdropschat";
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;

if (!apiKey) {
  console.error("GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(apiKey!);

/**
 * Detect user language (simple heuristic)
 */
function detectLanguage(message: string): string {
  if (/[\u0600-\u06FF]/.test(message)) return "Arabic";
  if (/[\u4E00-\u9FFF]/.test(message)) return "Chinese";
  if (/[\u0400-\u04FF]/.test(message)) return "Russian";
  if (/hola|gracias|por favor/i.test(message)) return "Spanish";
  if (/bonjour|merci/i.test(message)) return "French";
  return "English";
}

/**
 * Lightweight intent classification
 */
function classifyIntent(message: string) {
  const text = message.toLowerCase();

  if (text.includes("launch") || text.includes("create faucet"))
    return "launch_campaign";

  if (text.includes("didn't receive") || text.includes("not receive") || text.includes("claim issue"))
    return "claim_issue";

  if (text.includes("wallet") || text.includes("connect"))
    return "wallet_issue";

  if (text.includes("enterprise") || text.includes("integration") || text.includes("api"))
    return "enterprise_inquiry";

  if (text.includes("price") || text.includes("cost"))
    return "pricing_question";

  if (text.includes("search")) {
    return "web_search";
  }

  return "general";
}

/**
 * Escalation detector
 */
function shouldEscalate(message: string): boolean {
  const text = message.toLowerCase();

  return (
    text.includes("exploit") ||
    text.includes("hack") ||
    text.includes("lost tokens") ||
    text.includes("contract bug") ||
    text.includes("legal") ||
    text.includes("partnership")
  );
}

/**
 * Format chat history for Gemini
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatHistory(history: any[]) {
  if (!Array.isArray(history)) return [];

  return history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content || msg.text || "" }],
  }));
}

/**
 * Dynamic system instruction
 */
function buildSystemPrompt(language: string, intent: string) {
  return `
You are the official AI support agent for FaucetDrops.

Respond in ${language}.

ABOUT FAUCETDROPS:
FaucetDrops is a Web3 token distribution platform that unify your onchain growth, automate your rewards, scale engagement.
FaucetDrops helps web3 Projects, DAOs, Protocols, and Communities automate token distribution, run interactive campaigns and onboard real users at scale.
it enable enabling:
- Token faucets (Open / Whitelist / Custom)
- Quests
- Quizzes
- Automated community rewards

FAUCET TYPE:
- Open: Anyone can claim. It is for for wide distribution with drop code protection.
- Whitelist: Only whitelisted users/wallet can claim. Restricted faucet for specific wallet addresses only.
- Custom: Advanced customization. Fully customizable faucet with advanced logic and integrations.

HOW TO CREATE FAUCET:
1. Choose faucet type(Open / Whitelist / Custom)
2. Enter a name for your faucet
3. Select token
4. Include description
5. Add image
6. Preview your input
7. Click create faucet

HOW TO CREATE QUEST:
Step 1: Enter basic details (quest name, image/logo, description)
Step 2: Select token, input numbers of winners, select distribution mode, enter reward pool amount
Step 3: Include campaign tining
Step 4: Add task based on stage
Step 5: Create quest and fund it in the dashboard

NOTE:
- Quest creation automatically create a faucet.

AVAILABLE NETWORK:
- Celo
- Base
- Lisk
- Arbitrum
- Binance Smart Chain

FOUNDED:
2025, Lagos Nigeria.

INTENT DETECTED: ${intent}

SECURITY RULES:
- Never ask for private key
- Never ask for seed phrase
- Never invent pricing
- Never speculate token value
- Be concise and step-driven

RESPONSE STRUCTURE:
1. Direct answer
2. Clear steps
3. Offer next help
4. Include wallet safety reminder if relevant
5. Incase you don't have knowledge of a question, search online to gave a reasonable relative response when possible
`;
}

async function googleSearch(query: string): Promise<string> {
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
    throw new Error('Google Search API key or CX not configured');
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Search API error: ${response.statusText}`);
  }

  const data = await response.json() as GoogleSearchResponse;

  console.log('data from google search', data);
  if (!data.items || data?.items?.length === 0) {
    return 'No results found.';
  }

  // Format top 3 search results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = data.items.slice(0, 3).map((item: any) => {
    return `${item.title}: ${item.link}`;
  });

  return results.join('\n');
}

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    const lowerMsg = message.toLowerCase();

    /**
     * Hard Security Block
     */
    if (
      lowerMsg.includes("private key") ||
      lowerMsg.includes("seed phrase") ||
      lowerMsg.includes("mnemonic")
    ) {
      return NextResponse.json({
        text: "For your security, never share your private key or seed phrase. FaucetDrops support will never request it.",
      });
    }

    /**
     * Escalation check
     */
    if (shouldEscalate(message)) {
      return NextResponse.json({
        text: `This requires direct support from our team. Please contact us via Telegram: ${TELEGRAM_SUPPORT_LINK}`,
      });
    }

    /**
     * Language + Intent Detection
     */
    const language = detectLanguage(message);
    const intent = classifyIntent(message);

    if (intent === 'web_search') {
      try {
        const searchResults = await googleSearch(message);
        return NextResponse.json({
          text: `Here are the top search results:\n${searchResults}`,
          meta: { language, intent },
        });
      } catch (error) {
        console.error('Google Search error:', error);
        // Fallback to Gemini API if search fails
      }
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildSystemPrompt(language, intent),
    });

    const chat = model.startChat({
      history: formatHistory(history),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    let responseText = response.text();

    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    /**
     * Anti-hallucination guard
     */
    if (responseText.toLowerCase().includes("pricing is")) {
      responseText =
        "For pricing information, please contact our support team directly via Telegram.";
    }

    return NextResponse.json({
      text: responseText,
      meta: {
        language,
        intent,
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error:
          "I'm having trouble connecting to the chat service. Please try again shortly.",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}