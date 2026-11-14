/* Transi??o entre p?ginas: executada antes da primeira renderiza??o. */
(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileViewport = window.matchMedia('(max-width: 768px)');
    const key = 'portfolio-page-transition';
    const historyKey = 'portfolio-history-source';
    const transitionColor = '#080808';
    let pending;
    let historySource;
    try {
        pending = JSON.parse(sessionStorage.getItem(key));
        sessionStorage.removeItem(key);
        historySource = sessionStorage.getItem(historyKey);
    } catch (_) { /* Navigation also works when storage is unavailable. */ }

    let sourceEntry;
    try {
        sourceEntry = JSON.parse(historySource);
    } catch (_) { /* Older sessions may only contain a URL. */ }
    const historyIndex = Number.isInteger(history.state?.portfolioIndex)
        ? history.state.portfolioIndex
        : (pending?.historyIndex ?? (sourceEntry?.index ?? -1) + 1);
    history.replaceState({ ...history.state, portfolioIndex: historyIndex }, '', location.href);

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

    function isHomePage() {
        const filename = location.pathname.split('/').pop();
        return !filename || filename === 'index.html';
    }

    function isAnimatedDestination(url) {
        if (url.href.replace(/\/$/, '') === 'https://joaoluisdutra.github.io/portfolio/projetos.html') return true;
        const filename = url.pathname.split('/').pop();
        return url.origin === location.origin && ['certificacoes.html', 'sistemas-de-informacao-unibave.html'].includes(filename);
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

    const arriving = pending && pending.fromHome && pending.url === location.href && Date.now() - pending.time < 15000;
    if (arriving && !reducedMotion.matches) {
        direction = pending.direction === -1 ? -1 : 1;
        shape.setAttribute('stroke', transitionColor);
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
        if (!['http:', 'https:', 'file:'].includes(url.protocol)) return;
        if (!isHomePage() || !isAnimatedDestination(url)) return;
        if (url.pathname === location.pathname && url.search === location.search) return;
        if (url.origin === location.origin && !url.pathname.endsWith('.html') && !url.pathname.endsWith('/')) return;
        event.preventDefault();
        if (busy) return;
        configurePath();
        busy = true;
        direction = navigationDirection(url);
        const color = transitionColor;
        shape.setAttribute('stroke', color);
        draw(false, 0);
        overlay.classList.add('is-active');
        animate(false, () => {
            try {
                sessionStorage.setItem(key, JSON.stringify({ url: url.href, color, direction, historyIndex: historyIndex + 1, fromHome: true, time: Date.now() }));
            } catch (_) { /* The outgoing animation still works without storage. */ }
            location.assign(url.href);
        });
    });
    function animateHistoryNavigation(source) {
        reset();
        if (reducedMotion.matches) return;
        const destination = new URL(location.href);
        let entry;
        try {
            entry = JSON.parse(source);
        } catch (_) { /* Fall back to the page hierarchy for older sessions. */ }
        const activation = window.navigation?.activation;
        const fromIndex = activation?.from?.index;
        const toIndex = activation?.entry?.index;
        if (activation?.navigationType === 'traverse' && fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
            direction = toIndex < fromIndex ? -1 : 1;
        } else if (Number.isInteger(entry?.index) && historyIndex !== entry.index) {
            direction = historyIndex < entry.index ? -1 : 1;
        } else {
            const sourceUrl = entry?.url || source;
            direction = sourceUrl && pageDepth(destination) < pageDepth(new URL(sourceUrl)) ? -1 : 1;
        }
        shape.setAttribute('stroke', transitionColor);
        draw(false, 0);
        overlay.classList.add('is-active');
        busy = true;
        animate(false, () => animate(true, reset));
    }

    // Remember the page being left, including native Back and Forward navigation.
    window.addEventListener('pagehide', () => {
        try {
            sessionStorage.setItem(historyKey, JSON.stringify({ url: location.href, index: historyIndex }));
        } catch (_) { /* History remains usable without storage. */ }
    });
    window.addEventListener('pageshow', (event) => {
        // History navigation and returns stay immediate; only home page links animate.
    });
})();

