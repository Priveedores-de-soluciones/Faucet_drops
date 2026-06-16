import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const earnerFaqs = [
  {
    id: "e1",
    q: "How do I start a quest?",
    a: "Browse active quests, click into one, and begin completing tasks in the Beginner stage. Your progress is tracked in real-time on the quest page.",
  },
  {
    id: "e2",
    q: "Can I participate in multiple quests at once?",
    a: "Yes. You can join and progress through multiple active quests simultaneously, as long as each campaign's individual eligibility requirements are met.",
  },
  {
    id: "e3",
    q: "How are points calculated?",
    a: "Each task has a fixed point value set by the quest creator. Points are awarded after your submission is verified. Your total determines your position and reward allocation.",
  },
  {
    id: "e4",
    q: "How long do I have to claim rewards?",
    a: "The default claim window is 168 hours (7 days) after the campaign ends. Each quest may specify a different window — check the quest page. Unclaimed rewards after the window may be forfeited.",
  },
  {
    id: "e5",
    q: "How will I know what reward model is used?",
    a: "The distribution model (Equal or Custom Tier) is shown on the quest page before you start. It cannot change after the campaign launches.",
  },
  {
    id: "e6",
    q: "Are creative submissions manually reviewed?",
    a: "Yes. Creative tasks require manual review by the quest creator or their team. Allow extra time for these compared to automated social or onchain tasks.",
  },
  {
    id: "e7",
    q: "What happens if I'm disqualified?",
    a: "Violations of the fair play policy, use of bots, or duplicate accounts result in disqualification. Your points will be voided and you will not receive rewards for that campaign.",
  },
  {
    id: "e8",
    q: "Can quest rules change mid-campaign?",
    a: "Core parameters — reward pool, token, distribution model, and timeline — are locked at creation. Task-level adjustments may occur at the creator's discretion within platform guidelines.",
  },
  {
    id: "e9",
    q: "What does it mean when a quest shows an 'Unfunded' warning?",
    a: "It means the quest creator has not yet deposited the reward pool into the smart contract. The warning appears after 3 days without funding. You can still complete tasks, but rewards will not be distributed unless the creator funds the pool before the campaign ends. Proceed with caution.",
  },
];

const creatorFaqs = [
  {
    id: "c1",
    q: "What do I need before I can subscribe?",
    a: "You need a username and at least one linked social handle (X, Discord, Telegram, or Farcaster) set up in your dashboard. The subscription payment will not be accepted until these are in place.",
  },
  {
    id: "c2",
    q: "What chains are supported for subscriptions and reward contracts?",
    a: "Celo, Base, Arbitrum, BNB Chain, and Lisk. Make sure your wallet is connected to a supported network before subscribing or deploying a reward contract.",
  },
  {
    id: "c3",
    q: "Can I edit a quest after publishing?",
    a: "The reward token and distribution model are locked after publishing. Task-level changes and draft edits can be made freely before the quest goes live.",
  },
  {
    id: "c4",
    q: "What happens if I don't fund the reward pool in time?",
    a: "The claim window will still open after the campaign ends, but no rewards will be distributed. Participants who completed tasks will receive nothing. An 'Unfunded' warning banner will appear on your quest page 3 days after launch if the pool has not been deposited — this is visible to all participants.",
  },
  {
    id: "c5",
    q: "Does FaucetDrops hold my reward funds?",
    a: "No. Funds are held in the deployed smart contract, not by FaucetDrops. Participants can see the funding status in real time on the quest page.",
  },
  {
    id: "c6",
    q: "Do I need to manually pay out winners?",
    a: "No. Once the claim window opens, verified winners claim their rewards gaslessly through FaucetDrops faucets automatically. No action is required from you after the campaign ends.",
  },
  {
    id: "c7",
    q: "How do I set up Discord or Telegram auto-verification?",
    a: "For Discord: invite the FaucetDrops bot to your server and enter the Server ID in the task form — use the in-form checker to confirm detection. For Telegram: add the FaucetDrops bot as an administrator and verify its admin status using the in-form status checker.",
  },
  {
    id: "c8",
    q: "Are subscriptions refundable?",
    a: "No. The $100 USDT subscription fee is non-refundable. If a funded quest is cancelled after launch, contact FaucetDrops support for resolution.",
  },
  {
    id: "c9",
    q: "What is demo mode good for?",
    a: "Demo mode lets you test the full creation flow with up to 5 participants — ideal for your team to walk through the experience before going public. It's free but limited to auto-verify tasks only and not visible in the public quest browser.",
  },
];

function FaqList({ items }: { items: typeof earnerFaqs }) {
  return (
    <Accordion type="single" collapsible className="w-full" defaultValue={items[0].id}>
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger className="text-xl text-left">{item.q}</AccordionTrigger>
          <AccordionContent className="text-lg text-gray-300">
            <p>{item.a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function EarnerFaq() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎯</span>
        <h3 className="text-lg font-semibold text-gray-300">For Participants</h3>
      </div>
      <FaqList items={earnerFaqs} />
    </div>
  );
}

export function CreatorFaq() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🛠</span>
        <h3 className="text-lg font-semibold text-gray-300">For Creators</h3>
      </div>
      <FaqList items={creatorFaqs} />
    </div>
  );
}

/** Legacy export — keeps any existing <Faq /> usage working */
export function Faq({ role = "creator" }: { role?: "earner" | "creator" }) {
  return role === "creator" ? <CreatorFaq /> : <EarnerFaq />;
}