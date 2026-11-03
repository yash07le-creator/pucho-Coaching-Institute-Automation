// src/custom/index.js — the agent's 20%. Register custom sections/components by name; os.yaml refers to them via `custom: <Name>`.
// This file and this folder are never regenerated.
import AttendanceSheet from './AttendanceSheet';
import BatchManager from './BatchManager';
import './popupSlack';   // adapter: clears the kernel's leftover modal padding after a select / date picker closes
import './navScroll';    // adapter: the sidebar menu keeps its scroll and shows the open module after a page change
import './noticeBadges'; // adapter: WhatsApp Notice badges in the owner's colours (Present green, WhatsApp Sent indigo)

export const CUSTOM = { AttendanceSheet, BatchManager };
