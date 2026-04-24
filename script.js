const navButtons = document.querySelectorAll('.bottom-nav button');

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    navButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
  });
});

const cards = document.querySelectorAll('.card, .card-light');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  },
  { threshold: 0.15 }
);

cards.forEach((card, index) => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(28px)';
  card.style.transition = `opacity 500ms ease ${index * 60}ms, transform 500ms ease ${index * 60}ms`;
  observer.observe(card);
});
