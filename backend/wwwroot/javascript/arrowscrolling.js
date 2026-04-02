document.addEventListener("DOMContentLoaded", () => {
    const carousel  = document.querySelector('.discover .carousel');
    const btnLeft   = document.querySelector('.arrow.left');
    const btnRight  = document.querySelector('.arrow.right');
    const cardWidth = carousel.querySelector('.property-card').offsetWidth
                    + parseFloat(getComputedStyle(carousel).gap);

    function updateButtons() {
        btnLeft.disabled  = carousel.scrollLeft <= 0;
        btnRight.disabled = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 1;
    }

    btnRight.addEventListener('click', () => {
        carousel.scrollBy({ left: cardWidth, behavior: 'smooth' });
    });

    btnLeft.addEventListener('click', () => {
        carousel.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    });

    carousel.addEventListener('scroll', updateButtons);
    updateButtons();
});