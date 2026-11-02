// src/custom/index.js — the agent's 20%. Register custom sections/components by name; os.yaml refers to them via `custom: <Name>`.
// This file and this folder are never regenerated.
import AttendanceSheet from './AttendanceSheet';
import './popupSlack';   // adapter: clears the kernel's leftover modal padding after a select / date picker closes

export const CUSTOM = { AttendanceSheet };
