const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-year]').forEach(element => {
        element.textContent = new Date().getFullYear();
    });

    setUpMenu();
    setUpReveals();
    setUpCornerName();
    setUpStrata();
    setUpSeriesIndex();
    setUpRotator();
    setUpCatalogue();
    setUpContactForm();
});

// Full-screen menu behind the fixed Menu button
function setUpMenu() {
    const button = document.querySelector('.menu-button');
    const panel = document.querySelector('.menu-panel');
    if (!button || !panel) return;

    panel.querySelectorAll('li').forEach((item, index) => item.style.setProperty('--i', index));

    const setOpen = open => {
        document.body.classList.toggle('menu-open', open);
        button.setAttribute('aria-expanded', open);
        button.textContent = open ? 'Close' : 'Menu';
        panel.inert = !open;
        if (open) panel.querySelector('a').focus({ preventScroll: true });
    };

    panel.inert = true;
    button.addEventListener('click', () => setOpen(!document.body.classList.contains('menu-open')));
    panel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
            setOpen(false);
            button.focus();
        }
    });
}

// Parts of each section rise in turn as the section enters
function setUpReveals() {
    const groups = document.querySelectorAll('[data-reveal]');
    groups.forEach(group => [...group.children].forEach((child, index) => child.style.setProperty('--i', index)));

    if (!('IntersectionObserver' in window)) {
        groups.forEach(group => group.classList.add('is-in'));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                observer.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -4% 0px' });

    groups.forEach(group => observer.observe(group));
}

// Each half of the pinned name (and the Menu button) takes the ink that reads on whatever passes beneath it
function setUpCornerName() {
    const words = document.querySelectorAll('.corner-name span, .menu-button');

    let queued = false;
    const update = () => {
        queued = false;
        words.forEach(word => {
            const box = word.getBoundingClientRect();
            const below = document.elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2)
                .find(element => !word.contains(element) && element.closest('[data-ground]'));
            const ground = below ? below.closest('[data-ground]').dataset.ground : 'light';
            word.dataset.ground = ground;
        });
    };

    const queue = () => {
        if (!queued) {
            queued = true;
            requestAnimationFrame(update);
        }
    };

    update();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
}

// The hero painting's layers follow the pointer (or a finger) with a little lag
function setUpStrata() {
    const strata = document.querySelector('.strata');
    if (!strata || reduceMotion) return;

    const layers = [...strata.querySelectorAll('.stratum')];
    const reach = [-34, 26, -16];
    const current = layers.map(() => 0);
    let target = 0;
    let running = false;

    const step = () => {
        let moving = false;
        layers.forEach((layer, index) => {
            const goal = target * reach[index];
            current[index] += (goal - current[index]) * 0.09;
            if (Math.abs(goal - current[index]) > 0.1) moving = true;
            layer.style.transform = `translateX(${current[index].toFixed(2)}px)`;
        });
        running = moving;
        if (moving) requestAnimationFrame(step);
    };

    const aim = event => {
        const box = strata.getBoundingClientRect();
        target = ((event.clientX - box.left) / box.width - 0.5) * 2;
        if (!running) {
            running = true;
            requestAnimationFrame(step);
        }
    };

    strata.addEventListener('pointermove', aim);
    strata.addEventListener('pointerleave', () => {
        target = 0;
        if (!running) {
            running = true;
            requestAnimationFrame(step);
        }
    });
}

// Series list: pointing at (or focusing) a series shows its painting in the preview frame
function setUpSeriesIndex() {
    const links = document.querySelectorAll('.series-list a');
    const images = document.querySelectorAll('.series-frame img');
    const caption = document.querySelector('.series-preview figcaption');
    if (!links.length || !images.length) return;

    const show = index => {
        links.forEach((link, i) => link.parentElement.classList.toggle('is-active', i === index));
        images.forEach((image, i) => image.classList.toggle('is-active', i === index));
        caption.textContent = images[index].dataset.caption;
    };

    links.forEach((link, index) => {
        link.addEventListener('pointerenter', () => show(index));
        link.addEventListener('focus', () => show(index));
    });
}

// One frame whose painting changes on its own; a tap moves it on
function setUpRotator() {
    const frame = document.querySelector('.rotator-frame');
    if (!frame) return;

    const images = [...frame.querySelectorAll('img')];
    const caption = document.querySelector('.rotator figcaption');
    let index = 0;
    let timer = null;

    const show = next => {
        images[index].classList.remove('is-active');
        index = (next + images.length) % images.length;
        images[index].classList.add('is-active');
        caption.innerHTML = images[index].dataset.caption;
    };

    const start = () => {
        if (reduceMotion || timer) return;
        timer = setInterval(() => show(index + 1), 3000);
    };

    const stop = () => {
        clearInterval(timer);
        timer = null;
    };

    frame.addEventListener('click', () => {
        stop();
        show(index + 1);
        start();
    });

    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(frame);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}

// Works page: filters kept in the URL, and a full-screen viewer
function setUpCatalogue() {
    const catalogue = document.querySelector('.catalogue');
    if (!catalogue) return;

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
        history.replaceState(null, '', (query.toString() ? `?${query}` : location.pathname) + location.hash);
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

        viewerImage.classList.add('is-swapping');
        const next = new Image();
        next.onload = next.onerror = () => {
            viewerImage.src = link.href;
            viewerImage.alt = link.querySelector('img').alt;
            viewerImage.classList.remove('is-swapping');
        };
        next.src = link.href;

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
}

// Contact form posts to Web3Forms, so the artist's address never appears on the site
function setUpContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    const status = form.querySelector('.form-status');
    const submit = form.querySelector('[type="submit"]');
    const buyingTopic = form.querySelector('[name="topic"][value="Buying a work"]');
    const message = form.querySelector('[name="message"]');

    // "Ask about this work" links fill in the form and bring it into view
    const askAbout = work => {
        buyingTopic.checked = true;
        message.value = `I'd like to ask about ${work}: its price and availability.`;
        document.querySelector('.viewer[open]')?.close();
        document.getElementById('contact').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        form.querySelector('[name="name"]').focus({ preventScroll: true });
    };

    document.addEventListener('click', event => {
        const link = event.target.closest('[data-ask]');
        if (!link) return;
        if (link.getAttribute('href').startsWith('#')) {
            event.preventDefault();
            askAbout(link.dataset.ask);
        }
    });

    const asked = new URLSearchParams(location.search).get('ask');
    if (asked) askAbout(asked);

    const setStatus = (state, text) => {
        status.dataset.state = state;
        status.textContent = text;
    };

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;

        const key = form.dataset.accessKey;
        if (!key || key.startsWith('YOUR_')) {
            setStatus('error', 'The contact form isn’t connected yet. Please message the artist on Instagram for now.');
            return;
        }

        const data = Object.fromEntries(new FormData(form));
        submit.setAttribute('aria-busy', 'true');
        submit.disabled = true;
        setStatus('sending', 'Sending your message…');

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    access_key: key,
                    subject: `Website: ${data.topic}`,
                    from_name: 'Fariba Rahnavard website',
                    name: data.name,
                    email: data.email,
                    topic: data.topic,
                    message: data.message,
                    botcheck: data.botcheck
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            form.reset();
            setStatus('success', 'Message sent. Fariba will reply to your email address.');
        } catch {
            setStatus('error', 'Your message didn’t send. Check your connection and try again, or message the artist on Instagram.');
        } finally {
            submit.removeAttribute('aria-busy');
            submit.disabled = false;
        }
    });
}
