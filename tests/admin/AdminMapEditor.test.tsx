import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminMapEditor } from "@/admin/components/AdminMapEditor";
import { adminApi, type CustomMarker } from "@/admin/api";
import { BUILDINGS, CAMPUS_W, WAYPOINTS, type Waypoint } from "@/lib/campusMap";
import { loadCoords, setCoordsLocal } from "@/lib/coordsStore";
import { loadWaypoints, setWaypointsLocal } from "@/lib/waypointsStore";

/**
 * CHARACTERIZATION tests for AdminMapEditor.
 *
 * The component is ~1350 lines and is about to be split into a shell plus
 * marker/waypoint editors plus a state hook. Everything asserted here is
 * CURRENT behaviour, captured so the split can be proved behaviour-preserving.
 * Where the current behaviour looks like a quirk it is pinned anyway, with a
 * comment saying so — a quirk that silently disappears in a refactor is still
 * a regression.
 */

vi.mock("@/admin/api", () => ({
  adminApi: {
    getMapCoords: vi.fn(),
    getMapWaypoints: vi.fn(),
    getCustomMarkers: vi.fn(),
    saveMapCoords: vi.fn(),
    saveMapWaypoints: vi.fn(),
    saveCustomMarker: vi.fn(),
    deleteCustomMarker: vi.fn(),
    deleteMapWaypoint: vi.fn(),
    resetMapCoords: vi.fn(),
    resetMapWaypoints: vi.fn(),
  },
}));

// The stores talk to the public api module; mocking them keeps the test off the
// network AND lets us assert that a successful save republishes to the live map.
vi.mock("@/lib/coordsStore", () => ({
  loadCoords: vi.fn(async () => {}),
  setCoordsLocal: vi.fn(),
}));
vi.mock("@/lib/waypointsStore", () => ({
  loadWaypoints: vi.fn(async () => {}),
  setWaypointsLocal: vi.fn(),
}));

const api = vi.mocked(adminApi);

const B0 = BUILDINGS[0];
const B1 = BUILDINGS[1];
const WAYPOINT_LIST = Object.values(WAYPOINTS) as Waypoint[];
const W0 = WAYPOINT_LIST[0];

/** Undirected adjacency pairs whose BOTH endpoints exist in WAYPOINTS —
 *  computed independently of the component so the line count means something. */
const EXPECTED_EDGE_COUNT = (() => {
  const seen = new Set<string>();
  for (const w of WAYPOINT_LIST) {
    for (const n of w.neighbors) {
      if (!WAYPOINTS[n]) continue;
      seen.add(w.id < n ? `${w.id}|${n}` : `${n}|${w.id}`);
    }
  }
  return seen.size;
})();

const CUSTOM_MARKER: CustomMarker = {
  id: "custom_marker_1",
  name: "Motorpool Annex",
  abbr: "Motorpool",
  x: 1234,
  y: 567,
  num: 99,
};

beforeAll(() => {
  // jsdom implements no SVG geometry, so screenToSvg() would throw. These two
  // stubs give it an IDENTITY transform: a pointer at clientX/Y lands on the
  // same viewBox coordinate, which is what makes the add-item path testable.
  (SVGSVGElement.prototype as unknown as Record<string, unknown>).createSVGPoint =
    function () {
      return {
        x: 0,
        y: 0,
        matrixTransform() {
          return { x: this.x, y: this.y };
        },
      };
    };
  (SVGSVGElement.prototype as unknown as Record<string, unknown>).getScreenCTM =
    function () {
      return { inverse: () => ({}) };
    };
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  }
});

beforeEach(() => {
  api.getMapCoords.mockResolvedValue({ coords: {}, overrides: {} });
  api.getMapWaypoints.mockResolvedValue({ overrides: {} });
  api.getCustomMarkers.mockResolvedValue({ markers: {} });
  api.saveMapCoords.mockResolvedValue({});
  api.saveMapWaypoints.mockResolvedValue({});
  api.saveCustomMarker.mockResolvedValue({});
  api.deleteCustomMarker.mockResolvedValue({});
  api.deleteMapWaypoint.mockResolvedValue({});
  api.resetMapCoords.mockResolvedValue({});
  api.resetMapWaypoints.mockResolvedValue({});
});

