# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Field Economics of AI Coding Models** — a tool that mines real AI-assisted coding sessions, estimates each task's complexity (structural proxies + LLM-as-judge over the *reconstructed* working context, not just the first message), and reports cost / tokens / solve-rate per **model × effort × complexity tier**. See `projectidea.md` for full intent. Reputational/dataset project, not revenue.

Status: spec-only, no code yet. First deliverable is a single analysis script over local session logs plus a small hand-labelled eval set to validate the complexity classifier — build the classifier and its eval set *before* any reporting pipeline. Build on top of existing session-log/cost trackers; do not rebuild raw telemetry.

## Workflow

`main` is the source of truth. When working on any other branch, deliver changes to `main` by opening a pull request and merging it — do not leave work stranded on a feature branch.
