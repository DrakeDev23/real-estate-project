document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll('.carousel-wrapper').forEach(wrapper => {
        const carousel  = wrapper.querySelector('.carousel');
        const btnLeft   = wrapper.querySelector('.arrow.left');
        const btnRight  = wrapper.querySelector('.arrow.right');
        const cards     = [...carousel.querySelectorAll('.property-card')];
        const dotGroup  = wrapper.nextElementSibling; // the .scroll-dot-group div

        const cardWidth = () =>
            cards[0].offsetWidth + parseFloat(getComputedStyle(carousel).gap);

        /* ── Build dots ── */
        cards.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'scroll-dot';
            dot.setAttribute('aria-label', `Go to card ${i + 1}`);
            dot.addEventListener('click', () => {
                carousel.scrollTo({ left: cards[i].offsetLeft, behavior: 'smooth' });
            });
            dotGroup.appendChild(dot);
        });

        const dots = [...dotGroup.querySelectorAll('.scroll-dot')];

        /* ── Active dot ── */
        function updateDots() {
            const scrollCenter = carousel.scrollLeft + carousel.clientWidth / 2;
            let closest = 0, minDist = Infinity;
            cards.forEach((card, i) => {
                const dist = Math.abs((card.offsetLeft + card.offsetWidth / 2) - scrollCenter);
                if (dist < minDist) { minDist = dist; closest = i; }
            });
            dots.forEach((d, i) => d.classList.toggle('active', i === closest));
        }

        /* ── Arrows ── */
        function updateArrows() {
            btnLeft.disabled  = carousel.scrollLeft <= 0;
            btnRight.disabled = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 1;
        }

        btnRight.addEventListener('click', () =>
            carousel.scrollBy({ left: cardWidth(), behavior: 'smooth' }));
        btnLeft.addEventListener('click', () =>
            carousel.scrollBy({ left: -cardWidth(), behavior: 'smooth' }));

        carousel.addEventListener('scroll', () => { updateDots(); updateArrows(); });

        updateDots();
        updateArrows();
    });
});