/* SVG stroke transition shared by all pages. Loaded before the first paint. */
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const key = 'portfolio-page-transition';
    const colors = ['#4A90E2', '#ff2d55', '#ff6b00'];
    let pending;
    try {
        pending = JSON.parse(sessionStorage.getItem(key));
        sessionStorage.removeItem(key);
    } catch (_) { /* Navigation also works when storage is unavailable. */ }

    const style = document.createElement('style');
    style.textContent = '.page-transition{position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;visibility:hidden}.page-transition.is-active{visibility:visible;pointer-events:auto}';
    document.head.appendChild(style);
    const ns = 'http://www.w3.org/2000/svg';
    const overlay = document.createElementNS(ns, 'svg');
    overlay.setAttribute('viewBox', '0 0 1316 664');
    overlay.setAttribute('preserveAspectRatio', 'none');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.add('page-transition');
    const shape = document.createElementNS(ns, 'path');
    // One fixed curve; the dash direction follows the navigation hierarchy.
    shape.setAttribute('d', 'M13.4746 291.27 C13.4746 291.27 100.646 -18.6724 255.617 16.8418 C410.588 52.356 61.0296 431.197 233.017 546.326 C431.659 679.299 444.494 21.0125 652.73 100.784 C860.967 180.556 468.663 430.709 617.216 546.326 C765.769 661.944 819.097 48.2722 988.501 120.156 C1174.21 198.957 809.424 543.841 988.501 636.726 C1189.37 740.915 1301.67 149.213 1301.67 149.213');
    shape.setAttribute('fill', 'none');
    shape.setAttribute('stroke-width', '2');
    shape.setAttribute('stroke-linecap', 'round');
    shape.setAttribute('stroke-linejoin', 'round');
    // Overscan keeps the stroke clear of the viewport edges.
    shape.setAttribute('transform', 'translate(-131.6 -66.4) scale(1.2)');
    overlay.appendChild(shape);
    document.documentElement.appendChild(overlay);
    let busy = false;
    let frame;
    let direction = 1;
    const length = shape.getTotalLength();
    shape.setAttribute('stroke-dasharray', length + ' ' + length);

    function pageDepth(url) {
        const filename = url.pathname.split('/').pop();
        if (!filename || filename === 'index.html') return 0;
        if (/^projeto[-_]/.test(filename)) return 2;
        return 1;
    }

    function navigationDirection(url) {
        // Breadcrumb ancestors always mean a return, even when skipping a level.
        const ancestors = document.querySelectorAll('.breadcrumb a[href]');
        if (Array.from(ancestors).some((link) => new URL(link.href).pathname === url.pathname)) return -1;
        return pageDepth(url) < pageDepth(new URL(location.href)) ? -1 : 1;
    }

    function reset() {
        cancelAnimationFrame(frame);
        overlay.classList.remove('is-active');
        shape.setAttribute('stroke-dashoffset', String(length));
        shape.setAttribute('stroke-width', '2');
        busy = false;
    }

    function draw(revealing, progress) {
        // Native equivalent of drawing 0% -> 100%, then erasing to 100% 100%.
        const coverage = revealing ? 1 - progress : progress;
        shape.setAttribute('stroke-dashoffset', String(direction * (revealing ? -length * progress : length * (1 - progress))));
        // Fully cover the corners before navigating to the next document.
        shape.setAttribute('stroke-width', String(2 + 718 * coverage));
    }

    function animate(revealing, done) {
        const start = performance.now();
        function tick(now) {
            const progress = Math.min((now - start) / 1000, 1);
            // A gentle cosine curve avoids rushing through the middle of the path.
            const eased = (1 - Math.cos(progress * Math.PI)) / 2;
            draw(revealing, eased);
            if (progress < 1) frame = requestAnimationFrame(tick);
            else done();
        }
        frame = requestAnimationFrame(tick);
    }

    const arriving = pending && pending.url === location.href && Date.now() - pending.time < 15000;
    if (arriving && !reducedMotion.matches && colors.includes(pending.color)) {
        direction = pending.direction === -1 ? -1 : 1;
        shape.setAttribute('stroke', pending.color);
        draw(true, 0);
        overlay.classList.add('is-active');
        busy = true;
        const reveal = () => {
            requestAnimationFrame(() => animate(true, reset));
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', reveal, { once: true });
        } else {
            reveal();
        }
    }

    document.addEventListener('click', (event) => {
        const link = event.target.closest && event.target.closest('a[href]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reducedMotion.matches) return;
        if (link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin || !['http:', 'https:', 'file:'].includes(url.protocol)) return;
        if (url.pathname === location.pathname && url.search === location.search) return;
        if (!url.pathname.endsWith('.html') && !url.pathname.endsWith('/')) return;
        event.preventDefault();
        if (busy) return;
        busy = true;
        direction = navigationDirection(url);
        const color = colors[Math.floor(Math.random() * colors.length)];
        shape.setAttribute('stroke', color);
        draw(false, 0);
        overlay.classList.add('is-active');
        animate(false, () => {
            try {
                sessionStorage.setItem(key, JSON.stringify({ url: url.href, color, direction, time: Date.now() }));
            } catch (_) { /* The outgoing animation still works without storage. */ }
            location.assign(url.href);
        });
    });
    window.addEventListener('pageshow', (event) => { if (event.persisted) reset(); });
})();
