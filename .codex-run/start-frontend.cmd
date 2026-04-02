@echo off
cd /d C:\Users\cicha\OneDrive\Desktop\Projekt\np-manager
npm run preview -w apps/frontend -- --host 127.0.0.1 --port 4173 > .codex-run\frontend.out.log 2> .codex-run\frontend.err.log
