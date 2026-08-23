fix: display SITE_EMAIL in email footers and event-email preview, clarify certificate delivery failures

- baseEmailHtml footer now shows the official gceegdgoc@gmail.com address
  with a mailto link on every transactional email
- Admin event email tab: preview footer shows the official address and
  REGISTER NOW links to the real registration URL / event page
- quick-generate reports explicit "email could not be delivered" message
  when SMTP delivery fails after generation, instead of a plain success
- Re-verified: 26/26 in-memory E2E checks green; tsc + vite builds clean;
  no unsafe .replace() chains remain (audited backend + frontend)