/* Intera??es inicializadas ap?s o HTML estar dispon?vel. */
function initializeCertificateSkillsCloud() {
    const page = document.querySelector('.certificates-page');
    const section = page?.querySelector('.cert-skills-cloud-section');
    const cloud = section?.querySelector('.cert-skills-cloud');
    const toggle = section?.querySelector('.cert-skills-toggle');
    if (!page || !section || !cloud || !toggle) return;

    const categoryAssignments = {
        'UI / UX Design Specialization': ['UI & UX Design'],
        'Professional Certificate Google UX Design': ['UI & UX Design'],
        'Foundations of User Experience (UX) Design': ['UI & UX Design'],
        'Start the UX Design Process: Empathize, Define, and Ideate': ['UI & UX Design'],
        'Build Wireframes and Low-Fidelity Prototypes': ['UI & UX Design'],
        'Conduct UX Research and Test Early Concepts': ['UI & UX Design'],
        'Create High-Fidelity Designs and Prototypes in Figma': ['UI & UX Design'],
        'Build Dynamic User Interfaces (UI) for Websites': ['UI & UX Design', 'Front-End Development'],
        'Design a User Experience for Social Good & Prepare for Jobs': ['UI & UX Design'],
        'Visual Elements of User Interface Design': ['UI & UX Design', 'Graphic Design'],
        'UX Design Fundamentals': ['UI & UX Design'],
        'Web Design: Strategy and Information Architecture': ['Web Design'],
        'Web Design: Wireframes to Prototypes': ['Web Design', 'UI & UX Design'],
        'Gamification': ['UI & UX Design'],
        'Building Better User Experiences': ['UI & UX Design'],
        'Introduction to UX Design': ['UI & UX Design'],
        'Design Centrado no Usuário': ['UI & UX Design'],
        'Color Theory for Visual Communication': ['Graphic Design'],
        'História do Design, Estética e Estilos de Design': ['Graphic Design'],
        'Functional Testing with Tester Work Course': ['Front-End Development'],
        'HTML, CSS and JS for Beginners': ['Front-End Development', 'Web Design'],
        'Responsive Web Design': ['Web Design', 'Front-End Development'],
        'Java': ['Front-End Development'],
        'Imersão Front-End': ['Front-End Development'],
        'Imersão Dev + Google Gemini': ['Front-End Development'],
        'Jornada Design Gráfico': ['Graphic Design']
    };
    page.querySelectorAll('.cert-professional-dropdown, .cert-short-courses-dropdown, .cert-events-dropdown')
        .forEach(group => {
            group.querySelectorAll('.certificate-row:not(.header)').forEach(row => {
                const title = row.querySelector(':scope > .col:first-child strong')?.textContent.trim();
                const categories = categoryAssignments[title] || [];
                if (!categories.length) return;
                const list = document.createElement('div');
                list.className = 'cert-course-categories';
                list.setAttribute('aria-label', 'Categoria');
                categories.forEach(category => {
                    const tag = document.createElement('span');
                    tag.className = 'project-category';
                    tag.dataset.category = category;
                    tag.textContent = category;
                    list.append(tag);
                });
                row.querySelector(':scope > .col:first-child')?.append(list);
            });
        });

    const definitions = {
        'UX Research': 'Pesquisa com pessoas usuárias para entender necessidades, comportamentos e dificuldades que orientam decisões de produto.',
        'User-centered design': 'Abordagem que coloca as necessidades, o contexto e as capacidades das pessoas no centro das decisões de design.',
        'Usability': 'Facilidade com que uma pessoa consegue aprender, usar e concluir tarefas em uma interface.',
        'Empathy mapping': 'Ferramenta que organiza o que uma pessoa pensa, sente, fala e faz para apoiar a compreensão de suas necessidades.',
        'Problem definition': 'Síntese das evidências de pesquisa em um problema claro, específico e relevante para orientar o projeto.',
        'Ideation': 'Geração e exploração de diferentes possibilidades de solução antes de escolher uma direção.',
        'Wireframing': 'Criação de esquemas simples que definem estrutura, conteúdo e hierarquia de uma tela.',
        'Prototyping': 'Construção de uma representação interativa ou visual para explorar e testar uma solução antes de implementá-la.',
        'Information architecture': 'Organização de conteúdo, rótulos e caminhos para que as pessoas encontrem o que procuram.',
        'Usability testing': 'Observação de pessoas usando um produto para identificar obstáculos e avaliar se as tarefas são compreensíveis.',
        'Research synthesis': 'Organização e interpretação de dados de pesquisa para identificar padrões, necessidades e oportunidades.',
        'Figma': 'Ferramenta de design colaborativo usada para criar interfaces, protótipos e bibliotecas de componentes.',
        'UI Design': 'Definição dos elementos visuais e interativos de uma interface, como componentes, cores, tipografia e estados.',
        'Interaction design': 'Planejamento de como a interface responde às ações das pessoas e comunica o que está acontecendo.',
        'Web design': 'Planejamento visual e estrutural de páginas e experiências para a web.',
        'UX Design': 'Projeto da experiência completa de uso, conectando necessidades das pessoas aos objetivos do produto.',
        'Social impact': 'Consideração dos efeitos de um produto ou serviço sobre pessoas, comunidades e sociedade.',
        'Career development': 'Planejamento de objetivos e práticas para desenvolver competências e avançar profissionalmente.',
        'Visual hierarchy': 'Organização de elementos para indicar o que merece atenção primeiro e como o conteúdo deve ser percorrido.',
        'Color theory': 'Princípios sobre relações entre cores e seus efeitos na percepção, contraste e comunicação visual.',
        'Content strategy': 'Planejamento da criação, organização e manutenção de conteúdo para atender às necessidades das pessoas.',
        'Navigation': 'Estrutura de caminhos e controles que ajuda as pessoas a se orientar e acessar áreas de um produto.',
        'Game Design': 'Planejamento das regras, objetivos, desafios e retornos que estruturam uma experiência de jogo.',
        'Behavioral Economics': 'Estudo de como fatores psicológicos e contextuais influenciam decisões e comportamentos.',
        'Motivational Skills': 'Técnicas para apoiar interesse, persistência e envolvimento das pessoas em uma atividade.',
        '5W1H': 'Método de investigação que organiza perguntas sobre o quê, quem, quando, onde, por quê e como.',
        'Personas': 'Representações de grupos de usuários baseadas em pesquisa, usadas para comunicar necessidades e comportamentos.',
        'Jobs to be Done': 'Método que descreve o progresso que uma pessoa busca alcançar em uma situação específica.',
        'Heurísticas': 'Princípios gerais usados para avaliar a clareza e a consistência de uma interface.',
        'Desk Research': 'Pesquisa feita a partir de fontes existentes, como estudos, relatórios, artigos e dados públicos.',
        'Benchmarking': 'Comparação estruturada de produtos ou referências para identificar padrões, oportunidades e diferenças.',
        'Mapas de Empatia': 'Representação do que um grupo de usuários pensa, sente, fala e faz em determinado contexto.',
        'Análise de Tarefas (HTA)': 'Decomposição de uma tarefa em etapas e subtarefas para entender como ela é realizada.',
        'Avaliação Heurística': 'Inspeção especializada de uma interface com base em princípios de usabilidade.',
        'Teoria da Cor': 'Estudo de combinações, contrastes e significados das cores aplicados à comunicação visual.',
        'Paletas': 'Conjuntos de cores escolhidos para manter consistência e expressar a identidade de um projeto.',
        'Impacto Cultural': 'Análise de como referências e decisões visuais são interpretadas em diferentes contextos culturais.',
        'História do Design': 'Estudo de movimentos, ideias e práticas que influenciaram a evolução do design.',
        'Estética': 'Estudo da percepção visual e dos princípios que contribuem para a aparência de uma composição.',
        'Estilos Visuais': 'Características visuais que dão unidade e personalidade a uma peça ou sistema de design.',
        'Testing': 'Verificação de software para encontrar falhas e confirmar o comportamento esperado.',
        'QA': 'Práticas de garantia da qualidade que ajudam a prevenir problemas e manter padrões no desenvolvimento.',
        'Software Quality': 'Conjunto de atributos que avalia se um software é confiável, útil, eficiente e fácil de manter.',
        'Media Queries': 'Recurso de CSS que aplica estilos conforme características do dispositivo, como largura da tela.',
        'Node.js': 'Ambiente que permite executar JavaScript fora do navegador, inclusive em aplicações de servidor.',
        'Build Tools': 'Ferramentas que automatizam tarefas como empacotar, otimizar e preparar arquivos para publicação.',
        'HTML5': 'Linguagem de marcação usada para estruturar conteúdo e elementos de páginas web.',
        'CSS3': 'Linguagem de estilos usada para definir apresentação, layout e adaptação de páginas web.',
        'Flexbox': 'Modelo de layout CSS para alinhar e distribuir elementos em uma dimensão, em linha ou coluna.',
        'POO': 'Paradigma que organiza programas em objetos com dados e comportamentos relacionados.',
        'Estrutura de Dados': 'Formas de organizar e relacionar dados para permitir operações eficientes em um programa.',
        'Lógica Avançada': 'Uso de estruturas e raciocínio computacional para modelar e resolver problemas mais complexos.',
        'Front-end': 'Parte de uma aplicação web executada no navegador e responsável pela interface com a pessoa usuária.',
        'Web development': 'Criação e manutenção de sites e aplicações que funcionam por meio da web.',
        'JavaScript': 'Linguagem de programação usada para criar comportamentos e interações em páginas e aplicações.',
        'Artificial intelligence': 'Área da computação que desenvolve sistemas capazes de executar tarefas associadas à inteligência.',
        'Machine learning': 'Métodos que permitem a sistemas identificar padrões em dados e melhorar seu desempenho com exemplos.',
        'AI applications': 'Aplicação de técnicas de inteligência artificial para resolver tarefas e necessidades concretas.',
        'Generative AI': 'Sistemas de inteligência artificial que produzem conteúdo novo, como texto, imagens ou código.',
        'Prompt design': 'Formulação e refinamento de instruções para orientar sistemas de IA generativa a produzir resultados úteis.',
        'Branding': 'Construção e gestão da identidade e da percepção de uma marca em seus pontos de contato.',
        'Illustrator': 'Aplicativo de criação e edição de ilustrações e gráficos vetoriais.',
        'Photoshop': 'Aplicativo de edição e composição de imagens rasterizadas.',
        'Pesquisa Científica': 'Investigação sistemática que formula perguntas, coleta evidências e comunica resultados.',
        'Impacto Social': 'Efeitos de uma iniciativa sobre as condições de vida, oportunidades e relações de uma comunidade.',
        'Era da Informação': 'Período marcado pela produção, circulação e influência ampla de dados e tecnologias digitais.'
    };

    const skills = new Map();
    page.querySelectorAll('.certificate-row:not(.header)').forEach(row => {
        const title = row.querySelector(':scope > .col:first-child strong')?.textContent.trim();
        const certificateLink = row.querySelector(':scope > .col:nth-child(3) .cert-link');
        row.querySelectorAll('.cert-skills span').forEach(skillElement => {
            const name = skillElement.textContent.trim();
            if (!name) return;
            if (!skills.has(name)) skills.set(name, { name, sources: [] });
            const skill = skills.get(name);
            if (title && !skill.sources.some(source => source.title === title)) {
                skill.sources.push({ title, href: certificateLink?.href || '' });
            }
        });
    });

    if (!skills.size) return;

    const dialog = document.createElement('dialog');
    dialog.className = 'cert-skill-dialog';
    dialog.setAttribute('aria-labelledby', 'cert-skill-dialog-title');
    dialog.innerHTML = '<div class="cert-skill-dialog-content"><button class="cert-skill-dialog-close" type="button" aria-label="Fechar">×</button><p class="cert-skill-dialog-label">Skill</p><h2 id="cert-skill-dialog-title"></h2><p class="cert-skill-dialog-definition"></p><h3>Onde foi aprendida</h3><ul class="cert-skill-dialog-sources"></ul></div>';
    document.body.append(dialog);

    const dialogTitle = dialog.querySelector('#cert-skill-dialog-title');
    const dialogDefinition = dialog.querySelector('.cert-skill-dialog-definition');
    const dialogSources = dialog.querySelector('.cert-skill-dialog-sources');
    let activeSkillButton = null;
    dialog.querySelector('.cert-skill-dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => activeSkillButton?.focus({ preventScroll: true }));

    [...skills.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).forEach(skill => {
        const button = document.createElement('button');
        button.type = 'button';
        const frequencyClass = skill.sources.length >= 3
            ? ' is-most-frequent'
            : skill.sources.length >= 2
                ? ' is-frequent'
                : '';
        button.className = `cert-skill-cloud-item${frequencyClass}`;
        button.textContent = skill.name;
        button.setAttribute('aria-haspopup', 'dialog');
        button.addEventListener('click', () => {
            activeSkillButton = button;
            dialogTitle.textContent = skill.name;
            dialogDefinition.textContent = definitions[skill.name] || 'Conhecimento desenvolvido ao longo da formação complementar.';
            dialogSources.replaceChildren();
            skill.sources.forEach(source => {
                const item = document.createElement('li');
                if (source.href) {
                    const link = document.createElement('a');
                    link.href = source.href;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = source.title;
                    item.append(link);
                } else {
                    item.textContent = source.title;
                }
                dialogSources.append(item);
            });
            dialog.showModal();
        });
        cloud.append(button);
    });

    const skillButtons = [...cloud.querySelectorAll('.cert-skill-cloud-item')];
    const initialSkillCount = 20;
    skillButtons.forEach((button, index) => {
        button.hidden = index >= initialSkillCount;
    });
    toggle.hidden = skillButtons.length <= initialSkillCount;
    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.textContent = expanded ? 'Mostrar menos' : 'Ver todas as skills';
        skillButtons.forEach((button, index) => {
            button.hidden = !expanded && index >= initialSkillCount;
        });
    });

    page.querySelectorAll('.cert-skills-column').forEach(column => column.remove());
    section.hidden = false;
}

