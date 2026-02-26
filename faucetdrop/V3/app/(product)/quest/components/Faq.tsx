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
        <AccordionTrigger className="text-xl">How do I start a quest?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            Browse active quests, click into one, and begin completing the tasks listed in the Beginner stage. Your progress is tracked in real-time on the quest page.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger className="text-xl">
          What does Strict Progression Mode mean?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            When enabled, you must reach the pass requirement (70% of stage points) before unlocking the next stage. Not all quests use this mode.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger className="text-xl">
          Can I participate in multiple quests simultaneously?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            Yes. You can join and progress through multiple active quests at the same time, as long as each campaign&apos;s individual eligibility requirements are met.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-4">
        <AccordionTrigger className="text-xl">How are points calculated?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            Each task has a fixed point value set by the quest creator. Points are awarded after your submission is verified. Your total points determine your position and reward allocation.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-5">
        <AccordionTrigger className="text-xl">
          How long do I have to claim rewards?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            The default claim window is 168 hours (7 days) after the campaign ends. Each quest may specify a different window. Unclaimed rewards after this window may be forfeited.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-6">
        <AccordionTrigger className="text-xl">
          What distribution model will I be rewarded under?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            The model (Equal, Proportional, or Top Winners) is set by the creator and shown on the quest page before you start. It does not change after the campaign launches.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-7">
        <AccordionTrigger className="text-xl">
          Are creative submissions manually reviewed?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            Yes. Creative tasks typically require manual review by the quest creator or their team. Allow extra time for these tasks to be verified compared to automated social tasks.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-8">
        <AccordionTrigger className="text-xl">
          What happens if I&apos;m disqualified?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            Violations of the fair play policy, use of bots, or duplicate accounts result in disqualification. Your points will be voided and you will not receive rewards for that campaign.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-9">
        <AccordionTrigger className="text-xl">
          Can quest rules change mid-campaign?
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            Core parameters (reward pool, token, distribution model, timeline) are locked at creation. Task-level adjustments may occur at the creator&apos;s discretion within platform guidelines.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
