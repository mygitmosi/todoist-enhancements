# Testing the phone version

Every phone rule lives in `src/styles/mobile.css`, under `@media (max-width: 720px)`.
Nothing there applies to a wide screen, so the quickest way to look at it is a
narrow window.

## On the Mac, in the browser

1. `npm run dev`, open the address it prints.
2. Open the developer tools, then the device toolbar (⇧⌘M in Chrome), and pick an
   iPhone. Reload the page so the page sees a touch device.
3. Choose "Explore with demo data" on the sign-in screen.

The device toolbar cannot show the on-screen keyboard. To see the new task window
follow it, type `document.documentElement.style.setProperty('--kb', '300px')` in the
console: the window moves up by that much, as it does when `visualViewport` reports a
keyboard.

## On a real phone

1. `npm run dev -- --host`. Vite prints a `Network:` address; open it on the phone,
   on the same Wi-Fi.
2. Sign in with the demo or with an API token. "Connect with Todoist" only works on
   `localhost`, where Todoist accepts the return address.
3. The invitation to install shows on the second visit. To see it at once, add
   `?install` to the address (`http://<address>:5173/?install`). On iPhone it explains
   Safari's Share menu; the installation itself needs the app served over HTTPS, so
   try it on a deployed preview.

## The checks

`e2e/release-2.15.spec.ts` covers the shell, the sheets, the task window, the
composer, the views and the invitation at 390 px. `e2e/v2-responsive.spec.ts` checks at
375 px that no page scrolls sideways and that no group header overlaps itself.
