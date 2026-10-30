import type { Tip, TipCategory } from "@/lib/types";

export const TIP_CATEGORIES: TipCategory[] = [
  "Focus & concentration",
  "Study techniques",
  "Breaks & rest",
  "Time management",
  "Distraction control",
  "Exam preparation",
  "Habit building",
] as const;

export const TIPS: Tip[] = [
  {
    id: "t-pomodoro-why",
    category: "Focus & concentration",
    title: "Why 25-minute sessions work",
    summary: "The Pomodoro method turns an intimidating pile of work into 25 slice-sized promises.",
    body: [
      "Commit to exactly 25 focused minutes — one timer, one task, no exceptions. When the timer rings, you have earned a real 5-minute break, away from the screen if possible.",
      "Short commitments matter because starting is the hardest part. 25 minutes is short enough that your brain doesn't resist, and long enough to slip into flow. After 3–4 sessions, take a longer 15–30 minute break to reset attention completely.",
      "Track each completed session in Cocorena — watching the day's focus minutes climb is usually motivation enough to do one more.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-one-task",
    category: "Focus & concentration",
    title: "One task per session",
    summary: "Multitasking during a focus block quietly destroys its value.",
    body: [
      "Before you press start, write down the single outcome you want from this session — not the subject, the specific outcome: 'solve 3 integration problems', not 'study maths'.",
      "When a different task pops into your head, don't chase it: jot it on your task list in Cocorena and return to the session. Jotting is enough to stop it looping in your memory.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-attention-muscle",
    category: "Focus & concentration",
    title: "Attention is a muscle you can train",
    summary: "Expect bad sessions at first. Consistency beats intensity.",
    body: [
      "If you haven't studied in a while, your first sessions may feel uncomfortable — attention wanders within minutes. That's normal, not a personal failing.",
      "Train like you would in a gym: begin with the standard 25 minutes, treat each session as a rep, and let consistency compound. Most people notice visibly stronger focus within about two weeks of daily practice.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-active-recall",
    category: "Study techniques",
    title: "Active recall beats re-reading",
    summary: "Testing yourself is slower and harder — and dramatically more effective.",
    body: [
      "Close the book and write down, from memory, everything you remember about the topic. What you can't recall is the actual map of what you still need to study.",
      "Use flashcards, practice problems, or simply explain the concept out loud as if teaching a friend. If you can't explain it simply, you've found exactly where to go next.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-spaced-repetition",
    category: "Study techniques",
    title: "Space it out, don't cram it",
    summary: "Review at expanding intervals: today, three days, one week, one month.",
    body: [
      "Memory strengthens most when recall happens just as you're about to forget. Schedule short review sessions at expanding intervals — the same day, three days later, a week later, then a month.",
      "A practical routine: end every study day with a 10-minute recap of what you learned today, and start the next session with five minutes of reviewing yesterday's recap.",
    ],
    readMinutes: 3,
  },
  {
    id: "t-feynman",
    category: "Study techniques",
    title: "The Feynman technique",
    summary: "Explain it plainly, find the gaps in your explanation, then fill them.",
    body: [
      "Take a blank page. Explain the concept as if you were teaching it to a curious 12-year-old — plain words, no hiding behind jargon.",
      "Wherever your explanation stumbles or becomes vague, that's a gap. Return to the material focused on exactly those gaps, then rewrite the explanation until it flows.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-break-quality",
    category: "Breaks & rest",
    title: "Make breaks actually restful",
    summary: "Scrolling is not rest. Move your body, rest your eyes, breathe.",
    body: [
      "During breaks, avoid feeding your attention more inputs (feeds, videos, messaging). Aim for what restores attention: walk, stretch, look out a window at something far away, drink water.",
      "Follow the 20-20-20 rule for screens: every 20 minutes, look at something 20 feet (6 m) away for 20 seconds. Blood flow and distance-focus genuinely help the next session start cleanly.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-sleep",
    category: "Breaks & rest",
    title: "Sleep is study time",
    summary: "Memory consolidation happens while you sleep — cutting sleep to study costs you marks.",
    body: [
      "A full night's sleep after studying measurably improves retention compared with staying up to review more. Trade 'extra tired revision' for an extra hour of sleep whenever exams are close.",
      "Keep a consistent sleep and wake time even on weekends — stable sleep makes morning and evening study sessions far more reliable.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-eat-the-frog",
    category: "Time management",
    title: "Hardest task first",
    summary: "Spend your freshest attention on what matters most, not what's easiest.",
    body: [
      "Do the highest-priority task in your very first focus session of the day, before email or messages. Later sessions, when energy dips, are better for mechanical or easier work.",
      "In Cocorena, mark your big task High priority — the Pomodoro page then suggests it automatically as the session's target.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-plan-tomorrow",
    category: "Time management",
    title: "Plan tomorrow tonight",
    summary: "A five-minute plan the night before removes all morning friction.",
    body: [
      "Each evening, write tomorrow's 3–5 tasks and roughly when you'll do them. Decisions made in advance protect you from decision fatigue the next morning.",
      "Planning checks itself quickly: if tasks keep rolling over for days, they're either too big (split them) or not actually important (drop or shrink them).",
    ],
    readMinutes: 2,
  },
  {
    id: "t-timebox-waiting",
    category: "Time management",
    title: "Countdowns beat vague intentions",
    summary: "A visible deadline turns 'soon' into 'now'.",
    body: [
      "For small dreadful tasks (tidying notes, sending one email, revising one page), set a 10–15 minute countdown and race it, gently. Most tasks of this type finish well inside the limit — starting was the only problem.",
      "Use Countdown for these one-off races, then hold a short Pomodoro for real study.",
    ],
    readMinutes: 1,
  },
  {
    id: "t-phone-away",
    category: "Distraction control",
    title: "Distance beats willpower",
    summary: "A phone on another room is worth more focus than a phone on silent face-down.",
    body: [
      "Every glance at a notification fragments attention for a little while afterward. Remove the temptation physically: another room during focus sessions is the reliable method.",
      "If you must have it near, use airplane mode and place it face-down, out of reach. Tell people who routinely message you when your focus hours are.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-environment",
    category: "Distraction control",
    title: "Set the stage before you start",
    summary: "One tidy desk, one book, one page open — remove every competing cue.",
    body: [
      "Prepare your environment before the timer: close all tabs but the ones you need, hide snacks and devices you don't need, and put the day's study material in front of you.",
      "Consistency helps too — studying in roughly the same spot trains your brain to enter work mode there. Keep that spot for work, not scrolling.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-start-ritual",
    category: "Distraction control",
    title: "Build a two-minute starting ritual",
    summary: "Same gesture, same phrase, same first step — every single session.",
    body: [
      "Decide on a fixed pre-study routine: fill a water bottle, clear the desk, write today's task, press Start. Repeating it daily makes 'begin' almost automatic.",
      "Never negotiate with yourself about whether to start; the ritual exists so the decision was already made yesterday.",
    ],
    readMinutes: 1,
  },
  {
    id: "t-exam-plan-backwards",
    category: "Exam preparation",
    title: "Plan backwards from the exam date",
    summary: "Count available days, budget them, and leave a real buffer week.",
    body: [
      "List each subject, estimate sessions it needs, and distribute those across the days you have. Reserve the final week for full past papers and weak spots, not new material.",
      "Review the plan every two or three days and reallocate honestly — plans are worthless if they aren't revised against reality.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-past-papers",
    category: "Exam preparation",
    title: "Past papers first, notes second",
    summary: "Practise under exam-like conditions to find what you actually don't know.",
    body: [
      "Doing past-paper questions early tells you what the exam rewards and which topics hurt. Vague comfort with notes is not the same as being able to produce answers under time pressure.",
      "After each paper, mark yourself strictly, log the failed topics as tasks, and turn those into next week's study sessions.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-exam-day",
    category: "Exam preparation",
    title: "The day before the exam",
    summary: "Light review, sleep early, prepare everything physically the night before.",
    body: [
      "No new material the day before — review summaries, formulas, and your error log instead. Panic-paced cramming flickers through short-term memory and evaporates.",
      "Pack everything (admit card, pens, calculator, water) the night before, sleep early and wake on time. Calm beats cluttered.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-habit-stacking",
    category: "Habit building",
    title: "Stack the habit onto something existing",
    summary: "Attach studying to an anchor you already do every day.",
    body: [
      "Formula: 'After [existing anchor], I will study for one Pomodoro.' Good anchors: after breakfast, after returning home, after evening tea. Fix the anchor, then fix the location.",
      "Use the same anchor daily. Missing once is a data point; missing twice is the start of a new pattern, so protect the second day especially.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-never-two",
    category: "Habit building",
    title: "Never miss twice",
    summary: "The streak isn't about being perfect — it's about bouncing back fast.",
    body: [
      "A missed day in Cocorena's grove is one empty coconut, not a verdict. The rule that matters: never miss two days running.",
      "On low-energy days, do one gentle 25-minute session rather than aiming for your full plan — keeping the all-or-nothing switch out of the loop is what sustains long streaks.",
    ],
    readMinutes: 2,
  },
  {
    id: "t-tracking-motivates",
    category: "Habit building",
    title: "What gets measured gets grown",
    summary: "Watch minutes accumulate, harvest coconuts, let visible progress drag you forward.",
    body: [
      "Checking your focus minutes daily is itself a habit loop: a small reminder, an honest record, a visible reward. The Grove makes streaks visible so a used-up streak feels like a real loss — and protecting it has real value.",
      "Aim at a floor, not a ceiling: 25 minutes a day is not the goal's limit but its minimum. Great days do more; ordinary days keep the streak alive.",
    ],
    readMinutes: 2,
  },
];

export const PRODUCTIVITY_TIP_IDS = TIPS.map((t) => t.id);
