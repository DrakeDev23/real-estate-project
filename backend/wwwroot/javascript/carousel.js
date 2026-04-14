document.addEventListener("DOMContentLoaded", function () {

    document.querySelectorAll('.carousel').forEach(carousel => {
        const originalCards = Array.from(carousel.children);

        // Clone each original card and append to create seamless loop
        originalCards.forEach(card => {
            const clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            carousel.appendChild(clone);
        });

        // Wait for layout to settle, then measure and apply animation
        requestAnimationFrame(() => {
            // scrollWidth is now original + clones; half = one full "lap"
            const halfWidth = carousel.scrollWidth / 2;

            // Inject a unique keyframe per carousel so each can have its own distance
            const id = 'carousel-' + Math.random().toString(36).slice(2, 8);
            carousel.dataset.carouselId = id;

            const isReverse = carousel.classList.contains('reverse');
            const fromVal   = isReverse ? `-${halfWidth}px` : '0px';
            const toVal     = isReverse ? '0px'             : `-${halfWidth}px`;

            const styleTag = document.createElement('style');
            styleTag.textContent = `
                @keyframes ${id} {
                    from { transform: translateX(${fromVal}); }
                    to   { transform: translateX(${toVal}); }
                }
                [data-carousel-id="${id}"] {
                    animation: ${id} 40s linear infinite;
                }
                [data-carousel-id="${id}"]:hover {
                    animation-play-state: paused;
                }
            `;
            document.head.appendChild(styleTag);
        });
    });

    /* ── Touch / swipe: pause on touch, resume on release ── */
    document.querySelectorAll('.carousel').forEach(carousel => {
        let startX = 0;

        carousel.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            carousel.style.animationPlayState = 'paused';
        }, { passive: true });

        carousel.addEventListener('touchend', () => {
            carousel.style.animationPlayState = 'running';
        }, { passive: true });
    });

});