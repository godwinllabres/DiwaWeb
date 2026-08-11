import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatMessage } from "@/components/ChatMessage";
import { DV_AVAILABLE_ACTIONS } from "@/lib/dvWorkflow";
import type { DvCard } from "@/lib/types";
import type { UseAuthApi } from "@/lib/hooks/useAuth";

/**
 * CHARACTERIZATION tests for the DV detail card (DvDetailCard) and its write
 * actions (WriteActions) inside app/components/ChatMessage.tsx, exercised
 * through the public <ChatMessage> surface.
 *
 * These pin CURRENT behaviour ahead of a module split. Nothing here is a
 * judgement about whether the behaviour is right; several assertions
 * deliberately lock in quirks, and those are flagged in comments.
 */

// Shape taken from DvCard in app/lib/api.ts (re-exported by app/lib/types.ts).
function makeDv(overrides: Partial<DvCard> = {}): DvCard {
  return {
    kind: "dv",
    name: "DV-2026-00123",
    control_number: "CN-0001",
    payee: "Juan Dela Cruz",
    amount: 12345.5,
    workflow_status: "Submitted",
    posting_date: "2026-07-01",
    fund_cluster: "01 - Regular Agency Fund",
    ors_burs_reference: "ORS-2026-0099",
    dv_type: "Regular",
    desk_url: "https://ais.example.edu/app/ais-disbursement-voucher/DV-2026-00123",
    modified: "2026-07-02 09:00:00",
    ...overrides,
  };
}

// Minimal stub of UseAuthApi (app/lib/hooks/useAuth.ts). identity=null is the
// logged-out case; pass an AisIdentity to simulate a signed-in clerk.
function makeAis(overrides: Partial<UseAuthApi> = {}): UseAuthApi {
  return {
    identity: null,
    busy: false,
    error: null,
    login: vi.fn(async () => true),
    logout: vi.fn(async () => {}),
    hasAnyRole: vi.fn(() => true),
    ...overrides,
  };
}

const LOGGED_IN = {
  identity: {
    user: "clerk@cvsu.edu.ph",
    full_name: "Accounting Clerk",
    roles: ["Accounts User"],
    expires_in: 3600,
  },
};

function renderDv(dv: DvCard, extra: Record<string, unknown> = {}) {
  return render(
    <ChatMessage
      message="Here is the voucher."
      isBot={true}
      timestamp="12:00"
      cards={[dv]}
      {...extra}
    />,
  );
}

/** Every distinct button label the transition matrix can offer. */
const ALL_ACTION_LABELS = Array.from(
  new Set(
    Object.values(DV_AVAILABLE_ACTIONS).flatMap((opts) => opts.map((o) => o.label)),
  ),
);

