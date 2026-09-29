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
    if (!hero) return;
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
        category: card.dataset.category
    }));
    const categories = [...new Set(projects.map(project => project.category))];
    const buttons = [];

    const selectCategory = (category) => {
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
        status.textContent = `${count} ${count === 1 ? 'projeto' : 'projetos'}${category ? ` em ${category}` : ' no total'}`;
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
    selectCategory(null);
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
        if (updateHash) history.replaceState(null, '', tabs[index].hash);
    }

    function activateFromHash() {
        const index = tabs.findIndex(tab => tab.hash === location.hash);
        activate(index < 0 ? 0 : index);
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', event => {
            event.preventDefault();
            activate(index, true);
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
    button.className = 'back-to-top site-button';
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
