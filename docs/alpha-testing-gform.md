# Sevi Alpha Testing — Google Form Template

Build this in Google Forms as written. Target: ~3 minutes to answer.
Every question lists its GForms question type.

## Form settings (Settings tab — do this first)

- **Collect email addresses: OFF** — this is the technical control that makes the
  anonymity claim in the Privacy Notice true. An *optional* contact field at the
  end covers follow-ups instead.
- **Limit to 1 response: OFF** (it forces sign-in, which kills anonymity; alpha
  volume is small enough to tolerate duplicates).
- Required questions: only Q0–Q1 and Q4–Q8. Open-ended questions stay optional —
  forced paragraphs produce junk data.

## Form description (Privacy Notice — RA 10173)

> **Privacy Notice (RA 10173 — Data Privacy Act of 2012):** This survey collects
> your feedback to improve Sevi, CvSU's virtual assistant. Responses are
> **anonymous by default** — we do not collect names, emails, or student numbers
> unless you voluntarily provide an email for follow-up. Responses are stored
> securely, accessed only by the Sevi development team, used solely for improving
> the service, and retained only for the duration of the testing program, after
> which identifiable data is deleted. Participation is voluntary and you may stop
> at any time. You may request access, correction, or deletion of your data
> through the CvSU Data Protection Officer (dpo@cvsu.edu.ph).
>
> Sevi is in Alpha. Try it for 5 minutes, then answer honestly — critical
> feedback is the most useful kind. No sign-in needed.

*(Verify the DPO contact address before publishing.)*

## Section 0 — Consent

| # | Question | Type | Notes |
|---|----------|------|-------|
| 0 | I have read the Privacy Notice and voluntarily consent to the collection and processing of my responses as described. | Multiple choice — single option "I agree" | **Required.** A respondent who doesn't consent simply closes the form. |

## Section 1 — About you

| # | Question | Type | Notes |
|---|----------|------|-------|
| 1 | I am a… (Student / Faculty / Staff / Alumni / Guest) | Multiple choice | Required |
| 2 | Campus / College | Dropdown | Include **"Prefer not to say"** — combined demographics can be identifying in small colleges |
| 3 | How many times have you used Sevi? (First time / 2–5 / 6+) | Multiple choice | |

## Section 2 — Try these tasks first

Section description: *"Open Sevi and try each task, then rate what you got."*

| # | Question | Type | Notes |
|---|----------|------|-------|
| 4 | Rate each task | Multiple-choice grid | Required. **Rows:** Ask about admission requirements · Ask about tuition/fees · Ask about your college's programs · Open the campus map. **Columns:** Correct & complete / Partially helpful / Wrong or outdated / No answer (fallback). One glance at results = task accuracy rate. |

## Section 3 — Experience (core metrics; comparable alpha → beta)

| # | Question | Type | Notes |
|---|----------|------|-------|
| 5 | Sevi was easy to use | Linear scale 1–5 (Disagree → Agree) | Required |
| 6 | Replies were fast enough | Linear scale 1–5 | Required |
| 7 | I trust the accuracy of Sevi's answers | Linear scale 1–5 | Required |
| 8 | How likely are you to recommend Sevi to a fellow Iskolar? | Linear scale 0–10 | Required — this is the NPS |

## Section 4 — Problems & the feedback buttons

| # | Question | Type | Notes |
|---|----------|------|-------|
| 9 | Which problems did you hit? (Wrong answer / Outdated info / Didn't understand my question / Too slow / Hard to read on my phone / Widget wouldn't open / None) | Checkboxes | Multi-select |
| 10 | Did you tap 👍/👎 on any reply? (Yes / No — didn't notice them / No — didn't bother) | Multiple choice | Measures the feedback-poster's effectiveness |
| 11 | If Sevi gave you a wrong answer, what did you ask? (paste your exact question) | Paragraph | Optional — verbatim wrong questions feed the eval harness directly |

## Section 5 — Open feedback

| # | Question | Type | Notes |
|---|----------|------|-------|
| 12 | What's the ONE thing we should fix first? | Paragraph | Optional |
| 13 | Anything you wish Sevi could do? | Paragraph | Optional |
| 14 | (Optional) Email — only if you're OK with follow-up questions | Short answer + Response validation → Text → Email address | Description: *"Voluntary. Used only to follow up on your feedback, visible only to the Sevi dev team, deleted when alpha testing ends. Providing it is separate consent for this purpose."* |

## Why these types

- **Linear scale** for anything tracked over time (comparable across test rounds).
- **Multiple-choice grid** for task success — one question, four data points.
- **Checkboxes** only where multiple answers are genuinely true.
- **Dropdown** for long option lists (colleges/campuses).
- Optional paragraphs, never required — quality over volume.

## DPA compliance checklist before publishing

- [ ] Privacy notice in the form description (purpose, scope, retention, rights, DPO contact)
- [ ] Consent question (Q0) required, first
- [ ] "Collect email addresses" setting OFF
- [ ] DPO contact verified
- [ ] Response spreadsheet access restricted to the dev team
- [ ] Calendar reminder: delete identifiable data (Q14 emails) when alpha ends