function initializePortfolio() {
initializeCertificateSkillsCloud();
const certificateDropdowns = [...document.querySelectorAll('.certificates-page .cert-dropdown')];
certificateDropdowns.forEach(dropdown => {
    dropdown.addEventListener('toggle', () => {
        if (!dropdown.open) return;
        certificateDropdowns.forEach(other => {
            if (other !== dropdown) other.open = false;
        });
    });
});

document.querySelectorAll('.case-panel').forEach(panel => {
    const step = panel.querySelector('.case-panel-step')?.textContent.trim().match(/^(\d+)/)?.[1];
    if (!step) return;
    let subsection = 0;
    panel.querySelectorAll('h3').forEach(heading => {
        if (heading.closest('.case-decision, .case-evidence-placeholder')) return;
        subsection += 1;
        heading.classList.add('case-subsection-heading');
        const number = document.createElement('span');
        number.className = 'case-subsection-number';
        number.setAttribute('aria-hidden', 'true');
        number.textContent = `${step}.${subsection}`;
        heading.prepend(number);
    });
});
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
        if (window.matchMedia('(max-width: 768px)').matches) return;
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
        categories: (card.dataset.category || '').split('|').filter(Boolean),
        number: Number(card.querySelector('.project-number').textContent.trim())
    }));
    let selectedCategory = null;
    let selectedOrder = 'desc';
    const categories = ['Front-End Development', 'Web Design', 'UI & UX Design', 'Graphic Design'];
    const buttons = [];

    const selectCategory = (category) => {
        selectedCategory = category;
        let count = 0;
        projects.forEach(project => {
            const visible = category === null || project.categories.includes(category);
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
        if (updateHash) history.replaceState(history.state, '', tabs[index].hash);
    }

    function revealPanel(index) {
        panels[index].focus({ preventScroll: true });
        scrollToPanel(index);
    }

    function scrollToPanel(index) {
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
        panels[index].scrollIntoView({ block: 'start', behavior });
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
            revealPanel(index);
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
            tabs[target].focus({ preventScroll: true });
            scrollToPanel(target);
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

/* Mobile certificate rows link to the complete certificates page. */
(() => {
    const links = document.querySelectorAll('a[href*="assets/certificados/"]');
    if (!links.length) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'case-image-dialog certificate-dialog';
    dialog.setAttribute('aria-label', 'Certificado');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'case-image-dialog-close';
    close.textContent = 'Fechar ×';
    close.autofocus = true;
    const content = document.createElement('div');
    dialog.append(close, content);
    document.body.append(dialog);
    let activeLink;
    links.forEach(link => {
        link.removeAttribute('target');
        link.setAttribute('aria-haspopup', 'dialog');
        link.addEventListener('click', event => {
            event.preventDefault();
            activeLink = link;
            const pdf = new URL(link.href).pathname.toLowerCase().endsWith('.pdf');
            const preview = document.createElement(pdf ? 'iframe' : 'img');
            if (pdf) preview.title = 'Visualização do certificado';
            else preview.alt = 'Certificado';
            preview.src = link.href;
            content.replaceChildren(preview);
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
    dialog.addEventListener('close', () => {
        content.replaceChildren();
        activeLink?.focus({ preventScroll: true });
    });
})();

document.querySelectorAll('.home-page .certificates-list .certificate-row:not(.header)').forEach(row => {
    const link = document.createElement('a');
    link.className = 'cert-mobile-row-link';
    link.href = 'certificacoes.html';
    const title = row.querySelector('.cert-main-title')?.textContent.trim() || 'Certificados';
    link.setAttribute('aria-label', `${title}: ver na página de certificações`);
    row.append(link);
});

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
