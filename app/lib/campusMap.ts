// Campus map — barrel. The module was 710 lines with a ~390-line coordinate
// table sitting on top of the routing solver, so every routing diff arrived
// buried under data. Split into ./campus/{data,geometry,routing}; this file
// stays so no import site had to change.
export * from "./campus/data";
export * from "./campus/geometry";
export * from "./campus/routing";
