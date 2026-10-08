/* Transi??o entre p?ginas: executada antes da primeira renderiza??o. */
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileViewport = window.matchMedia('(max-width: 768px)');
    const key = 'portfolio-page-transition';
    const colors = ['#4A90E2', '#ff2d55', '#ff6b00', '#00BFA6'];
    let pending;
    try {
        pending = JSON.parse(sessionStorage.getItem(key));
        sessionStorage.removeItem(key);
    } catch (_) { /* Navigation also works when storage is unavailable. */ }

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
    const desktopPath = shape.getAttribute('d');
    const desktopTransform = shape.getAttribute('transform');
    let length;

    function configurePath() {
        const mobile = mobileViewport.matches;
        overlay.setAttribute('viewBox', mobile ? '0 0 664 1316' : '0 0 1316 664');
        // On phones the stroke travels down the screen, from top-left to bottom-right.
        shape.setAttribute('d', mobile
            ? 'M-60 -60 C-20 120 570 20 540 230 C510 440 40 190 90 460 C140 730 610 430 570 750 C530 1070 100 730 170 1050 C220 1270 600 1110 724 1376'
            : desktopPath);
        if (mobile) shape.removeAttribute('transform');
        else shape.setAttribute('transform', desktopTransform);
        length = shape.getTotalLength();
        shape.setAttribute('stroke-dasharray', length + ' ' + length);
    }

    configurePath();
    mobileViewport.addEventListener('change', () => {
        if (!busy) {
            configurePath();
            reset();
        }
    });

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
        configurePath();
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
        configurePath();
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

/* Intera??es inicializadas ap?s o HTML estar dispon?vel. */
function initializePortfolio() {
/* início de animações da hero */
document.addEventListener('mousemove', (e) => {
    const star = document.querySelector('.star-shape');
    if (!star) return;
    const x = (window.innerWidth / 2 - e.pageX) / 30;
    const y = (window.innerHeight / 2 - e.pageY) / 30;

    star.style.transform = `translate(${x}px, ${y}px) rotate(${x * 2}deg)`;
});

window.addEventListener('load', () => {
    const hero = document.querySelector('.hero');
    if (!hero || document.body.classList.contains('home-page')) return;
    hero.style.opacity = '0';
    hero.style.transition = 'opacity 1.5s ease-in-out';

    setTimeout(() => {
        hero.style.opacity = '1';
    }, 100);
});
/* fim de animações da hero */

/* início de interação da galeria de projetos */
const slider = document.querySelector('.project-gallery.is-slider');
const track = document.querySelector('.gallery-track');
const btnLeft = document.querySelector('.btn-left');
const btnRight = document.querySelector('.btn-right');

if (slider && track && slider.classList.contains('is-slider')) {
    let isDown = false;
    let startX;
    let scrollLeft;
    let velX = 0;
    let momentumID;
    let isDragging = false;

    const updateGalleryEffect = () => {
        if (!track) return;

        const cards = track.querySelectorAll('.project-card');
        const scrollLeft = slider.scrollLeft;
        const isMobile = window.innerWidth <= 768;
        const stackGap = isMobile ? 15 : 40;
        const cssGap = isMobile ? 20 : 40;

        cards.forEach((card, index) => {
            const cardLeft = index * (card.offsetWidth + cssGap);
            const currentViewportPos = cardLeft - scrollLeft;
            const limit = index * stackGap;

            if (currentViewportPos < limit) {
                const translateAmount = limit - currentViewportPos;
                card.style.transform = `translateX(${translateAmount}px)`;
                card.style.boxShadow = '-10px 0 30px rgba(0,0,0,0.1)';
            } else {
                card.style.transform = `translateX(0px)`;
                card.style.boxShadow = 'none';
            }
            card.style.zIndex = index;
        });
    };

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        isDragging = false;
        slider.classList.add('active');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
        cancelAnimationFrame(momentumID);
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
    });

    slider.addEventListener('mouseup', (e) => {
        isDown = false;
        slider.classList.remove('active');
        beginMomentum();
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        isDragging = true;
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;
        const prevScrollLeft = slider.scrollLeft;
        slider.scrollLeft = scrollLeft - walk;
        velX = slider.scrollLeft - prevScrollLeft;
        updateGalleryEffect();
    });

    slider.addEventListener('touchstart', (e) => {
        isDown = true;
        isDragging = false;
        startX = e.touches[0].pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
        cancelAnimationFrame(momentumID);
    });

    slider.addEventListener('touchend', () => {
        isDown = false;
        beginMomentum();
    });

    slider.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        isDragging = true;
        const x = e.touches[0].pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;
        const prevScrollLeft = slider.scrollLeft;
        slider.scrollLeft = scrollLeft - walk;
        velX = slider.scrollLeft - prevScrollLeft;
        updateGalleryEffect();
    });

    slider.addEventListener('wheel', (e) => {
        const isOverCard = e.target.closest('.project-card');

        if (isOverCard && e.deltaY !== 0) {
            e.preventDefault();
            cancelAnimationFrame(momentumID);

            slider.scrollLeft += e.deltaY;
            requestAnimationFrame(updateGalleryEffect);
        }
    }, { passive: false });

    track.addEventListener('click', (e) => {
        if (isDragging) e.preventDefault();
    });

    const beginMomentum = () => {
        cancelAnimationFrame(momentumID);
        const animate = () => {
            slider.scrollLeft += velX;
            velX *= 0.95;
            if (Math.abs(velX) > 0.5) {
                momentumID = requestAnimationFrame(animate);
            }
            updateGalleryEffect();
        };
        animate();
    };

    updateGalleryEffect();
    slider.addEventListener('scroll', updateGalleryEffect);

    btnLeft?.addEventListener('click', () => {
        velX = -15;
        beginMomentum();
    });
    btnRight?.addEventListener('click', () => {
        velX = 15;
        beginMomentum();
    });
}
/* fim de interação da galeria de projetos */

