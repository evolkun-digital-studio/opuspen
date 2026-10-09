<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the product experience on the index route and organize reusable product sections in `src/components/product`; this preserves the single-page reference and isolates animation lifecycles.
- Own scroll effects in one scoped GSAP matchMedia lifecycle synchronized with Lenis; this ensures responsive cleanup and a reduced-motion fallback.
- Keep ordering a clearly labeled preview until a real payment service is connected; this avoids presenting a simulated purchase as a live transaction.
