(() => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'back-to-top';
    button.hidden = true;
    button.setAttribute('aria-label', 'Voltar ao topo');
    button.title = 'Voltar ao topo';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.append(button);

    const updateVisibility = () => {
        button.hidden = window.scrollY < 300;
    };

    button.addEventListener('click', () => {
        const target = document.querySelector('main') || document.body;
        const previousTabindex = target.getAttribute('tabindex');
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.addEventListener('blur', () => {
            if (previousTabindex === null) target.removeAttribute('tabindex');
            else target.setAttribute('tabindex', previousTabindex);
        }, { once: true });
        window.scrollTo({
            top: 0,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
        });
    });

    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('pageshow', updateVisibility);
    updateVisibility();
})();
