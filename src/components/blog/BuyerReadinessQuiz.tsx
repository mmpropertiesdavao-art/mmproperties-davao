"use client";

import { useMemo, useState } from "react";

type QuizOption = {
  label: string;
  score: 0 | 1 | 2;
};

type QuizQuestion = {
  section: "Financial readiness" | "Personal readiness";
  text: string;
  options: QuizOption[];
};

const questions: QuizQuestion[] = [
  {
    section: "Financial readiness",
    text: "Do you have a down payment saved that won't leave your bank account empty?",
    options: [
      { label: "Yes", score: 2 },
      { label: "Partially", score: 1 },
      { label: "No", score: 0 },
    ],
  },
  {
    section: "Financial readiness",
    text: "After paying the down payment and closing costs, will you still have 3+ months of living expenses saved?",
    options: [
      { label: "Yes", score: 2 },
      { label: "Partially", score: 1 },
      { label: "No", score: 0 },
    ],
  },
  {
    section: "Financial readiness",
    text: "Would your estimated monthly amortization be 35% or less of your gross monthly income?",
    options: [
      { label: "Yes", score: 2 },
      { label: "Not sure", score: 0 },
      { label: "No", score: 0 },
    ],
  },
  {
    section: "Financial readiness",
    text: "Is your current income stable enough that you're confident about the next 2 years?",
    options: [
      { label: "Yes", score: 2 },
      { label: "Mostly", score: 1 },
      { label: "No", score: 0 },
    ],
  },
  {
    section: "Financial readiness",
    text: "Are you free of high-interest debt that would compete with a mortgage?",
    options: [
      { label: "Yes", score: 2 },
      { label: "Partially", score: 1 },
      { label: "No", score: 0 },
    ],
  },
  {
    section: "Personal readiness",
    text: "Can you clearly state why you want to buy right now — in your own words, not someone else's?",
    options: [
      { label: "Yes", score: 2 },
      { label: "Somewhat", score: 1 },
      { label: "No", score: 0 },
    ],
  },
  {
    section: "Personal readiness",
    text: "Have you spent real time in the neighborhood(s) you're considering — not just on a viewing day?",
    options: [
      { label: "Yes", score: 2 },
      { label: "A little", score: 0 },
      { label: "No", score: 0 },
    ],
  },
  {
    section: "Personal readiness",
    text: "Are you buying because it fits your life — not because of family pressure or fear of missing out?",
    options: [
      { label: "Yes", score: 2 },
      { label: "Mostly", score: 1 },
      { label: "No", score: 0 },
    ],
  },
  {
    section: "Personal readiness",
    text: "Do you have a clear sense of what a successful purchase looks like for you in 5 years?",
    options: [
      { label: "Yes", score: 2 },
      { label: "Vaguely", score: 1 },
      { label: "No", score: 0 },
    ],
  },
  {
    section: "Personal readiness",
    text: "If the buying process took 6–9 months, would that be manageable for your current situation?",
    options: [
      { label: "Yes", score: 2 },
      { label: "Probably", score: 1 },
      { label: "No", score: 0 },
    ],
  },
];

const BUYING_GUIDE_READINESS_URL = "/guides/the-complete-guide-to-buying-property-in-davao-philippines-2026-mm-properties-mqylksqz#part-1-are-you-ready-to-buy-property-in-davao";

function resultFor(score: number) {
  if (score >= 16) {
    return {
      tone: "ready",
      title: "You're likely ready.",
      copy: "Your financial and personal foundations look solid. The next step is finding the right property — not second-guessing the decision to buy.",
      cta: "Get matched with properties using MM Pulse",
      href: "/matcher",
      className: "border-green-200 bg-green-50 text-green-950",
    };
  }
  if (score >= 10) {
    return {
      tone: "almost",
      title: "Almost there — a few things to strengthen.",
      copy: "You're closer than you think, but one or two areas need attention before you commit. Review the readiness section first so you can strengthen the weak spots before shortlisting properties.",
      cta: "Review the buyer readiness guide",
      href: BUYING_GUIDE_READINESS_URL,
      className: "border-gold-200 bg-gold-50 text-navy-950",
    };
  }
  return {
    tone: "prepare",
    title: "Not yet — and that's okay.",
    copy: "Buying now could put you in a more vulnerable position than you need to be. Use this result as a preparation checklist before you commit.",
    cta: "Review the buyer readiness guide",
    href: BUYING_GUIDE_READINESS_URL,
    className: "border-red-100 bg-red-50 text-red-950",
  };
}

export function BuyerReadinessQuiz() {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const answeredCount = answers.filter((answer) => answer !== null).length;
  const score = useMemo(
    () => answers.reduce<number>((total, optionIndex, questionIndex) => total + (optionIndex === null ? 0 : questions[questionIndex].options[optionIndex]?.score || 0), 0),
    [answers]
  );
  const complete = answeredCount === questions.length;
  const result = resultFor(score);

  return (
    <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-gold-700">Buyer readiness quiz</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-navy-950">Are you ready to buy property in Davao?</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-navy-600">
            Answer 10 quick questions. Your score appears at the end with a practical next step.
          </p>
        </div>
        <div className="rounded-full bg-navy-50 px-4 py-2 text-sm font-bold text-navy-700">
          {answeredCount}/{questions.length} answered
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {questions.map((question, index) => (
          <fieldset key={question.text} className="rounded-xl border border-navy-100 bg-navy-50/50 p-4">
            <legend className="sr-only">{question.text}</legend>
            <p className="text-xs font-bold uppercase tracking-wide text-gold-700">{question.section}</p>
            <p className="mt-1 text-base font-bold leading-7 text-navy-900">
              {index + 1}. {question.text}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {question.options.map((option) => {
                const optionIndex = question.options.findIndex((item) => item.label === option.label);
                const selected = answers[index] === optionIndex;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      setAnswers((current) => current.map((answer, itemIndex) => (itemIndex === index ? optionIndex : answer)));
                      setSubmitted(false);
                    }}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm font-bold transition ${
                      selected ? "border-navy-900 bg-navy-900 text-white shadow-sm" : "border-navy-200 bg-white text-navy-700 hover:border-gold-400 hover:bg-gold-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="min-h-11 rounded-md bg-gold-500 px-5 py-3 text-base font-bold text-navy-950 hover:bg-gold-300"
        >
          See my result
        </button>
        <button
          type="button"
          onClick={() => {
            setAnswers(questions.map(() => null));
            setSubmitted(false);
          }}
          className="min-h-11 rounded-md border border-navy-200 px-5 py-3 text-base font-bold text-navy-700 hover:border-gold-400"
        >
          Reset
        </button>
        {!complete && submitted && <p className="text-sm font-semibold text-red-700">Please answer all questions to see your result.</p>}
      </div>

      {submitted && complete && (
        <div className={`mt-6 rounded-2xl border p-5 ${result.className}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-2xl font-black">{score}/20 — {result.title}</h3>
            <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black uppercase tracking-wide">{result.tone}</span>
          </div>
          <p className="mt-3 text-base leading-7">{result.copy}</p>
          <a href={result.href} className="mt-5 inline-flex min-h-11 items-center rounded-md bg-navy-900 px-5 py-3 text-base font-bold text-white hover:bg-navy-700">
            {result.cta}
          </a>
        </div>
      )}
    </section>
  );
}
