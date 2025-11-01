// Mobile Menu Toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');

mobileMenuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
    });
});

// Navbar scroll effect
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        if (href === '#') {
            e.preventDefault();
            return;
        }

        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const offsetTop = target.offsetTop - 80;

            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Parallax effect for gradient blobs
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const blobs = document.querySelectorAll('.gradient-blob');

    blobs.forEach((blob, index) => {
        const speed = 0.5 + (index * 0.1);
        const yPos = -(scrolled * speed);
        blob.style.transform = `translateY(${yPos}px)`;
    });
});

// Intersection Observer for fade-in animations
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

// Observe animated elements
const animatedElements = document.querySelectorAll('.skill-card, .timeline-item, .contact-card, .stat-card');
animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Add staggered animation delays
const skillCards = document.querySelectorAll('.skill-card');
skillCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.1}s`;
});

const timelineItems = document.querySelectorAll('.timeline-item');
timelineItems.forEach((item, index) => {
    item.style.transitionDelay = `${index * 0.2}s`;
});

const contactCards = document.querySelectorAll('.contact-card');
contactCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.1}s`;
});

// Console message
console.log('%c👋 Hi there!', 'font-size: 20px; color: #4B6BFB; font-weight: bold;');
console.log('%cInterested in how this site was built? Feel free to reach out!', 'font-size: 14px; color: #6c757d;');
