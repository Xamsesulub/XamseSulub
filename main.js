import './style.css'

const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const themeIcon = themeToggle.querySelector('i');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  if (theme === 'dark') {
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  } else {
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  }
}

const savedTheme = localStorage.getItem('theme') || 'dark';
setTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
});

mobileMenuToggle.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});

const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');
  });
});

document.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.style.boxShadow = '0 4px 20px var(--shadow)';
  } else {
    navbar.style.boxShadow = 'none';
  }
});

const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

const cards = document.querySelectorAll('.skill-card, .stat-card, .timeline-item, .contact-card, .language-card');
cards.forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(20px)';
  card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(card);
});