/** Render and wait for all three load effects to settle. */
async function renderEditor(expectX: number = B0.x) {
  const onClose = vi.fn();
  const view = render(<AdminMapEditor onClose={onClose} />);
  await waitFor(() => {
    expect(api.getMapCoords).toHaveBeenCalled();
    expect(api.getMapWaypoints).toHaveBeenCalled();
    expect(api.getCustomMarkers).toHaveBeenCalled();
  });
  await waitFor(() => expect(screen.getByLabelText("X")).toHaveValue(expectX));
  return { ...view, onClose };
}

const mapSvg = () => screen.getByLabelText("Drag-and-drop campus map editor");

/** `data-node` is the component's own hook — onSvgClick uses closest("[data-node]")
 *  to tell "clicked a node" from "clicked empty map", so it is load-bearing. */
const nodes = (kind: "marker" | "waypoint") =>
  mapSvg().querySelectorAll(`[data-node="${kind}"]`);

/** Adjacency lines only — scoped to the map so lucide icon <line>s don't count. */
const edgeLines = () => mapSvg().querySelectorAll("line");

/** Each sidebar row's label span carries title={name|id}; the row is its button. */
const listRow = (label: string) => screen.getByTitle(label).closest("button") as HTMLElement;

/** The <title> a node renders inside its <g> (not reachable via ByTitle: RTL only
 *  matches `svg > title`, and these sit one level deeper, inside the <g>). */
const nodeTitle = (text: string) => screen.getByText(text, { selector: "title" });

const xInput = () => screen.getByLabelText("X");
const yInput = () => screen.getByLabelText("Y");
const saveButton = () => screen.getByRole("button", { name: /^Save/ });
const resetButton = () => screen.getByRole("button", { name: /Reset all/ });
const toggleEditButton = () =>
  screen.getByRole("button", { name: /Lock & exit edit|Enter edit mode/ });

