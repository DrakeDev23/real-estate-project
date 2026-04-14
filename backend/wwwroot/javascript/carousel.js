document.addEventListener("DOMContentLoaded", function () {
    
    document.querySelectorAll('.carousel').forEach(carousel => {
        const cards = Array.from(carousel.children);

        cards.forEach(card => {
            const clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            carousel.appendChild(clone);
        });

        // Calculate exact pixel distance after cloning
        const halfWidth = carousel.scrollWidth / 2;
        carousel.style.setProperty('--scroll-dist', `-${halfWidth}px`);
    });
    
});