/* início de menu de navegação global */
const menuTrigger = document.querySelector('.menu-trigger');
const closeMenu = document.querySelector('.close-menu');
const sidebar = document.querySelector('.sidebar');

menuTrigger?.addEventListener('click', () => sidebar.classList.add('open'));
closeMenu?.addEventListener('click', () => sidebar.classList.remove('open'));

sidebar?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        sidebar.classList.remove('open');
        if (link.classList.contains('grade-link')) {
            setTimeout(() => {
                document.querySelector('.marker-si')?.classList.add('marker-highlight');
                setTimeout(() => document.querySelector('.marker-si')?.classList.remove('marker-highlight'), 3000);
            }, 600);
        }
    });
});

document.addEventListener('mousedown', (e) => {
    if (sidebar?.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !menuTrigger?.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});
/* fim de menu de navegação global */

/* início de resumo da formação acadêmica */
const markerSi = document.querySelector('.marker-si');
const siPopup = document.querySelector('.si-popup');

if (markerSi && siPopup) {
    const positionSiPopup = () => {
        markerSi.classList.remove('popup-left');
        siPopup.style.top = '50%';
        siPopup.style.transform = '';

        const rect = siPopup.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (rect.right > viewportWidth) {
            markerSi.classList.add('popup-left');
        }

        const updatedRect = siPopup.getBoundingClientRect();
        const margin = 20;

        if (updatedRect.top < margin) {
            const shift = margin - updatedRect.top;
            siPopup.style.top = `calc(50% + ${shift}px)`;
        } else if (updatedRect.bottom > viewportHeight - margin) {
            const shift = updatedRect.bottom - (viewportHeight - margin);
            siPopup.style.top = `calc(50% - ${shift}px)`;
        }
    };
    markerSi.addEventListener('mouseenter', positionSiPopup);
    markerSi.addEventListener('focusin', positionSiPopup);

    markerSi.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (!markerSi.matches(':hover')) {
                siPopup.style.top = '';
                siPopup.style.transform = '';
            }
        }, 400);
    });
}
/* fim de resumo da formação acadêmica */