describe("AdminMapEditor — shell", () => {
  it("renders the markers view with a breadcrumb, edit-mode badge and close button", async () => {
    const { onClose } = await renderEditor();

    expect(screen.getByRole("heading", { name: "Map Markers" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      "Admin Dashboard",
    );
    // Edit mode is ON by default — a deliberate choice recorded in the source.
    expect(screen.getByText("Edit mode")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock & exit edit" })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close map editor"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("draws the campus image and one draggable node per building, with no waypoint nodes", async () => {
    await renderEditor();

    expect(mapSvg()).toHaveAttribute("viewBox", `0 0 ${CAMPUS_W} 2000`);
    expect(mapSvg().querySelectorAll("image")).toHaveLength(1);
    expect(nodes("marker")).toHaveLength(BUILDINGS.length);
    expect(nodes("waypoint")).toHaveLength(0);
    // Adjacency lines only exist in waypoint mode.
    expect(edgeLines()).toHaveLength(0);
  });

  it("gives every marker node an SVG title of '<num>. <name>'", async () => {
    await renderEditor();
    expect(nodeTitle(`${B0.num}. ${B0.name}`)).toBeInTheDocument();
    expect(nodeTitle(`${B1.num}. ${B1.name}`)).toBeInTheDocument();
  });

  it("labels the mode tabs with live totals that include custom items", async () => {
    api.getCustomMarkers.mockResolvedValue({ markers: { [CUSTOM_MARKER.id]: CUSTOM_MARKER } });
    await renderEditor();

    expect(
      screen.getByRole("button", { name: `Markers (${BUILDINGS.length + 1})` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Waypoints (${WAYPOINT_LIST.length})` }),
    ).toBeInTheDocument();
  });
});

describe("AdminMapEditor — loading server state", () => {
  it("applies server coord overrides to the selected marker's inputs", async () => {
    api.getMapCoords.mockResolvedValue({
      coords: { [B0.id]: { x: 101, y: 202 } },
      overrides: { [B0.id]: { x: 101, y: 202 } },
    });
    await renderEditor(101);
    expect(yInput()).toHaveValue(202);
  });

  // QUIRK: "edited" means "differs from the bundled default", not "changed by
  // this admin". A server override therefore shows up as edited on first paint.
  it("flags a server override as 'edited' in the list before the admin touches anything", async () => {
    api.getMapCoords.mockResolvedValue({
      coords: { [B0.id]: { x: 101, y: 202 } },
      overrides: { [B0.id]: { x: 101, y: 202 } },
    });
    await renderEditor(101);
    expect(screen.getAllByText("edited")).toHaveLength(1);
  });

  it("ignores server coords for ids that are not bundled buildings", async () => {
    api.getMapCoords.mockResolvedValue({
      coords: { not_a_building: { x: 5, y: 5 } },
      overrides: {},
    });
    await renderEditor();
    expect(nodes("marker")).toHaveLength(BUILDINGS.length);
    expect(screen.queryByText("edited")).not.toBeInTheDocument();
  });

  it("surfaces a marker-load failure as an error message", async () => {
    api.getMapCoords.mockRejectedValue(new Error("coords endpoint down"));
    render(<AdminMapEditor onClose={vi.fn()} />);
    expect(await screen.findByText("coords endpoint down")).toBeInTheDocument();
  });

  it("surfaces a custom-marker load failure as an error message", async () => {
    api.getCustomMarkers.mockRejectedValue(new Error("customs endpoint down"));
    render(<AdminMapEditor onClose={vi.fn()} />);
    expect(await screen.findByText("customs endpoint down")).toBeInTheDocument();
  });
});

describe("AdminMapEditor — mode switching", () => {
  it("swaps markers for waypoints and draws the adjacency graph", async () => {
    await renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));

    expect(screen.getByRole("heading", { name: "Map Waypoints" })).toBeInTheDocument();
    expect(nodes("marker")).toHaveLength(0);
    expect(nodes("waypoint")).toHaveLength(WAYPOINT_LIST.length);
    expect(edgeLines()).toHaveLength(EXPECTED_EDGE_COUNT);
  });

  it("shows the waypoint id and its neighbours in the selected panel", async () => {
    await renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));

    expect(screen.getByText("Selected waypoint")).toBeInTheDocument();
    expect(screen.getByText(W0.id, { selector: "p" })).toBeInTheDocument();
    expect(
      screen.getByText(`Connects to: ${W0.neighbors.join(", ")}`),
    ).toBeInTheDocument();
    expect(xInput()).toHaveValue(W0.x);
  });

  it("refuses to switch mode while there are unsaved edits", async () => {
    await renderEditor();
    fireEvent.change(xInput(), { target: { value: "555" } });

    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));

    expect(
      screen.getByText("Save or discard changes before switching mode."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Map Markers" })).toBeInTheDocument();
  });

  it("clears the search filter when the mode changes", async () => {
    await renderEditor();
    const search = screen.getByPlaceholderText("Search buildings…");
    fireEvent.change(search, { target: { value: "lib" } });
    expect(search).toHaveValue("lib");

    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));
    expect(screen.getByPlaceholderText("Search waypoints…")).toHaveValue("");
  });
});

describe("AdminMapEditor — selection and manual editing", () => {
  it("selects the first building by default and switches on a list click", async () => {
    await renderEditor();
    expect(screen.getByText(`${B0.num}. ${B0.name}`, { selector: "p" })).toBeInTheDocument();

    fireEvent.click(listRow(B1.name));

    expect(screen.getByText(`${B1.num}. ${B1.name}`, { selector: "p" })).toBeInTheDocument();
    expect(xInput()).toHaveValue(B1.x);
    expect(yInput()).toHaveValue(B1.y);
  });

  it("selects a node when it is pressed on the map", async () => {
    await renderEditor();
    const secondNode = nodes("marker")[1];

    fireEvent.pointerDown(secondNode, { pointerId: 1, clientX: B1.x, clientY: B1.y });

    expect(screen.getByText(`${B1.num}. ${B1.name}`, { selector: "p" })).toBeInTheDocument();
  });

  // Real dragging needs layout jsdom does not have; the identity-transform stub
  // in beforeAll is what makes this reachable. It pins the pointer sequence
  // (down -> move -> up) rather than any visual drag behaviour.
  it("moves the pressed node while the pointer is down and stops on pointer-up", async () => {
    await renderEditor();
    const firstNode = nodes("marker")[0];

    fireEvent.pointerDown(firstNode, { pointerId: 7, clientX: B0.x, clientY: B0.y });
    fireEvent.pointerMove(firstNode, { pointerId: 7, clientX: 300, clientY: 400 });

    expect(xInput()).toHaveValue(300);
    expect(yInput()).toHaveValue(400);

    fireEvent.pointerUp(firstNode, { pointerId: 7 });
    fireEvent.pointerMove(firstNode, { pointerId: 7, clientX: 900, clientY: 900 });

    expect(xInput()).toHaveValue(300);
    expect(yInput()).toHaveValue(400);
  });

  it("does not move a node on drag while the editor is locked", async () => {
    await renderEditor();
    fireEvent.click(toggleEditButton()); // lock; nothing dirty
    const firstNode = nodes("marker")[0];

    fireEvent.pointerDown(firstNode, { pointerId: 7, clientX: B0.x, clientY: B0.y });
    fireEvent.pointerMove(firstNode, { pointerId: 7, clientX: 300, clientY: 400 });

    expect(xInput()).toHaveValue(B0.x);
  });

  it("marks a manually edited building as 'edited' and arms the Save button", async () => {
    await renderEditor();
    expect(saveButton()).toHaveTextContent("Save (no changes)");

    fireEvent.change(xInput(), { target: { value: "555" } });

    expect(xInput()).toHaveValue(555);
    expect(screen.getAllByText("edited")).toHaveLength(1);
    expect(saveButton()).toHaveTextContent(/^Save$/);
  });

  it("clamps a manual coordinate to the campus bounds", async () => {
    await renderEditor();
    fireEvent.change(xInput(), { target: { value: "99999" } });
    expect(xInput()).toHaveValue(CAMPUS_W);

    fireEvent.change(yInput(), { target: { value: "-40" } });
    expect(yInput()).toHaveValue(0);
  });

  // QUIRK: a non-numeric value is dropped silently, so the controlled input
  // snaps back to the last good coordinate instead of going blank.
  it("ignores a non-numeric coordinate and keeps the previous value", async () => {
    await renderEditor();
    fireEvent.change(xInput(), { target: { value: "abc" } });
    expect(xInput()).toHaveValue(B0.x);
  });

  it("reverts the selected marker to its bundled default", async () => {
    await renderEditor();
    fireEvent.change(xInput(), { target: { value: "555" } });
    expect(screen.getAllByText("edited")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Revert" }));

    expect(xInput()).toHaveValue(B0.x);
    expect(screen.queryByText("edited")).not.toBeInTheDocument();
  });
});

describe("AdminMapEditor — saving", () => {
  it("sends only the changed markers and republishes them to the live map store", async () => {
    await renderEditor();
    fireEvent.change(xInput(), { target: { value: "555" } });

    fireEvent.click(saveButton());

    await waitFor(() => expect(api.saveMapCoords).toHaveBeenCalledTimes(1));
    expect(api.saveMapCoords).toHaveBeenCalledWith({
      coords: { [B0.id]: { x: 555, y: B0.y } },
    });
    expect(
      await screen.findByText(`Saved 1 marker(s) + 0 custom.`),
    ).toBeInTheDocument();

    const published = vi.mocked(setCoordsLocal).mock.calls[0][0] as Map<string, unknown>;
    expect(published.size).toBe(BUILDINGS.length);
    expect(published.get(B0.id)).toEqual({ x: 555, y: B0.y });
  });

  // QUIRK: with nothing dirty the PUT is skipped but the editor still reports a
  // successful save (of zero markers).
  it("skips the network call but still reports success when nothing changed", async () => {
    await renderEditor();

    fireEvent.click(saveButton());

    expect(await screen.findByText("Saved 0 marker(s) + 0 custom.")).toBeInTheDocument();
    expect(api.saveMapCoords).not.toHaveBeenCalled();
    expect(setCoordsLocal).toHaveBeenCalledTimes(1);
  });

  it("re-pushes every custom marker on save so drag edits to them stick", async () => {
    api.getCustomMarkers.mockResolvedValue({ markers: { [CUSTOM_MARKER.id]: CUSTOM_MARKER } });
    await renderEditor();

    fireEvent.click(saveButton());

    await waitFor(() => expect(api.saveCustomMarker).toHaveBeenCalledWith(CUSTOM_MARKER));
    expect(await screen.findByText("Saved 0 marker(s) + 1 custom.")).toBeInTheDocument();
  });

  it("saves waypoint edits through saveMapWaypoints, not saveMapCoords", async () => {
    await renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));
    fireEvent.change(xInput(), { target: { value: "700" } });

    fireEvent.click(saveButton());

    await waitFor(() => expect(api.saveMapWaypoints).toHaveBeenCalledTimes(1));
    expect(api.saveMapWaypoints).toHaveBeenCalledWith({
      coords: { [W0.id]: { x: 700, y: W0.y } },
    });
    expect(api.saveMapCoords).not.toHaveBeenCalled();
    expect(await screen.findByText("Saved 1 waypoint(s).")).toBeInTheDocument();
    expect(setWaypointsLocal).toHaveBeenCalledTimes(1);
  });

  it("surfaces a failed save as an error instead of throwing, and re-enables Save", async () => {
    api.saveMapCoords.mockRejectedValue(new Error("PUT /map/coords failed"));
    await renderEditor();
    fireEvent.change(xInput(), { target: { value: "555" } });

    fireEvent.click(saveButton());

    expect(await screen.findByText("PUT /map/coords failed")).toBeInTheDocument();
    expect(saveButton()).not.toBeDisabled();
    // The edit is kept, not rolled back.
    expect(xInput()).toHaveValue(555);
    expect(setCoordsLocal).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the save rejection carries none", async () => {
    api.saveMapCoords.mockRejectedValue({});
    await renderEditor();
    fireEvent.change(xInput(), { target: { value: "555" } });

    fireEvent.click(saveButton());

    expect(await screen.findByText("Save failed")).toBeInTheDocument();
  });
});

describe("AdminMapEditor — reset", () => {
  it("clears overrides, restores the bundled positions and reloads the live store", async () => {
    api.getMapCoords.mockResolvedValue({
      coords: { [B0.id]: { x: 101, y: 202 } },
      overrides: { [B0.id]: { x: 101, y: 202 } },
    });
    await renderEditor(101);

    fireEvent.click(resetButton());

    await waitFor(() => expect(api.resetMapCoords).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("All marker overrides cleared.")).toBeInTheDocument();
    expect(xInput()).toHaveValue(B0.x);
    expect(loadCoords).toHaveBeenCalledWith(true);
    expect(screen.queryByText("edited")).not.toBeInTheDocument();
  });

  it("resets waypoints through the waypoint endpoints when in waypoint mode", async () => {
    await renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));

    fireEvent.click(resetButton());

    await waitFor(() => expect(api.resetMapWaypoints).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("All waypoint overrides cleared.")).toBeInTheDocument();
    expect(loadWaypoints).toHaveBeenCalledWith(true);
    expect(api.resetMapCoords).not.toHaveBeenCalled();
  });

  it("surfaces a failed reset as an error", async () => {
    api.resetMapCoords.mockRejectedValue(new Error("DELETE refused"));
    await renderEditor();

    fireEvent.click(resetButton());

    expect(await screen.findByText("DELETE refused")).toBeInTheDocument();
  });
});

describe("AdminMapEditor — lock / discard", () => {
  it("locks straight away when nothing is dirty", async () => {
    await renderEditor();

    fireEvent.click(toggleEditButton());

    expect(screen.getByText("View mode")).toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(resetButton()).toBeDisabled();
    expect(xInput()).toHaveAttribute("readonly");
  });

  it("asks before discarding when unsaved edits exist and can be cancelled", async () => {
    await renderEditor();
    fireEvent.change(xInput(), { target: { value: "555" } });

    fireEvent.click(toggleEditButton());

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Discard unsaved changes?");

    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Edit mode")).toBeInTheDocument();
    expect(xInput()).toHaveValue(555);
  });

  it("discarding restores the last saved positions and leaves edit mode", async () => {
    await renderEditor();
    fireEvent.change(xInput(), { target: { value: "555" } });

    fireEvent.click(toggleEditButton());
    fireEvent.click(screen.getByRole("button", { name: "Discard & lock" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("View mode")).toBeInTheDocument();
    expect(xInput()).toHaveValue(B0.x);
    expect(api.saveMapCoords).not.toHaveBeenCalled();
  });
});

describe("AdminMapEditor — calibrate all", () => {
  it("reports nothing to do when the selected marker sits at its default", async () => {
    await renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /Calibrate all from this marker/ }));

    expect(
      screen.getByText("No offset on this marker — nothing to calibrate."),
    ).toBeInTheDocument();
  });

  it("translates every marker by the selected marker's offset", async () => {
    await renderEditor();
    fireEvent.change(xInput(), { target: { value: String(B0.x + 10) } });

    fireEvent.click(screen.getByRole("button", { name: /Calibrate all from this marker/ }));

    expect(screen.getByText("Translated all markers by (+10, +0).")).toBeInTheDocument();
    // Every building moved off its default, so every list row is now "edited".
    expect(screen.getAllByText("edited")).toHaveLength(BUILDINGS.length);
  });

  it("translates every waypoint by the selected waypoint's offset", async () => {
    await renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));
    fireEvent.change(yInput(), { target: { value: String(W0.y - 5) } });

    fireEvent.click(screen.getByRole("button", { name: /Calibrate all from this waypoint/ }));

    expect(screen.getByText("Translated all waypoints by (+0, -5).")).toBeInTheDocument();
    expect(screen.getAllByText("edited")).toHaveLength(WAYPOINT_LIST.length);
  });
});

describe("AdminMapEditor — filtering the sidebar list", () => {
  it("narrows the building list to name / abbr / id / number matches", async () => {
    await renderEditor();
    const matches = BUILDINGS.filter(
      (b) =>
        b.name.toLowerCase().includes("library") ||
        b.abbr.toLowerCase().includes("library") ||
        b.id.toLowerCase().includes("library"),
    );

    fireEvent.change(screen.getByPlaceholderText("Search buildings…"), {
      target: { value: "library" },
    });

    expect(matches.length).toBeGreaterThan(0);
    for (const b of matches) {
      expect(listRow(b.name)).toBeInTheDocument();
    }
    expect(screen.queryByTitle(B1.name)).not.toBeInTheDocument();
  });

  it("shows a no-match row echoing the query", async () => {
    await renderEditor();

    fireEvent.change(screen.getByPlaceholderText("Search buildings…"), {
      target: { value: "zzzz" },
    });

    expect(screen.getByText('No match for "zzzz"')).toBeInTheDocument();
  });
});

describe("AdminMapEditor — custom markers", () => {
  it("renders API custom markers in the list and on the map", async () => {
    api.getCustomMarkers.mockResolvedValue({ markers: { [CUSTOM_MARKER.id]: CUSTOM_MARKER } });
    await renderEditor();

    expect(nodes("marker")).toHaveLength(BUILDINGS.length + 1);
    expect(nodeTitle(`${CUSTOM_MARKER.num}. ${CUSTOM_MARKER.name} (custom)`)).toBeInTheDocument();
    expect(screen.getByText("custom")).toBeInTheDocument();
  });

  it("shows a delete affordance instead of Revert for a selected custom marker", async () => {
    api.getCustomMarkers.mockResolvedValue({ markers: { [CUSTOM_MARKER.id]: CUSTOM_MARKER } });
    await renderEditor();

    fireEvent.click(listRow(CUSTOM_MARKER.name));

    expect(
      screen.getByText(`${CUSTOM_MARKER.num}. ${CUSTOM_MARKER.name} (custom)`, { selector: "p" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete custom" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revert" })).not.toBeInTheDocument();
    expect(xInput()).toHaveValue(CUSTOM_MARKER.x);
  });

  // A custom marker's coordinates live in a different store from the bundled
  // ones, and the edit is only persisted by the save loop that re-POSTs every
  // custom marker — there is no "dirty" tracking for them.
  it("routes a coordinate edit on a custom marker back through saveCustomMarker", async () => {
    api.getCustomMarkers.mockResolvedValue({ markers: { [CUSTOM_MARKER.id]: CUSTOM_MARKER } });
    await renderEditor();
    fireEvent.click(listRow(CUSTOM_MARKER.name));

    fireEvent.change(xInput(), { target: { value: "1500" } });
    expect(xInput()).toHaveValue(1500);

    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(api.saveCustomMarker).toHaveBeenCalledWith({ ...CUSTOM_MARKER, x: 1500 }),
    );
    // QUIRK: editing a custom marker never marks the editor dirty, so the Save
    // button still reads "Save (no changes)" while there is a pending edit.
    expect(saveButton()).toHaveTextContent("Save (no changes)");
  });

  it("confirms before deleting a custom marker and drops it from the list", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    api.getCustomMarkers.mockResolvedValue({ markers: { [CUSTOM_MARKER.id]: CUSTOM_MARKER } });
    await renderEditor();
    fireEvent.click(listRow(CUSTOM_MARKER.name));

    fireEvent.click(screen.getByRole("button", { name: "Delete custom" }));

    await waitFor(() =>
      expect(api.deleteCustomMarker).toHaveBeenCalledWith(CUSTOM_MARKER.id),
    );
    expect(confirmSpy).toHaveBeenCalledWith(`Delete custom marker ${CUSTOM_MARKER.id}?`);
    expect(
      await screen.findByText(`Deleted marker ${CUSTOM_MARKER.id}.`),
    ).toBeInTheDocument();
    expect(screen.queryByText("custom")).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("does not call the API when the delete confirmation is declined", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    api.getCustomMarkers.mockResolvedValue({ markers: { [CUSTOM_MARKER.id]: CUSTOM_MARKER } });
    await renderEditor();
    fireEvent.click(listRow(CUSTOM_MARKER.name));

    fireEvent.click(screen.getByRole("button", { name: "Delete custom" }));

    expect(api.deleteCustomMarker).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

describe("AdminMapEditor — add mode", () => {
  it("refuses to arm add mode outside edit mode", async () => {
    await renderEditor();
    fireEvent.click(toggleEditButton()); // lock (nothing dirty)

    fireEvent.click(screen.getByRole("button", { name: "Add marker" }));

    expect(screen.getByText("Enable edit mode to add new items.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add marker" })).toBeInTheDocument();
  });

  it("arming add mode relabels the button and explains the next click", async () => {
    await renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "Add marker" }));

    expect(screen.getByRole("button", { name: "Click the map…" })).toBeInTheDocument();
    expect(
      screen.getByText("Click anywhere on the map to drop a new marker."),
    ).toBeInTheDocument();
  });

  it("clicking the map in add mode prompts for a name and POSTs a new custom marker", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Motorpool Annex");
    await renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Add marker" }));

    fireEvent.click(screen.getByLabelText("Drag-and-drop campus map editor"), {
      clientX: 640,
      clientY: 480,
    });

    await waitFor(() => expect(api.saveCustomMarker).toHaveBeenCalledTimes(1));
    expect(api.saveCustomMarker).toHaveBeenCalledWith({
      id: "custom_marker_1",
      name: "Motorpool Annex",
      // abbr is the name truncated to 12 chars — "Motorpool An".
      abbr: "Motorpool An",
      x: 640,
      y: 480,
      num: BUILDINGS.length + 1,
    });
    expect(
      await screen.findByText(`Added marker "Motorpool Annex" (#${BUILDINGS.length + 1}).`),
    ).toBeInTheDocument();
    // Add mode disarms itself after one drop.
    expect(screen.getByRole("button", { name: "Add marker" })).toBeInTheDocument();
    promptSpy.mockRestore();
  });

  it("adds nothing when the name prompt is cancelled", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);
    await renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Add marker" }));

    fireEvent.click(screen.getByLabelText("Drag-and-drop campus map editor"), {
      clientX: 640,
      clientY: 480,
    });

    await waitFor(() => expect(promptSpy).toHaveBeenCalled());
    expect(api.saveCustomMarker).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it("ignores map clicks when add mode is not armed", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Nope");
    await renderEditor();

    fireEvent.click(screen.getByLabelText("Drag-and-drop campus map editor"), {
      clientX: 640,
      clientY: 480,
    });

    expect(promptSpy).not.toHaveBeenCalled();
    expect(api.saveCustomMarker).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it("dropping a waypoint auto-links it to the two nearest existing waypoints", async () => {
    await renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add waypoint" }));

    // (691, 1700) is exactly wp_sw; wp_plaza (770, 1700) is the next nearest.
    fireEvent.click(screen.getByLabelText("Drag-and-drop campus map editor"), {
      clientX: 691,
      clientY: 1700,
    });

    await waitFor(() => expect(api.saveMapWaypoints).toHaveBeenCalledTimes(1));
    expect(api.saveMapWaypoints).toHaveBeenCalledWith({
      coords: { wp_custom_1: { x: 691, y: 1700, neighbors: ["wp_sw", "wp_plaza"] } },
    });
    expect(
      await screen.findByText("Added waypoint wp_custom_1 (linked to wp_sw, wp_plaza)."),
    ).toBeInTheDocument();
  });

  // QUIRK: the new custom waypoint becomes the selection, but "Connects to"
  // reads from the BUNDLED waypoint lookup, which falls back to the first
  // bundled waypoint — so the panel shows wp_sw's neighbours, not the custom
  // node's own auto-linked pair.
  it("shows the first bundled waypoint's neighbours for a selected custom waypoint", async () => {
    await renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add waypoint" }));
    fireEvent.click(screen.getByLabelText("Drag-and-drop campus map editor"), {
      clientX: 691,
      clientY: 1700,
    });

    expect(
      await screen.findByText("wp_custom_1 (custom)", { selector: "p" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Connects to: ${W0.neighbors.join(", ")}`),
    ).toBeInTheDocument();
  });

  it("deletes a freshly added custom waypoint and falls back to the first bundled one", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    await renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add waypoint" }));
    fireEvent.click(mapSvg(), { clientX: 691, clientY: 1700 });
    await screen.findByText("wp_custom_1 (custom)", { selector: "p" });

    fireEvent.click(screen.getByRole("button", { name: "Delete custom" }));

    await waitFor(() => expect(api.deleteMapWaypoint).toHaveBeenCalledWith("wp_custom_1"));
    expect(confirmSpy).toHaveBeenCalledWith("Delete custom waypoint wp_custom_1?");
    expect(await screen.findByText("Deleted waypoint wp_custom_1.")).toBeInTheDocument();
    expect(screen.getByText(W0.id, { selector: "p" })).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("surfaces a failed waypoint drop as an error", async () => {
    api.saveMapWaypoints.mockRejectedValue(new Error("waypoint POST refused"));
    await renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^Waypoints \(/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add waypoint" }));

    fireEvent.click(screen.getByLabelText("Drag-and-drop campus map editor"), {
      clientX: 691,
      clientY: 1700,
    });

    expect(await screen.findByText("waypoint POST refused")).toBeInTheDocument();
  });
});
