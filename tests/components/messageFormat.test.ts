import { describe, it, expect } from "vitest";
import { deshout, parseBlocks } from "@/components/MessageBody";

describe("deshout", () => {
  it("calms multi-word ALL-CAPS runs to sentence case", () => {
    expect(deshout("FILE THE ONLINE APPLICATION")).toBe("File the online application");
    expect(deshout("PREPARE THESE DOCUMENTS")).toBe("Prepare these documents");
    expect(deshout("FREE TUITION COVERAGE")).toBe("Free tuition coverage");
  });

  it("calms a lone caps word of 4+ letters", () => {
    expect(deshout("PRINT the form")).toBe("Print the form");
    expect(deshout("PAYMENT (misc fees)")).toBe("Payment (misc fees)");
    expect(deshout("REGISTRATION")).toBe("Registration");
  });

  it("preserves acronyms in KEEP and mixed-case brand tokens", () => {
    expect(deshout("Receive the NOA and COR")).toBe("Receive the NOA and COR");
    expect(deshout("Free tuition under RA 10931")).toBe("Free tuition under RA 10931");
    expect(deshout("CvSU is a SUC")).toBe("CvSU is a SUC");
  });

  it("leaves lone short caps tokens (<=3 letters) alone", () => {
    expect(deshout("Your GWA and PWD status")).toBe("Your GWA and PWD status");
    expect(deshout("Bring an ID")).toBe("Bring an ID");
  });

  it("keeps digits and hyphenated acronyms intact inside a run", () => {
    // "STEM strand" — STEM is KEEP, so the run isn't triggered and it stays.
    expect(deshout("STEM strand")).toBe("STEM strand");
  });

  it("does not touch casing inside URLs, code, bold, or paths", () => {
    expect(deshout("see `GET /API` now")).toBe("see `GET /API` now");
    expect(deshout("go to https://EXAMPLE.com/PATH")).toBe("go to https://EXAMPLE.com/PATH");
    expect(deshout("**NOTE** this")).toBe("**NOTE** this");
    expect(deshout("open C:\\WINDOWS\\SYSTEM now")).toBe("open C:\\WINDOWS\\SYSTEM now");
  });

  it("leaves a time range intact (digit token doesn't seed a caps run)", () => {
    expect(deshout("Open Mon–Fri, 7 AM–6 PM")).toBe("Open Mon–Fri, 7 AM–6 PM");
  });

  it("de-shouts around a preserved inline span", () => {
    expect(deshout("FILE THE APPLICATION at https://a.co/B")).toBe(
      "File the application at https://a.co/B",
    );
  });
});

describe("parseBlocks", () => {
  it("nests bullets under the preceding numbered step", () => {
    const blocks = parseBlocks("1. PREPARE THESE DOCUMENTS:\n- Report card\n- Good moral");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("ordered_list");
    const ol = blocks[0] as Extract<ReturnType<typeof parseBlocks>[number], { kind: "ordered_list" }>;
    expect(ol.items).toHaveLength(1);
    expect(ol.items[0].subs).toEqual(["Report card", "Good moral"]);
  });

  it("keeps a standalone bullet list flat when no numbered step precedes it", () => {
    const blocks = parseBlocks("Requirements:\n- A\n- B");
    const ul = blocks.find((b) => b.kind === "bullet_list") as
      | Extract<ReturnType<typeof parseBlocks>[number], { kind: "bullet_list" }>
      | undefined;
    expect(ul).toBeDefined();
    expect(ul!.items).toEqual(["A", "B"]);
  });

  it("detects an ALL-CAPS line as a heading", () => {
    const blocks = parseBlocks("GENERAL ELIGIBILITY:\n\nSome text.");
    expect(blocks[0].kind).toBe("heading");
    expect(blocks[1].kind).toBe("paragraph");
  });

  it("keeps consecutive numbered steps in one ordered list", () => {
    const blocks = parseBlocks("1. First step\n2. Second step\n3. Third step");
    expect(blocks).toHaveLength(1);
    const ol = blocks[0] as Extract<ReturnType<typeof parseBlocks>[number], { kind: "ordered_list" }>;
    expect(ol.items.map((i) => i.text)).toEqual(["First step", "Second step", "Third step"]);
    expect(ol.start).toBe(1);
  });

  it("splits the appended provenance line into a note block", () => {
    const blocks = parseBlocks("Body text.\n\n\u{1F4D6} Source: Citizens' Charter, p. 1694");
    const note = blocks.find((b) => b.kind === "note") as
      | Extract<ReturnType<typeof parseBlocks>[number], { kind: "note" }>
      | undefined;
    expect(note).toBeDefined();
    expect(note!.text).toBe("Source: Citizens' Charter, p. 1694");
  });

  it("does not strand the marker of an already-numbered list", () => {
    // Regression: a server-side prettifier used to split on the "1. " marker,
    // emitting "1." as its own paragraph above the step text.
    const blocks = parseBlocks("1. FILE THE APPLICATION at https://a.co/b\n2. PRINT the form.");
    expect(blocks).toHaveLength(1);
    expect(blocks.some((b) => b.kind === "paragraph")).toBe(false);
  });
});