/* início de filtros do catálogo de projetos */
const projectFilters = document.querySelector('.projects-page .project-filters');
if (projectFilters) {
    const filterToggle = document.querySelector('.project-filter-toggle');
    const setFiltersOpen = (open, restoreFocus = false) => {
        projectFilters.hidden = !open;
        filterToggle.setAttribute('aria-expanded', String(open));
        if (restoreFocus) filterToggle.focus();
    };
    filterToggle.hidden = false;
    filterToggle.addEventListener('click', () => setFiltersOpen(projectFilters.hidden));
    document.addEventListener('click', event => {
        if (!projectFilters.hidden && !projectFilters.contains(event.target) && !filterToggle.contains(event.target)) {
            setFiltersOpen(false);
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !projectFilters.hidden) setFiltersOpen(false, true);
    });
    const gallery = document.querySelector('.projects-page .project-gallery');
    const status = document.querySelector('.project-filter-status');
    const projects = Array.from(gallery.querySelectorAll('.project-card')).map(card => ({
        card,
        category: card.dataset.category,
        number: Number(card.querySelector('.project-number').textContent.trim())
    }));
    let selectedCategory = null;
    let selectedOrder = 'desc';
    const categories = [...new Set(projects.map(project => project.category))];
    const buttons = [];

    const selectCategory = (category) => {
        selectedCategory = category;
        let count = 0;
        projects.forEach(project => {
            const visible = category === null || project.category === category;
            project.card.hidden = !visible;
            if (visible) count++;
        });
        gallery.classList.toggle('is-filtered', category !== null);
        buttons.forEach(item => {
            item.button.setAttribute('aria-pressed', String(item.category === category));
        });
        status.textContent = `${count} ${count === 1 ? 'projeto' : 'projetos'}${category ? ` em ${category}` : ' no total'} · ${selectedOrder === 'asc' ? 'Número crescente' : 'Número decrescente'}`;
    };

    [null, ...categories].forEach(category => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'project-filter';
        button.textContent = category ?? 'Todos';
        button.setAttribute('aria-controls', 'projects-grid');
        button.addEventListener('click', () => {
            selectCategory(category);
            setFiltersOpen(false, true);
        });
        buttons.push({ button, category });
        projectFilters.appendChild(button);
    });
    const sortControl = document.querySelector('.project-sort-control');
    const sortToggle = sortControl.querySelector('.project-sort-toggle');
    const sortOptions = sortControl.querySelector('.project-filters');
    const sortButtons = Array.from(sortOptions.querySelectorAll('[data-order]'));
    const setSortOpen = (open, restoreFocus = false) => {
        sortOptions.hidden = !open;
        sortToggle.setAttribute('aria-expanded', String(open));
        if (open) setFiltersOpen(false);
        if (restoreFocus) sortToggle.focus();
    };
    const applyOrder = () => {
        const sorted = [...projects].sort((a, b) => selectedOrder === 'asc'
            ? a.number - b.number
            : b.number - a.number);
        const grid = gallery.querySelector('.gallery-track');
        sorted.forEach(project => grid.appendChild(project.card));
        sortButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.order === selectedOrder)));
        selectCategory(selectedCategory);
    };
    sortControl.hidden = false;
    sortToggle.addEventListener('click', () => setSortOpen(sortOptions.hidden));
    sortButtons.forEach(button => button.addEventListener('click', () => {
        selectedOrder = button.dataset.order;
        applyOrder();
        setSortOpen(false, true);
    }));
    document.addEventListener('click', event => {
        if (!sortControl.contains(event.target)) setSortOpen(false);
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !sortOptions.hidden) setSortOpen(false, true);
    });
    applyOrder();
}
/* fim de filtros do catálogo de projetos */

/* início de animação das habilidades */
const skillIcons = document.querySelectorAll('.skill-icon');
if (skillIcons.length > 0) {
    const skillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                skillObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });

    skillIcons.forEach(icon => skillObserver.observe(icon));
}
/* fim de animação das habilidades */