describe("DV detail card — fields", () => {
  it("renders the DV name as a link to the desk URL", () => {
    const dv = makeDv();
    renderDv(dv);
    const link = screen.getByRole("link", { name: dv.name });
    expect(link).toHaveAttribute("href", dv.desk_url);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders control number, payee and the workflow status", () => {
    renderDv(makeDv());
    expect(screen.getByText("CN-0001")).toBeInTheDocument();
    expect(screen.getByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("formats the amount as PHP currency with two decimals", () => {
    renderDv(makeDv({ amount: 12345.5 }));
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("₱12,345.50")).toBeInTheDocument();
  });

  // `dv.amount || 0` — a zero (or any falsy amount) still renders a formatted
  // ₱0.00 rather than blank.
  it("renders ₱0.00 for a zero amount", () => {
    renderDv(makeDv({ amount: 0 }));
    expect(screen.getByText("₱0.00")).toBeInTheDocument();
  });

  it("renders the optional detail rows when present", () => {
    renderDv(makeDv());
    expect(screen.getByText("Posting date")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01")).toBeInTheDocument();
    expect(screen.getByText("Fund cluster")).toBeInTheDocument();
    expect(screen.getByText("01 - Regular Agency Fund")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Regular")).toBeInTheDocument();
    expect(screen.getByText("ORS / BURS")).toBeInTheDocument();
    expect(screen.getByText("ORS-2026-0099")).toBeInTheDocument();
  });

  it("omits the optional rows (and the control number) when they are null", () => {
    renderDv(
      makeDv({
        control_number: null,
        posting_date: null,
        fund_cluster: null,
        ors_burs_reference: null,
        dv_type: null,
      }),
    );
    expect(screen.queryByText("CN-0001")).not.toBeInTheDocument();
    expect(screen.queryByText("Posting date")).not.toBeInTheDocument();
    expect(screen.queryByText("Fund cluster")).not.toBeInTheDocument();
    expect(screen.queryByText("Type")).not.toBeInTheDocument();
    expect(screen.queryByText("ORS / BURS")).not.toBeInTheDocument();
    // Amount is unconditional, so the card still has its one detail row.
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });

  it("falls back to an em dash when the payee is empty", () => {
    renderDv(makeDv({ payee: "" }));
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("always offers an 'Open in AIS Desk' link pointing at the desk URL", () => {
    const dv = makeDv();
    renderDv(dv);
    expect(screen.getByRole("link", { name: /open in ais desk/i })).toHaveAttribute(
      "href",
      dv.desk_url,
    );
  });
});

describe("DV detail card — status badge", () => {
  it("renders the status text for a KNOWN status", () => {
    renderDv(makeDv({ workflow_status: "Approved" }));
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  // The tint map has no entry for this status; the card must still render the
  // status verbatim rather than crashing or blanking (tint falls back).
  it("renders an UNKNOWN status verbatim instead of crashing", () => {
    renderDv(makeDv({ workflow_status: "Pending Review by Ombudsman" }));
    expect(screen.getByText("Pending Review by Ombudsman")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DV-2026-00123" })).toBeInTheDocument();
  });

  // QUIRK: an empty workflow_status is displayed as the literal word "Unknown".
  it("shows 'Unknown' when workflow_status is an empty string", () => {
    renderDv(makeDv({ workflow_status: "" }));
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});

describe("DV detail card — write-action gating", () => {
  it("renders no action buttons when writeEnabled is not passed", () => {
    renderDv(makeDv(), { sessionId: "sess-1", ais: makeAis(LOGGED_IN) });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders no action buttons when writeEnabled is false", () => {
    renderDv(makeDv(), {
      writeEnabled: false,
      sessionId: "sess-1",
      ais: makeAis(LOGGED_IN),
    });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders no action buttons when sessionId is missing", () => {
    renderDv(makeDv(), { writeEnabled: true, ais: makeAis(LOGGED_IN) });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders no action buttons when ais is absent", () => {
    renderDv(makeDv(), { writeEnabled: true, sessionId: "sess-1" });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  // QUIRK worth pinning precisely: the buttons are NOT gated on being signed
  // in. A logged-out `ais` (identity === null) still gets the full button row;
  // authentication is enforced at click time by opening the login modal, not
  // by hiding the actions.
  it("still renders the action buttons for a logged-OUT ais", () => {
    renderDv(makeDv({ workflow_status: "Submitted" }), {
      writeEnabled: true,
      sessionId: "sess-1",
      ais: makeAis(),
    });
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send to IA Audit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});

describe("DV detail card — actions match DV_AVAILABLE_ACTIONS", () => {
  // Driven straight off the exported transition matrix so this test cannot
  // drift from the source of truth if the matrix changes.
  it.each(Object.keys(DV_AVAILABLE_ACTIONS))(
    "offers exactly the matrix's actions for status %s",
    (status) => {
      const expected = DV_AVAILABLE_ACTIONS[status].map((o) => o.label);
      renderDv(makeDv({ workflow_status: status }), {
        writeEnabled: true,
        sessionId: "sess-1",
        ais: makeAis(LOGGED_IN),
      });

      const rendered = screen.getAllByRole("button").map((b) => b.textContent?.trim());
      expect(rendered).toEqual(expected);

      // And nothing the matrix does NOT list for this status leaks in.
      for (const label of ALL_ACTION_LABELS) {
        if (expected.includes(label)) continue;
        expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
      }
    },
  );

  it("offers no action buttons for a status absent from the matrix", () => {
    // Draft has a badge tint but no transitions defined.
    expect(DV_AVAILABLE_ACTIONS.Draft).toBeUndefined();
    renderDv(makeDv({ workflow_status: "Draft" }), {
      writeEnabled: true,
      sessionId: "sess-1",
      ais: makeAis(LOGGED_IN),
    });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("offers no action buttons for an entirely unknown status", () => {
    renderDv(makeDv({ workflow_status: "Pending Review by Ombudsman" }), {
      writeEnabled: true,
      sessionId: "sess-1",
      ais: makeAis(LOGGED_IN),
    });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("DV detail card — clicking a write action", () => {
  it("opens the AIS sign-in modal (not the confirm modal) when logged out", () => {
    renderDv(makeDv({ workflow_status: "Submitted" }), {
      writeEnabled: true,
      sessionId: "sess-1",
      ais: makeAis(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(screen.getByText("Sign in to AIS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    // The confirmation step must not appear before authentication.
    expect(screen.queryByText("Approve DV-2026-00123?")).not.toBeInTheDocument();
  });

  it("closing the sign-in modal drops the pending action entirely", () => {
    renderDv(makeDv({ workflow_status: "Submitted" }), {
      writeEnabled: true,
      sessionId: "sess-1",
      ais: makeAis(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Sign in to AIS")).not.toBeInTheDocument();
    expect(screen.queryByText("Approve DV-2026-00123?")).not.toBeInTheDocument();
    // Back to just the action row.
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });

  it("opens the confirm modal straight away when already signed in", () => {
    renderDv(makeDv({ workflow_status: "Approved" }), {
      writeEnabled: true,
      sessionId: "sess-1",
      ais: makeAis(LOGGED_IN),
    });

    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    expect(screen.getByText("Post DV-2026-00123?")).toBeInTheDocument();
    expect(screen.queryByText("Sign in to AIS")).not.toBeInTheDocument();
    // Type-to-confirm guard: the input is seeded with the DV name as a
    // placeholder and the execute button starts disabled.
    expect(screen.getByPlaceholderText("DV-2026-00123")).toBeInTheDocument();
  });

  // set_dv_status carries a newStatus through to the confirmation copy.
  it("passes the target status through to the confirm modal for set_dv_status", () => {
    renderDv(makeDv({ workflow_status: "Submitted" }), {
      writeEnabled: true,
      sessionId: "sess-1",
      ais: makeAis(LOGGED_IN),
    });

    fireEvent.click(screen.getByRole("button", { name: "Send to IA Audit" }));

    // The generic label for set_dv_status is "Change status".
    expect(screen.getByText("Change status DV-2026-00123?")).toBeInTheDocument();
    expect(screen.getByText("IA Audit Required")).toBeInTheDocument();
  });

  it("requires a reason on the cancel confirmation", () => {
    renderDv(makeDv({ workflow_status: "Submitted" }), {
      writeEnabled: true,
      sessionId: "sess-1",
      ais: makeAis(LOGGED_IN),
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Cancel DV-2026-00123?")).toBeInTheDocument();
    expect(screen.getByText("Reason (required)")).toBeInTheDocument();
  });
});
