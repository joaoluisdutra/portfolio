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

const markerSi = document.querySelector('.marker-si');
const siPopup = document.querySelector('.si-popup');

if (markerSi && siPopup) {
    markerSi.addEventListener('mouseenter', () => {
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
    });

    markerSi.addEventListener('mouseleave', () => {
        setTimeout(() => {
            if (!markerSi.matches(':hover')) {
                siPopup.style.top = '';
                siPopup.style.transform = '';
            }
        }, 400);
    });
}

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