/* início de navegação por categorias no mapa do projeto */
(() => {
    const menu = document.querySelector('.case-tabs');
    if (!menu) return;
    const tabs = [...menu.querySelectorAll('.case-tab')];
    const panels = tabs.map(tab => document.getElementById(tab.hash.slice(1)));
    const mobile = window.matchMedia('(max-width: 1024px)');
    const sectionSelect = document.getElementById('case-section-select');
    const pagination = document.querySelector('.case-pagination');
    document.body.classList.add('case-enhanced');
    document.querySelector('.case-mobile-navigation')?.removeAttribute('hidden');

    menu.setAttribute('role', 'tablist');
    const updateOrientation = () => menu.setAttribute('aria-orientation', mobile.matches ? 'horizontal' : 'vertical');
    updateOrientation();
    mobile.addEventListener('change', updateOrientation);
    tabs.forEach((tab, index) => {
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', panels[index].id);
        panels[index].setAttribute('role', 'tabpanel');
        panels[index].setAttribute('aria-labelledby', tab.id);
        panels[index].tabIndex = 0;
    });

    function activate(index, updateHash = false) {
        tabs.forEach((tab, position) => {
            const selected = position === index;
            tab.setAttribute('aria-selected', String(selected));
            tab.tabIndex = selected ? 0 : -1;
            panels[position].hidden = !selected;
            panels[position].querySelectorAll('video').forEach(video => {
                if (!selected) {
                    video.pause();
                } else {
                    if (video.preload === 'none') {
                        video.preload = 'metadata';
                        video.load();
                    }
                    if (video.autoplay) {
                        video.muted = true;
                        video.play().catch(() => {
                            // Os controles permitem iniciar caso o navegador bloqueie o autoplay.
                        });
                    }
                }
            });
        });
        if (sectionSelect) {
            sectionSelect.value = String(index);
            sectionSelect.style.setProperty('--selected-tab-color', getComputedStyle(tabs[index]).getPropertyValue('--tab-color').trim());
            sectionSelect.style.setProperty('--selected-tab-ink', getComputedStyle(tabs[index]).getPropertyValue('--tab-ink').trim());
        }
        // Project navigation belongs to the conclusion, after the internal reading flow.
        if (pagination) pagination.hidden = index !== panels.length - 1;
        if (updateHash) history.replaceState(null, '', tabs[index].hash);
    }

    function revealPanel(index) {
        panels[index].focus({ preventScroll: true });
        panels[index].scrollIntoView({ block: 'start', behavior: 'instant' });
    }

    // Internal actions reveal the next section before moving focus to its content.
    document.querySelectorAll('.case-header-actions a[href^="#case-panel-"], .case-section-next').forEach(link => {
        link.addEventListener('click', event => {
            const index = tabs.findIndex(tab => tab.hash === link.hash);
            if (index < 0) return;
            event.preventDefault();
            activate(index, true);
            revealPanel(index);
        });
    });

    sectionSelect?.addEventListener('change', () => {
        const index = Number(sectionSelect.value);
        activate(index, true);
        revealPanel(index);
    });

    function activateFromHash() {
        const index = tabs.findIndex(tab => tab.hash === location.hash);
        activate(index < 0 ? 0 : index);
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', event => {
            event.preventDefault();
            activate(index, true);
            if (mobile.matches) revealPanel(index);
        });
        tab.addEventListener('keydown', event => {
            const previous = mobile.matches ? 'ArrowLeft' : 'ArrowUp';
            const next = mobile.matches ? 'ArrowRight' : 'ArrowDown';
            let target;
            if (event.key === previous) target = (index - 1 + tabs.length) % tabs.length;
            if (event.key === next) target = (index + 1) % tabs.length;
            if (event.key === 'Home') target = 0;
            if (event.key === 'End') target = tabs.length - 1;
            if (event.key === ' ') target = index;
            if (target === undefined) return;
            event.preventDefault();
            activate(target, true);
            tabs[target].focus();
        });
    });
    window.addEventListener('hashchange', activateFromHash);
    activateFromHash();
})();
/* fim de navegação por categorias no mapa do projeto */

/* Imagens das abas ampliadas dentro do site. */
(() => {
    const images = document.querySelectorAll('.case-panel img');
    if (!images.length) return;

    const dialog = document.createElement('dialog');
    dialog.className = 'case-image-dialog';
    dialog.setAttribute('aria-label', 'Imagem ampliada do projeto');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'case-image-dialog-close';
    close.textContent = 'Fechar ×';
    close.autofocus = true;
    const preview = document.createElement('img');
    const caption = document.createElement('p');
    caption.className = 'case-image-dialog-caption';
    dialog.append(close, preview, caption);
    document.body.append(dialog);
    let activeTrigger;

    images.forEach(img => {
        const link = img.closest('a');
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'case-image-trigger';
        trigger.setAttribute('aria-label', `Ampliar imagem: ${img.alt || 'imagem do projeto'}`);
        trigger.setAttribute('aria-haspopup', 'dialog');
        const description = img.closest('figure')?.querySelector('figcaption')?.textContent || img.alt;
        if (link) {
            link.replaceWith(trigger);
        } else {
            img.before(trigger);
        }
        trigger.append(img);
        trigger.addEventListener('click', () => {
            activeTrigger = trigger;
            preview.src = img.currentSrc || img.src;
            preview.alt = img.alt;
            caption.textContent = description;
            caption.hidden = !description;
            dialog.showModal();
            dialog.scrollTop = 0;
        });
    });

    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        const bounds = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => activeTrigger?.focus({ preventScroll: true }));
})();

/* início de botão voltar ao topo */
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
/* fim de botão voltar ao topo */
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePortfolio, { once: true });
} else {
    initializePortfolio();
}
