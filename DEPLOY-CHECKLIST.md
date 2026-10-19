# Deployment checklist for roshanbasnet010.com.np

## Phase 1 — Supabase

- [ ] Decide: new Supabase project, or upgrading the existing one?
- [ ] NEW: run `supabase/setup.sql` **once** in SQL Editor. OLD: keep old SQL tables; run only missing migrations `upgrade_resume.sql` and/or `upgrade_portraits.sql`.
- [ ] Supabase Authentication: create personal email/password user and copy the **User UID**.
- [ ] SQL Editor: `insert into public.portfolio_admins (user_id) values ('YOUR_REAL_UID');`
- [ ] Disable open public email signups, enable MFA when available, and confirm RLS.
- [ ] Paste only Project URL and **publishable** key into `supabase-config.js`. Never paste secret keys or database password.

## Phase 2 — Local smoke test

- [ ] Terminal in extracted project folder: `python -m http.server 8000` (or `py -m http.server 8000`).
- [ ] Open `http://localhost:8000/` and `http://localhost:8000/admin/`.
- [ ] Sign in, edit a harmless phrase, Save, refresh homepage.
- [ ] Check mobile layout and Day/Night setting.
- [ ] Optional: upload your portrait and Save (no photo means the illustration stays).
- [ ] Download Resume draft, verify and approve; leave existing PDF untouched if no changes.

## Phase 3 — GitHub Pages

- [ ] Upload site files to public `YOUR_USERNAME.github.io` repo; `index.html` at repository root.
- [ ] Repo Settings > Pages: deploy from `main`, `/ (root)`.
- [ ] Repo Settings > Pages: custom domain **roshanbasnet010.com.np**.
- [ ] GitHub *personal* Settings > Pages: verify ownership TXT record only if not already verified; retain the TXT record.

## Phase 4 — Cloudflare DNS + HTTPS

- [ ] Cloudflare zone `roshanbasnet010.com.np` is Active; preserve MX and existing TXT records.
- [ ] Add 4 apex (`@`) A records with GitHub IPs `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
- [ ] Add `www` CNAME to your actual `USERNAME.github.io`.
- [ ] Use DNS-only (gray cloud) initially; remove conflicting website records, not mail or verification records.
- [ ] Wait for GitHub HTTPS certificate; enable **Enforce HTTPS**.
- [ ] Visit `https://roshanbasnet010.com.np/` and `/admin/`; test contact, resume and mobile.

## Phase 5 — Verify permissions & content

- [ ] Logged-out visitor can read published portfolio and PDF but cannot write to tables/Storage.
- [ ] Only your explicitly approved admin UID can save and upload.
- [ ] Resume PDF excludes the previous third-party References section; phone/email disclosure is intentional.
- [ ] Unfinished research is excluded; no invented security roles, clients, or certifications.
- [ ] Remember Supabase Free can pause after inactivity: published HTML baseline can become stale.

See `README.md` for full instructions and troubleshooting.
