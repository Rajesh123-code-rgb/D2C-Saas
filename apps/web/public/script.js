// ==========================================
// OmniChannel Landing Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // Smooth Scrolling
    // ==========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href !== '#demo') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const navHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = target.offsetTop - navHeight;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // ==========================================
    // Mobile Menu Toggle
    // ==========================================
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
    }

    // ==========================================
    // Scroll Animations (Intersection Observer)
    // ==========================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // Trigger counter animation if it's a stat number
                if (entry.target.classList.contains('stat-item')) {
                    const numberElement = entry.target.querySelector('.stat-number span, .stat-number');
                    if (numberElement && numberElement.dataset.target) {
                        animateCounter(numberElement);
                    }
                }
            }
        });
    }, observerOptions);

    // Observe all animated elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    document.querySelectorAll('.stat-item').forEach(el => observer.observe(el));

    // ==========================================
    // Counter Animation
    // ==========================================
    function animateCounter(element) {
        if (element.classList.contains('animated')) return;
        element.classList.add('animated');

        const target = parseInt(element.dataset.target);
        const duration = 2000; // 2 seconds
        const steps = 60;
        const increment = target / steps;
        const stepDuration = duration / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, stepDuration);
    }

    // ==========================================
    // Navbar Background on Scroll
    // ==========================================
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Add background when scrolled
        if (currentScroll > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.8)';
            navbar.style.boxShadow = 'none';
        }

        lastScroll = currentScroll;
    });

    // ==========================================
    // Floating Cards Animation Enhancement
    // ==========================================
    const floatingCards = document.querySelectorAll('.floating-card');

    floatingCards.forEach((card, index) => {
        // Add random subtle movement on mouse move
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            const delay = index * 0.1;

            card.style.transform = `translate(${x * delay}px, ${y * delay}px)`;
        });
    });

    // ==========================================
    // Feature Card Hover Effect Enhancement
    // ==========================================
    const featureCards = document.querySelectorAll('.feature-card');

    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // ==========================================
    // Gradient Animation in Hero Background
    // ==========================================
    const heroBackground = document.querySelector('.hero-background');

    if (heroBackground) {
        let gradientRotation = 0;

        setInterval(() => {
            gradientRotation += 0.5;
            heroBackground.style.transform = `rotate(${gradientRotation}deg) scale(1.5)`;
        }, 50);
    }

    // ==========================================
    // Pricing Card Interaction
    // ==========================================
    const pricingCards = document.querySelectorAll('.pricing-card');

    pricingCards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            // Slightly dim other cards
            pricingCards.forEach(otherCard => {
                if (otherCard !== this) {
                    otherCard.style.opacity = '0.7';
                }
            });
        });

        card.addEventListener('mouseleave', function () {
            // Restore all cards
            pricingCards.forEach(otherCard => {
                otherCard.style.opacity = '1';
            });
        });
    });

    // ==========================================
    // Story Card Animation
    // ==========================================
    const storyCards = document.querySelectorAll('.story-card');

    storyCards.forEach((card, index) => {
        // Stagger animation delay
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    // ==========================================
    // Add parallax effect to hero image
    // ==========================================
    const heroVisual = document.querySelector('.hero-visual');

    if (heroVisual) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            heroVisual.style.transform = `translateY(${rate}px)`;
        });
    }

    // ==========================================
    // CTA Button Pulse Effect
    // ==========================================
    const ctaButtons = document.querySelectorAll('.btn-primary');

    setInterval(() => {
        ctaButtons.forEach(btn => {
            btn.style.animation = 'none';
            setTimeout(() => {
                btn.style.animation = '';
            }, 10);
        });
    }, 3000);

    // ==========================================
    // Add loading check for hero image
    // ==========================================
    const heroImage = document.querySelector('.hero-image');

    if (heroImage) {
        // Set fallback gradient background
        heroImage.onerror = function () {
            this.style.display = 'none';
            const wrapper = this.parentElement;
            wrapper.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)';
            wrapper.style.minHeight = '500px';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'center';
        };
    }

    // ==========================================
    // Stats Counter Trigger on Visibility
    // ==========================================
    const statNumbers = document.querySelectorAll('.stat-number');
    let statsAnimated = false;

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !statsAnimated) {
                statsAnimated = true;
                statNumbers.forEach(stat => {
                    const target = stat.querySelector('[data-target]');
                    if (target) {
                        animateCounter(target);
                    }
                });
            }
        });
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }

    // ==========================================
    // Add shimmer effect to gradient text
    // ==========================================
    const gradientTexts = document.querySelectorAll('.gradient-text');

    gradientTexts.forEach(text => {
        text.addEventListener('mouseenter', function () {
            this.style.filter = 'brightness(1.2)';
        });

        text.addEventListener('mouseleave', function () {
            this.style.filter = 'brightness(1)';
        });
    });

    // ==========================================
    // Performance: Reduce animations on low-end devices
    // ==========================================
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        // Disable complex animations
        document.querySelectorAll('.floating-card').forEach(card => {
            card.style.animation = 'none';
        });

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            el.classList.add('visible');
            el.style.transition = 'none';
        });
    }

    // ==========================================
    // Log page load complete
    // ==========================================
    console.log('🚀 OmniChannel Landing Page Loaded Successfully!');
    console.log('✨ All animations and interactions initialized');
});

// ==========================================
// Utility: Debounce function for performance
// ==========================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==========================================
// Add CSS animation keyframes dynamically if needed
// ==========================================
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
    }
`;
document.head.appendChild(style);
