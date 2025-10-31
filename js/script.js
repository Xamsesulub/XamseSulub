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
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            if (entry.target.classList.contains('about-content')) {
                entry.target.classList.add('reveal');
            } else {
                entry.target.classList.add('animate');
            }
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all animated elements
const animatedElements = document.querySelectorAll('.skill-card, .timeline-item, .contact-card, .about-content');
animatedElements.forEach(el => {
    observer.observe(el);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        // Skip if href is just "#"
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

// Typewriter effect function
function typewriterEffect(elements, startDelay = 0) {
    let currentElementIndex = 0;

    function typeElement() {
        if (currentElementIndex >= elements.length) return;

        const element = elements[currentElementIndex];
        const text = element.getAttribute('data-text') || element.textContent;

        element.setAttribute('data-text', text);
        element.textContent = '';
        element.classList.add('typewriter-active');
        element.style.opacity = '1';
        element.style.visibility = 'visible';

        let charIndex = 0;
        const typeSpeed = Math.floor(Math.random() * (18 - 12 + 1)) + 12;

        function typeChar() {
            if (charIndex < text.length) {
                element.textContent += text.charAt(charIndex);
                charIndex++;
                setTimeout(typeChar, typeSpeed);
            } else {
                currentElementIndex++;
                typeElement();
            }
        }

        typeChar();
    }

    setTimeout(typeElement, startDelay);
}

// Apply typewriter to hero section
const heroTypewriterElements = document.querySelectorAll('.hero-title, .hero-tagline, .hero-description');
if (heroTypewriterElements.length > 0) {
    typewriterEffect(Array.from(heroTypewriterElements), 500);
}

// Apply typewriter to About Me section when it becomes visible
const aboutContent = document.querySelector('.about-content');
if (aboutContent) {
    const aboutObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const aboutTextElements = aboutContent.querySelectorAll('.about-text h2, .about-text p');
                if (aboutTextElements.length > 0) {
                    typewriterEffect(Array.from(aboutTextElements), 200);
                }
                aboutObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    aboutObserver.observe(aboutContent);
}

// Add parallax effect to gradient blobs
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const blobs = document.querySelectorAll('.gradient-blob');

    blobs.forEach((blob, index) => {
        const speed = 0.5 + (index * 0.1);
        const yPos = -(scrolled * speed);
        blob.style.transform = `translateY(${yPos}px)`;
    });
});

// Add entrance animation delay to cards
const skillCards = document.querySelectorAll('.skill-card');
skillCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
});

const timelineItems = document.querySelectorAll('.timeline-item');
timelineItems.forEach((item, index) => {
    item.style.animationDelay = `${index * 0.2}s`;
});

const contactCards = document.querySelectorAll('.contact-card');
contactCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
});

// Console message
console.log('%c👋 Hi there!', 'font-size: 20px; color: #667eea; font-weight: bold;');
console.log('%cInterested in how this site was built? Feel free to reach out!', 'font-size: 14px; color: #6c757d;');
