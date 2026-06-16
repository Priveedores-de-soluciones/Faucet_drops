import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function QuizFaq() {
  return (
    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
      <AccordionItem value="item-1">
        <AccordionTrigger className="text-xl">How do I join a live quiz?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            Browse active or upcoming quizzes. If a quiz is in the &quot;Waiting&quot; status, you can enter the lobby. Once the creator starts the game, you&apos;ll be prompted to answer questions in real-time.
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-2">
        <AccordionTrigger className="text-xl">How is the score calculated?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            Scoring is based on two factors: <strong>Accuracy</strong> and <strong>Speed</strong>. A correct answer grants a base of 1,000 points, plus a bonus of up to 1,000 points based on how quickly you submitted your answer compared to the time limit.
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-3">
        <AccordionTrigger className="text-xl">What is &quot;Ready&quot; status in the lobby?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            To ensure a fair start, creators may require all participants to click &quot;Ready.&quot; The quiz cannot begin until everyone in the lobby has confirmed they are present.
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-4">
        <AccordionTrigger className="text-xl">How do rewards work for Quizzes?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            Creators fund a reward pool before the quiz starts. Once the quiz ends, the System automatically calculates winners based on the distribution model (Equal, Quadratic, or Custom) and whitelists them for onchain claims.
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-5">
        <AccordionTrigger className="text-xl">What happens if I disconnect?</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4 text-lg">
          <p>
            Our system uses WebSockets to maintain your connection. If you refresh or disconnect, you can rejoin the quiz as long as it is still active, but you may miss the current question.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}