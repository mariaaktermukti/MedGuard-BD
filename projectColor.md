# MedGuard BD - Official Project Color Palette & Design System Guide

This document defines the strict, standardized color system for **MedGuard BD**. All future AI assistants and developers MUST adhere to these color definitions to maintain a clean, professional, high-contrast **White & Medium Emerald Green** healthcare identity.

---

## 🎨 Color Palette Overview

### Primary Colors (Healthcare Emerald Green)
- **Primary Brand Color (`--primary`)**: `#059669` (Fresh Emerald Green)
  - Usage: Buttons, active tabs, main icons, key headings, primary accents.
- **Primary Hover (`--primary-hover`)**: `#047857`
  - Usage: Button hover states, interactive links hover state.
- **Primary Light Fill (`--primary-light`)**: `#ECFDF5` (Soft Mint Green)
  - Usage: Selected card background fills, badge backgrounds, active pill highlights, light alert boxes.

### Secondary Colors
- **Secondary Medium Green (`--secondary`)**: `#10B981` (Medium Emerald)
  - Usage: Secondary badges, progress indicators, success icons.
- **Secondary Hover (`--secondary-hover`)**: `#059669`

---

## 📄 Surface & Background Colors (Clean White Theme)
- **Page Background (`--bg-page`)**: `#F8FAFC` (Crisp Light Slate - Clean & Fresh)
- **Card / Container Background (`--bg-card`)**: `#FFFFFF` (Pure White)
- **Input Background (`--bg-input`)**: `#FFFFFF` (Pure White)
- **Borders (`--border`)**: `#E2E8F0` (Light Slate Border)

> 🚨 **CRITICAL RULE**: Do **NOT** use dark navy/blackish greens (e.g. `#022c22` or `#064e3b`) for large page panels or cards. The entire application uses a crisp **White & Fresh Light Green** aesthetic.

---

## 👁️ High-Contrast Deep Text Colors

To ensure 100% legibility and sharp visual clarity, text colors are deep charcoal slate:

- **Primary Main Text (`--text-main`)**: `#0F172A` (Slate 950 - Deep Dark Charcoal)
  - Usage: Headings, form labels, card titles, primary body text, chat text.
- **Secondary Muted Text (`--text-muted`)**: `#334155` (Slate 700 - Deep Slate Gray)
  - Usage: Subtitles, helper text, timestamps, secondary descriptions.
- **Inverse Text (`--text-inverse`)**: `#FFFFFF` (Pure White)
  - Usage: Text rendered inside filled green buttons or solid green banners.

---

## 🚦 Semantic Status Colors
- **Success (`--success`)**: `#10B981` (Emerald Green)
- **Warning (`--warning`)**: `#D97706` (Amber Orange)
- **Danger (`--danger`)**: `#DC2626` (Bright Red)
- **Info (`--info`)**: `#2563eb` (Royal Blue)

---

## 📐 Shadows & Elevation
- **Small Shadow (`--shadow-sm`)**: `0 1px 3px 0 rgba(0, 0, 0, 0.08)`
- **Medium Shadow (`--shadow-md`)**: `0 4px 6px -1px rgba(5, 150, 105, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)`
- **Large Shadow (`--shadow-lg`)**: `0 10px 15px -3px rgba(5, 150, 105, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.04)`

---

## 📝 Rules for AI Developers
1. Always import and use `var(--primary)`, `var(--bg-card)`, `var(--text-main)`, and `var(--border)`.
2. Do **not** hardcode light-gray text colors (like `#94a3b8` or `#cbd5e1`) over white/light backgrounds.
3. Ensure all paragraph (`p`) and div text inside cards explicitly inherits or targets `--text-main` or `--text-muted`.
