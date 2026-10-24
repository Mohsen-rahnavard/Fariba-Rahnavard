document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-year]').forEach(element => {
        element.textContent = new Date().getFullYear();
    });

    // Header gains a surface once the page scrolls
    const header = document.querySelector('.site-header');
    const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });

    // Mobile menu
    const menuToggle = document.querySelector('.menu-toggle');
    const setMenu = open => {
        document.body.classList.toggle('nav-open', open);
        menuToggle.setAttribute('aria-expanded', open);
        menuToggle.textContent = open ? 'Close' : 'Menu';
    };

    menuToggle.addEventListener('click', () => setMenu(!document.body.classList.contains('nav-open')));
    document.querySelectorAll('.site-nav a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
            setMenu(false);
            menuToggle.focus();
        }
    });

    const catalogue = document.querySelector('.catalogue');
    if (!catalogue) return;

    // Catalogue filters, kept in the URL so a filtered view can be shared
    const works = [...catalogue.querySelectorAll('.work')];
    const seriesChips = document.querySelectorAll('[data-series]');
    const availableSwitch = document.querySelector('.switch');
    const count = document.querySelector('.count');
    const empty = document.querySelector('.empty');
    const params = new URLSearchParams(location.search);
    let series = params.get('series') || 'all';
    let availableOnly = params.get('available') === '1';

    const applyFilters = () => {
        let shown = 0;

        works.forEach(work => {
            const visible = (series === 'all' || work.dataset.seriesName === series)
                && (!availableOnly || work.dataset.status === 'available');
            work.hidden = !visible;
            if (visible) shown++;
        });

        seriesChips.forEach(chip => chip.setAttribute('aria-pressed', chip.dataset.series === series));
        availableSwitch.setAttribute('aria-pressed', availableOnly);
        count.textContent = shown === 1 ? 'Showing 1 work' : `Showing ${shown} works`;
        empty.hidden = shown > 0;

        const query = new URLSearchParams();
        if (series !== 'all') query.set('series', series);
        if (availableOnly) query.set('available', '1');
        history.replaceState(null, '', query.toString() ? `?${query}` : location.pathname);
    };

    seriesChips.forEach(chip => chip.addEventListener('click', () => {
        series = chip.dataset.series;
        applyFilters();
    }));

    availableSwitch.addEventListener('click', () => {
        availableOnly = !availableOnly;
        applyFilters();
    });

    applyFilters();

    // Full-screen viewer that steps through the works currently shown
    const viewer = document.querySelector('.viewer');
    const viewerImage = viewer.querySelector('.viewer-stage img');
    const viewerLabel = viewer.querySelector('.label');
    const viewerCounter = viewer.querySelector('.viewer-counter');
    const viewerSteps = viewer.querySelector('.viewer-steps');
    let sequence = [];
    let index = 0;

    const show = position => {
        index = (position + sequence.length) % sequence.length;
        const work = sequence[index];
        const link = work.querySelector('.work-link');

        viewerImage.src = link.href;
        viewerImage.alt = link.querySelector('img').alt;
        viewerLabel.innerHTML = work.querySelector('.label').innerHTML;
        viewerCounter.textContent = `${index + 1} of ${sequence.length}`;
        viewerSteps.hidden = sequence.length < 2;
    };

    works.forEach(work => {
        work.querySelector('.work-link').addEventListener('click', event => {
            event.preventDefault();
            sequence = works.filter(item => !item.hidden);
            show(sequence.indexOf(work));
            viewer.showModal();
        });
    });

    viewer.querySelector('[data-step="previous"]').addEventListener('click', () => show(index - 1));
    viewer.querySelector('[data-step="next"]').addEventListener('click', () => show(index + 1));
    viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());

    viewer.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') show(index - 1);
        if (event.key === 'ArrowRight') show(index + 1);
    });
});
