document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll('.carousel-wrapper').forEach(wrapper => {
        const carousel = wrapper.querySelector('.carousel');
        const btnLeft  = wrapper.querySelector('.arrow.left');
        const btnRight = wrapper.querySelector('.arrow.right');
        const cards    = [...carousel.querySelectorAll('.property-card')];

        /* ── Find this wrapper's dot group ── */
        const dotGroup = wrapper.nextElementSibling;
        if (!dotGroup || !dotGroup.classList.contains('scroll-dot-group')) return;
        dotGroup.innerHTML = '';

        let currentIndex = 0;

        /* ── Index-based scroll — no getBoundingClientRect needed ── */
        function scrollToIndex(i) {
            currentIndex = Math.max(0, Math.min(i, cards.length - 1));
            const card    = cards[currentIndex];
            const gap     = parseFloat(getComputedStyle(carousel).gap) || 0;
            const target  = currentIndex * (card.offsetWidth + gap);
            carousel.scrollTo({ left: target, behavior: 'smooth' });
        }

        /* ── Build dots ── */
        const dots = cards.map((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'scroll-dot';
            dot.setAttribute('aria-label', `Go to card ${i + 1}`);
            dot.addEventListener('click', () => scrollToIndex(i));
            dotGroup.appendChild(dot);
            return dot;
        });

        /* ── Active dot via IntersectionObserver (no scroll math) ── */
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const i = cards.indexOf(entry.target);
                    if (i !== -1) {
                        currentIndex = i;
                        dots.forEach((d, j) => d.classList.toggle('active', j === i));
                    }
                }
            });
        }, {
            root: carousel,
            threshold: 0.5   // card must be 50% visible to count as active
        });

        cards.forEach(card => observer.observe(card));

        /* ── Arrows ── */
        function updateArrows() {
            btnLeft.disabled  = carousel.scrollLeft <= 1;
            btnRight.disabled = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 1;
        }

        btnRight.addEventListener('click', () => scrollToIndex(currentIndex + 1));
        btnLeft.addEventListener('click',  () => scrollToIndex(currentIndex - 1));

        carousel.addEventListener('scroll', updateArrows);

        /* initial state */
        dots[0]?.classList.add('active');
        updateArrows();
    });
});

/*NOTES:

1. The scrollToIndex function calculates the exact scroll position based on card width and gap,
ensuring precise alignment without relying on getBoundingClientRect.

*/