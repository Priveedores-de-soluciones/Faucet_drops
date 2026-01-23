import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Faq() {
  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
      defaultValue="item-1"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>How do I start a quest?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            Browse active quests, click &quot;Start Quest&quot;, and begin
            completing tasks. Track your progress on the quest page.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>
          Can I participate in multiple quests?{" "}
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>Yes! Participate in as many quests as you like simultaneously.</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>How are points calculated?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            Each task has a predetermined point value based on difficulty and
            type. Points are awarded immediately upon task verification.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-4">
        <AccordionTrigger>
          How long do I have to claim rewards?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            Claim windows are typically 30 days from the winner&apos;s
            announcement. Check specific quest details.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-5">
        <AccordionTrigger>
          What if I&apos;m not selected as a winner?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            Some quests offer threshold-based rewards where everyone who reaches
            certain point totals receives tokens.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-6">
        <AccordionTrigger>Can I see who&apos;s winning?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            Yes, leaderboards are updated in real-time during the quest period.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-7">
        <AccordionTrigger>Are creative submissions reviewed?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            Yes, submissions requiring creativity or originality are manually
            reviewed by quest creators or FaucetDrops team.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-8">
        <AccordionTrigger>
          What happens if I&apos;m disqualified?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            Disqualified participants forfeit all points and rewards. Common
            reasons: bots, multiple accounts, plagiarism, fake engagement.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-9">
        <AccordionTrigger>How do referrals work?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            Share your unique referral link. When someone joins using your link
            and earns points, you receive bonus points.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-10">
        <AccordionTrigger>
          Can quest rules change mid-campaign?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-balance">
          <p>
            Minor clarifications may be added, but major changes (point values,
            rewards) cannot be changed once the quest is live.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
