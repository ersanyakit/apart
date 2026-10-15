# Telephone numbering plans

`index.ts` and `components/fields/PhoneField.tsx` are application-owned implementations. There is no telephone component or runtime package dependency and no remote validation service.

`plans.json` contains country calling codes, national prefixes, valid-number patterns, lengths, formatting rules and mobile examples. This is reference **data**, transformed from libphonenumber-js 1.13.15's `metadata.max.json` and `examples.mobile.json` (2026-10-15), originally derived from Google's libphonenumber numbering plans. Sources: https://github.com/catamphetamine/libphonenumber-js and https://github.com/google/libphonenumber. Apache 2.0 data license is included in `LICENSE-data`.

Keep the data updated when numbering plans change. Do not replace variable country lengths with a fixed mask. A valid format does not prove that a number is assigned, reachable or belongs to a guest. The nationality is an initial suggestion; explicit international numbers and the independently selected telephone country take precedence. Empty optional numbers remain empty; invalid nonempty numbers block form submission. Successful submission stores E.164.
